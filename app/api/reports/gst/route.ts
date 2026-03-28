import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const report_type = searchParams.get('type') || 'gstr1';
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');

    // Fetch invoices with items
    let invoiceQuery = supabaseAdmin.from('invoices').select('id, invoice_number, invoice_date, customer_id, grand_total, taxable_amount, total_tax, total_cgst, total_sgst, total_igst, created_at');
    if (from_date) invoiceQuery = invoiceQuery.gte('invoice_date', new Date(from_date).toISOString());
    if (to_date) invoiceQuery = invoiceQuery.lte('invoice_date', new Date(to_date).toISOString());

    const { data: invoices, error } = await invoiceQuery.order('invoice_date', { ascending: true });
    if (error) throw error;
    const invs = invoices || [];

    // Fetch invoice items and customer data
    const invoiceIds = invs.map(i => i.id);
    const customerIds = [...new Set(invs.map(i => i.customer_id).filter(Boolean))];

    const [itemsRes, customersRes, settingsRes] = await Promise.all([
      invoiceIds.length ? supabaseAdmin.from('invoice_items').select('*').in('invoice_id', invoiceIds) : { data: [] },
      customerIds.length ? supabaseAdmin.from('customers').select('id, name, gstin, state').in('id', customerIds) : { data: [] },
      supabaseAdmin.from('company_settings').select('*').limit(1).single(),
    ]);

    const items = itemsRes.data || [];
    const customerMap = new Map((customersRes.data || []).map(c => [c.id, c]));
    const companyState = settingsRes.data?.state || '';

    // Group items by invoice
    const itemsByInvoice = new Map<string, Record<string, unknown>[]>();
    for (const item of items) {
      const list = itemsByInvoice.get(item.invoice_id) || [];
      list.push(item);
      itemsByInvoice.set(item.invoice_id, list);
    }

    switch (report_type) {
      case 'gstr1': {
        // GSTR-1: Invoice-level detail
        const gstr1Data = invs.map(inv => {
          const customer = inv.customer_id ? customerMap.get(inv.customer_id) : null;
          const isInterState = customer?.state && customer.state !== companyState;
          return {
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            customer_name: customer?.name || 'Unknown',
            customer_gstin: customer?.gstin || 'Unregistered',
            place_of_supply: customer?.state || '',
            taxable_amount: Number(inv.taxable_amount || 0),
            cgst: Number(inv.total_cgst || 0),
            sgst: Number(inv.total_sgst || 0),
            igst: Number(inv.total_igst || 0),
            total_tax: Number(inv.total_tax || 0),
            invoice_value: Number(inv.grand_total || 0),
            supply_type: isInterState ? 'Inter-State' : 'Intra-State',
          };
        });

        const totalTaxable = gstr1Data.reduce((sum, d) => sum + d.taxable_amount, 0);
        const totalCgst = gstr1Data.reduce((sum, d) => sum + d.cgst, 0);
        const totalSgst = gstr1Data.reduce((sum, d) => sum + d.sgst, 0);
        const totalIgst = gstr1Data.reduce((sum, d) => sum + d.igst, 0);
        const totalTax = gstr1Data.reduce((sum, d) => sum + d.total_tax, 0);
        const totalValue = gstr1Data.reduce((sum, d) => sum + d.invoice_value, 0);

        return NextResponse.json({
          success: true,
          report: {
            type: 'gstr1',
            data: gstr1Data,
            summary: { totalTaxable, totalCgst, totalSgst, totalIgst, totalTax, totalValue, invoiceCount: gstr1Data.length },
          },
        });
      }

      case 'summary': {
        // Tax rate-wise summary
        const rateGroups = new Map<number, { taxable: number; cgst: number; sgst: number; igst: number; total: number; count: number }>();

        for (const item of items) {
          const rate = Number(item.gst_rate || 0);
          const existing = rateGroups.get(rate) || { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0, count: 0 };
          existing.taxable += Number(item.taxable_amount || 0);
          existing.cgst += Number(item.cgst_amount || 0);
          existing.sgst += Number(item.sgst_amount || 0);
          existing.igst += Number(item.igst_amount || 0);
          existing.total += Number(item.total || 0);
          existing.count++;
          rateGroups.set(rate, existing);
        }

        const rateSummary = Array.from(rateGroups.entries())
          .map(([rate, data]) => ({ gst_rate: rate, ...data }))
          .sort((a, b) => a.gst_rate - b.gst_rate);

        return NextResponse.json({
          success: true,
          report: {
            type: 'summary',
            data: rateSummary,
            totalInvoices: invs.length,
            totalItems: items.length,
          },
        });
      }

      case 'detailed': {
        // Item-level detailed report
        const detailedData = invs.map(inv => {
          const customer = inv.customer_id ? customerMap.get(inv.customer_id) : null;
          const invItems = itemsByInvoice.get(inv.id) || [];
          return {
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            customer_name: customer?.name || 'Unknown',
            customer_gstin: customer?.gstin || '',
            items: invItems.map(item => ({
              product_name: item.product_name,
              hsn_code: item.hsn_code,
              quantity: item.quantity,
              unit: item.unit,
              rate: item.rate,
              taxable_amount: Number(item.taxable_amount || 0),
              gst_rate: item.gst_rate,
              cgst: Number(item.cgst_amount || 0),
              sgst: Number(item.sgst_amount || 0),
              igst: Number(item.igst_amount || 0),
              total: Number(item.total || 0),
            })),
            invoice_total: Number(inv.grand_total || 0),
          };
        });

        return NextResponse.json({
          success: true,
          report: { type: 'detailed', data: detailedData },
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid GST report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error generating GST report:', error);
    return NextResponse.json({ error: 'Failed to generate GST report' }, { status: 500 });
  }
}