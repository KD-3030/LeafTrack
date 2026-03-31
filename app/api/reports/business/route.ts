import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const report_type = searchParams.get('type') || 'overview';
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const customer_id = searchParams.get('customer_id');

    switch (report_type) {
      case 'overview':
        return await getOverviewReport(from_date, to_date);
      case 'profit_loss':
        return await getProfitLossReport(from_date, to_date);
      case 'sales_performance':
        return await getSalesPerformanceReport(from_date, to_date);
      case 'customer_ledger':
        return await getCustomerLedgerReport(customer_id, from_date, to_date);
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

async function getOverviewReport(from_date: string | null, to_date: string | null) {
  let invoiceQuery = supabaseAdmin.from('invoices').select('id, grand_total, balance_due, payment_status, salesman_id, distributor_id, created_at');
  let purchaseQuery = supabaseAdmin.from('purchases').select('id, final_amount, payment_status, created_at');

  if (from_date) {
    invoiceQuery = invoiceQuery.gte('created_at', new Date(from_date).toISOString());
    purchaseQuery = purchaseQuery.gte('created_at', new Date(from_date).toISOString());
  }
  if (to_date) {
    invoiceQuery = invoiceQuery.lte('created_at', new Date(to_date).toISOString());
    purchaseQuery = purchaseQuery.lte('created_at', new Date(to_date).toISOString());
  }

  const [invoicesRes, purchasesRes, customersRes, productsRes] = await Promise.all([
    invoiceQuery,
    purchaseQuery,
    supabaseAdmin.from('distributors').select('id, name'),
    supabaseAdmin.from('products').select('id, name'),
  ]);

  const invoices = invoicesRes.data || [];
  const purchases = purchasesRes.data || [];

  // Fetch invoice items for top products
  const invoiceIds = invoices.map(i => i.id);
  let invoiceItems: Record<string, unknown>[] = [];
  if (invoiceIds.length > 0) {
    const { data } = await supabaseAdmin.from('invoice_items').select('invoice_id, product_name, quantity, total').in('invoice_id', invoiceIds);
    invoiceItems = data || [];
  }

  const totalRevenue = invoices.reduce((sum, i) => sum + Number(i.grand_total || 0), 0);
  const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.final_amount || 0), 0);
  const totalOutstanding = invoices.reduce((sum, i) => sum + Number(i.balance_due || 0), 0);
  const grossProfit = totalRevenue - totalPurchases;

  // Top products by revenue
  const productRevenue = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const item of invoiceItems) {
    const name = String(item.product_name || 'Unknown');
    const existing = productRevenue.get(name) || { name, quantity: 0, revenue: 0 };
    existing.quantity += Number(item.quantity || 0);
    existing.revenue += Number(item.total || 0);
    productRevenue.set(name, existing);
  }
  const topProducts = Array.from(productRevenue.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Top salesmen by revenue
  const salesmenRevenue = new Map<string, { id: string; revenue: number; invoiceCount: number }>();
  for (const inv of invoices) {
    if (!inv.salesman_id) continue;
    const existing = salesmenRevenue.get(inv.salesman_id) || { id: inv.salesman_id, revenue: 0, invoiceCount: 0 };
    existing.revenue += Number(inv.grand_total || 0);
    existing.invoiceCount++;
    salesmenRevenue.set(inv.salesman_id, existing);
  }
  const topSalesmenIds = Array.from(salesmenRevenue.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const salesmenIds = topSalesmenIds.map(s => s.id);
  let salesmenMap = new Map<string, string>();
  if (salesmenIds.length) {
    const { data: salesmen } = await supabaseAdmin.from('users').select('id, name').in('id', salesmenIds);
    salesmenMap = new Map((salesmen || []).map(s => [s.id, s.name]));
  }
  const topSalesmen = topSalesmenIds.map(s => ({
    name: salesmenMap.get(s.id) || 'Unknown',
    revenue: s.revenue,
    invoiceCount: s.invoiceCount,
  }));

  return NextResponse.json({
    success: true,
    report: {
      type: 'overview',
      totalRevenue,
      totalPurchases,
      grossProfit,
      totalOutstanding,
      totalInvoices: invoices.length,
      totalPurchaseOrders: purchases.length,
      totalCustomers: (customersRes.data || []).length,
      totalProducts: (productsRes.data || []).length,
      topProducts,
      topSalesmen,
    },
  });
}

async function getProfitLossReport(from_date: string | null, to_date: string | null) {
  let invoiceQuery = supabaseAdmin.from('invoices').select('id, grand_total, tax_amount, created_at');
  let purchaseQuery = supabaseAdmin.from('purchases').select('id, final_amount, tax_amount, created_at');

  if (from_date) {
    invoiceQuery = invoiceQuery.gte('created_at', new Date(from_date).toISOString());
    purchaseQuery = purchaseQuery.gte('created_at', new Date(from_date).toISOString());
  }
  if (to_date) {
    invoiceQuery = invoiceQuery.lte('created_at', new Date(to_date).toISOString());
    purchaseQuery = purchaseQuery.lte('created_at', new Date(to_date).toISOString());
  }

  const [invoicesRes, purchasesRes] = await Promise.all([invoiceQuery, purchaseQuery]);
  const invoices = invoicesRes.data || [];
  const purchases = purchasesRes.data || [];

  const totalRevenue = invoices.reduce((sum, i) => sum + Number(i.grand_total || 0), 0);
  const totalCost = purchases.reduce((sum, p) => sum + Number(p.final_amount || 0), 0);
  const salesTax = invoices.reduce((sum, i) => sum + Number(i.tax_amount || 0), 0);
  const purchaseTax = purchases.reduce((sum, p) => sum + Number(p.tax_amount || 0), 0);
  const grossProfit = totalRevenue - totalCost;
  const netTax = salesTax - purchaseTax;
  const netProfit = grossProfit - netTax;

  // Monthly breakdown
  const monthlyData = new Map<string, { revenue: number; cost: number; profit: number }>();

  for (const inv of invoices) {
    const month = inv.created_at ? new Date(inv.created_at).toISOString().substring(0, 7) : 'unknown';
    const existing = monthlyData.get(month) || { revenue: 0, cost: 0, profit: 0 };
    existing.revenue += Number(inv.grand_total || 0);
    monthlyData.set(month, existing);
  }
  for (const pur of purchases) {
    const month = pur.created_at ? new Date(pur.created_at).toISOString().substring(0, 7) : 'unknown';
    const existing = monthlyData.get(month) || { revenue: 0, cost: 0, profit: 0 };
    existing.cost += Number(pur.final_amount || 0);
    monthlyData.set(month, existing);
  }
  for (const [, data] of monthlyData) {
    data.profit = data.revenue - data.cost;
  }

  const monthly = Array.from(monthlyData.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return NextResponse.json({
    success: true,
    report: {
      type: 'profit_loss',
      totalRevenue,
      totalCost,
      grossProfit,
      salesTax,
      purchaseTax,
      netTax,
      netProfit,
      profitMargin: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0,
      monthly,
    },
  });
}

async function getSalesPerformanceReport(from_date: string | null, to_date: string | null) {
  let invoiceQuery = supabaseAdmin.from('invoices').select('id, grand_total, balance_due, payment_status, salesman_id, distributor_id, created_at');
  if (from_date) invoiceQuery = invoiceQuery.gte('created_at', new Date(from_date).toISOString());
  if (to_date) invoiceQuery = invoiceQuery.lte('created_at', new Date(to_date).toISOString());

  const { data: invoices } = await invoiceQuery;
  const invs = invoices || [];

  // Group by salesman
  const salesmanStats = new Map<string, { revenue: number; collected: number; outstanding: number; invoiceCount: number; customers: Set<string> }>();
  for (const inv of invs) {
    const sid = inv.salesman_id || 'unassigned';
    const existing = salesmanStats.get(sid) || { revenue: 0, collected: 0, outstanding: 0, invoiceCount: 0, customers: new Set() };
    existing.revenue += Number(inv.grand_total || 0);
    existing.outstanding += Number(inv.balance_due || 0);
    existing.collected += Number(inv.grand_total || 0) - Number(inv.balance_due || 0);
    existing.invoiceCount++;
    if (inv.distributor_id) existing.customers.add(inv.distributor_id);
    salesmanStats.set(sid, existing);
  }

  const salesmanIds = Array.from(salesmanStats.keys()).filter(id => id !== 'unassigned');
  let salesmenMap = new Map<string, string>();
  if (salesmanIds.length) {
    const { data: salesmen } = await supabaseAdmin.from('users').select('id, name').in('id', salesmanIds);
    salesmenMap = new Map((salesmen || []).map(s => [s.id, s.name]));
  }

  const performance = Array.from(salesmanStats.entries()).map(([id, stats]) => ({
    salesman_id: id,
    salesman_name: id === 'unassigned' ? 'Unassigned' : (salesmenMap.get(id) || 'Unknown'),
    revenue: stats.revenue,
    collected: stats.collected,
    outstanding: stats.outstanding,
    invoiceCount: stats.invoiceCount,
    customerCount: stats.customers.size,
    collectionRate: stats.revenue > 0 ? Math.round((stats.collected / stats.revenue) * 100) : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  return NextResponse.json({ success: true, report: { type: 'sales_performance', performance } });
}

async function getCustomerLedgerReport(customer_id: string | null, from_date: string | null, to_date: string | null) {
  if (!customer_id) {
    return NextResponse.json({ error: 'customer_id is required for ledger report' }, { status: 400 });
  }

  const { data: customer } = await supabaseAdmin.from('distributors').select('*').eq('id', customer_id).single();
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  let invoiceQuery = supabaseAdmin.from('invoices').select('id, invoice_number, grand_total, balance_due, payment_status, created_at, due_date').eq('distributor_id', customer_id);
  if (from_date) invoiceQuery = invoiceQuery.gte('created_at', new Date(from_date).toISOString());
  if (to_date) invoiceQuery = invoiceQuery.lte('created_at', new Date(to_date).toISOString());

  const { data: invoices } = await invoiceQuery.order('created_at', { ascending: true });
  const invs = invoices || [];

  const invoiceIds = invs.map(i => i.id);
  let payments: Record<string, unknown>[] = [];
  if (invoiceIds.length) {
    const { data } = await supabaseAdmin.from('payments').select('id, invoice_id, amount, payment_date, payment_method, status').in('invoice_id', invoiceIds).eq('status', 'confirmed');
    payments = data || [];
  }

  // Build ledger entries
  const ledgerEntries: Record<string, unknown>[] = [];
  let runningBalance = 0;

  for (const inv of invs) {
    runningBalance += Number(inv.grand_total || 0);
    ledgerEntries.push({
      date: inv.created_at,
      type: 'invoice',
      description: `Invoice ${inv.invoice_number}`,
      debit: Number(inv.grand_total || 0),
      credit: 0,
      balance: runningBalance,
      reference_id: inv.id,
    });

    // Add payments for this invoice
    const invPayments = payments.filter(p => (p as Record<string, unknown>).invoice_id === inv.id);
    for (const payment of invPayments) {
      const p = payment as Record<string, unknown>;
      const amount = Number(p.amount || 0);
      runningBalance -= amount;
      ledgerEntries.push({
        date: p.payment_date || p.created_at,
        type: 'payment',
        description: `Payment (${p.payment_method})`,
        debit: 0,
        credit: amount,
        balance: runningBalance,
        reference_id: p.id,
      });
    }
  }

  const totalInvoiced = invs.reduce((sum, i) => sum + Number(i.grand_total || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + Number((p as Record<string, unknown>).amount || 0), 0);

  return NextResponse.json({
    success: true,
    report: {
      type: 'customer_ledger',
      customer: { _id: customer.id, ...customer },
      totalInvoiced,
      totalPaid,
      outstandingBalance: totalInvoiced - totalPaid,
      ledgerEntries,
    },
  });
}