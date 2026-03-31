import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/authMiddleware';
import { withId, withIds } from '@/lib/supabase-helpers';
import { normalizeRoleId } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customer_id');
    const salesmanId = searchParams.get('salesman_id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const roleId = normalizeRoleId(authResult.role);

    // For SE/PE, first get accessible distributor IDs
    let distributorIdFilter: string[] | null = null;
    if (roleId === 'secondary_executive') {
      const { data: assigns } = await supabaseAdmin.from('se_distributor_assignments').select('distributor_id').eq('se_id', authResult.userId).eq('is_active', true);
      distributorIdFilter = (assigns || []).map(a => a.distributor_id);
      if (!distributorIdFilter.length) {
        return NextResponse.json({ success: true, invoices: [], pagination: { currentPage: page, totalPages: 0, totalCount: 0, hasNextPage: false, hasPrevPage: false } });
      }
    } else if (roleId === 'primary_executive') {
      const { data: dists } = await supabaseAdmin.from('distributors').select('id').eq('pe_id', authResult.userId);
      distributorIdFilter = (dists || []).map(d => d.id);
      if (!distributorIdFilter.length) {
        return NextResponse.json({ success: true, invoices: [], pagination: { currentPage: page, totalPages: 0, totalCount: 0, hasNextPage: false, hasPrevPage: false } });
      }
    }

    // Count query
    let countQuery = supabaseAdmin.from('invoices').select('*', { count: 'exact', head: true });
    let dataQuery = supabaseAdmin.from('invoices').select('*, invoice_items(*)');

    if (status) { countQuery = countQuery.eq('status', status); dataQuery = dataQuery.eq('status', status); }
    if (customerId) {
      if (distributorIdFilter && !distributorIdFilter.includes(customerId)) {
        return NextResponse.json({ success: true, invoices: [], pagination: { currentPage: page, totalPages: 0, totalCount: 0, hasNextPage: false, hasPrevPage: false } });
      }
      countQuery = countQuery.eq('distributor_id', customerId); dataQuery = dataQuery.eq('distributor_id', customerId);
    } else if (distributorIdFilter) {
      countQuery = countQuery.in('distributor_id', distributorIdFilter); dataQuery = dataQuery.in('distributor_id', distributorIdFilter);
    }
    if (salesmanId) { countQuery = countQuery.eq('salesman_id', salesmanId); dataQuery = dataQuery.eq('salesman_id', salesmanId); }
    if (fromDate) { countQuery = countQuery.gte('invoice_date', fromDate); dataQuery = dataQuery.gte('invoice_date', fromDate); }
    if (toDate) { countQuery = countQuery.lte('invoice_date', toDate); dataQuery = dataQuery.lte('invoice_date', toDate); }

    const { count: total } = await countQuery;
    const totalCount = total || 0;

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data: invoices, error } = await dataQuery.order('invoice_date', { ascending: false }).range(from, to);
    if (error) throw error;

    // Get confirmed payments for these invoices
    const invoiceIds = (invoices || []).map(i => i.id);
    let paymentsMap: Record<string, number> = {};
    if (invoiceIds.length > 0) {
      const { data: payments } = await supabaseAdmin.from('payments').select('invoice_id, amount_paid').in('invoice_id', invoiceIds).eq('status', 'Confirmed');
      (payments || []).forEach(p => { paymentsMap[p.invoice_id] = (paymentsMap[p.invoice_id] || 0) + p.amount_paid; });
    }

    const mapped = (invoices || []).map(inv => {
      const paidAmount = paymentsMap[inv.id] || 0;
      const balanceDue = inv.grand_total - paidAmount;
      return {
        ...withId(inv),
        items: inv.invoice_items || [],
        paid_amount: paidAmount,
        balance_due: balanceDue,
        payment_status: balanceDue <= 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Pending'),
        createdAt: inv.created_at,
        updatedAt: inv.updated_at,
      };
    });

    return NextResponse.json({
      success: true,
      invoices: mapped,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { order_id, sale_id, customer_id, due_days = 30 } = await request.json();

    if (order_id) {
      // ── Create invoice from an approved order ──
      const { data: order, error: orderErr } = await supabaseAdmin
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', order_id)
        .single();
      if (orderErr || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

      if (order.status !== 'approved' && order.status !== 'dispatched') {
        return NextResponse.json({ error: 'Only approved or dispatched orders can be invoiced' }, { status: 400 });
      }

      // Get distributor if available
      let customer;
      const distId = order.distributor_id || customer_id;
      if (distId) {
        const { data } = await supabaseAdmin.from('distributors').select('*').eq('id', distId).single();
        customer = data;
      }
      if (!customer) {
        // Fallback: use order customer info
        const { data } = await supabaseAdmin.from('distributors').insert({
          name: order.customer_name || 'Walk-in Customer',
          email: `walkin_${Date.now()}@leaftrack.com`,
          phone: order.customer_contact || '0000000000',
          status: 'Active', business_type: 'Individual', state: 'West Bengal',
        }).select().single();
        customer = data;
      }
      if (!customer) return NextResponse.json({ error: 'Distributor not found' }, { status: 404 });

      // Get company settings
      const { data: settings } = await supabaseAdmin.from('company_settings').select('*').limit(1).single();

      // Build invoice items from order_items
      let subtotal = 0, totalTax = 0, totalCgst = 0, totalSgst = 0;
      const invoiceItems = [];

      for (const item of (order.order_items || [])) {
        const { data: product } = await supabaseAdmin.from('products').select('*').eq('id', item.product_id).single();
        const unitPrice = item.unit_price || product?.manufacturing_cost || 0;
        const qty = item.quantity || 1;
        const taxableAmount = unitPrice * qty;
        const gstRate = product?.gst_rate || 18;
        const gstAmount = (taxableAmount * gstRate) / 100;
        const itemTotal = taxableAmount + gstAmount;

        subtotal += taxableAmount;
        totalTax += gstAmount;
        totalCgst += gstAmount / 2;
        totalSgst += gstAmount / 2;

        invoiceItems.push({
          product_id: product?.id || item.product_id,
          product_name: item.product_name || product?.name || 'Unknown',
          hsn_code: product?.hsn_code || '0000',
          quantity: qty,
          unit_price: unitPrice,
          discount_percentage: 0,
          taxable_amount: taxableAmount,
          gst_rate: gstRate,
          cgst_amount: gstAmount / 2,
          sgst_amount: gstAmount / 2,
          igst_amount: 0,
          total_amount: itemTotal,
        });
      }

      const grandTotal = subtotal + totalTax;

      // Generate invoice number
      const { data: allInvoices } = await supabaseAdmin.from('invoices').select('invoice_number');
      let maxSeq = 0;
      (allInvoices || []).forEach(inv => {
        const match = inv.invoice_number.match(/(\d{4})$/);
        if (match) { const seq = parseInt(match[1]); if (seq > maxSeq) maxSeq = seq; }
      });
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const invoiceNumber = `INV-${dateStr}-${String(maxSeq + 1).padStart(4, '0')}`;

      const companyName = settings?.company_name || 'SohagTea Manage';
      const companyAddress = settings?.company_address || '123 Tea Garden Road, Kolkata, West Bengal - 700001';
      const companyGstin = settings?.gstin || '19AAAAA0000A1Z5';
      const companyPhone = settings?.phone || '+91-9876543210';
      const companyEmail = settings?.email || 'info@sohagtea.com';

      const { data: invoice, error: invErr } = await supabaseAdmin.from('invoices').insert({
        invoice_number: invoiceNumber,
        order_id: order.id,
        distributor_id: customer.id,
        salesman_id: order.salesman_id,
        due_date: new Date(Date.now() + due_days * 86400000).toISOString(),
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        customer_address: customer.address,
        customer_state: customer.state,
        customer_gstin: customer.gstin,
        company_name: companyName,
        company_address: companyAddress,
        company_gstin: companyGstin,
        company_phone: companyPhone,
        company_email: companyEmail,
        subtotal,
        taxable_amount: subtotal,
        total_cgst: totalCgst,
        total_sgst: totalSgst,
        total_igst: 0,
        total_tax: totalTax,
        grand_total: grandTotal,
        balance_due: grandTotal,
        terms_and_conditions: 'Payment terms: Net 30 days',
      }).select().single();
      if (invErr) throw invErr;

      // Insert invoice items
      for (const item of invoiceItems) {
        await supabaseAdmin.from('invoice_items').insert({ invoice_id: invoice.id, ...item });
      }

      // Mark order as dispatched
      await supabaseAdmin.from('orders').update({ status: 'dispatched' }).eq('id', order_id);

      return NextResponse.json({ success: true, message: 'Invoice created from order', invoice: withId(invoice) });
    }

    // ── Legacy: create invoice from sale_id ──
    if (!sale_id) return NextResponse.json({ error: 'Order ID or Sale ID is required' }, { status: 400 });

    // Get sale with product info
    const { data: sale } = await supabaseAdmin.from('sales').select('*').eq('id', sale_id).single();
    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });

    const { data: product } = await supabaseAdmin.from('products').select('*').eq('id', sale.product_id).single();

    let customer;
    if (customer_id) {
      const { data } = await supabaseAdmin.from('distributors').select('*').eq('id', customer_id).single();
      customer = data;
    }
    if (!customer) {
      const { data } = await supabaseAdmin.from('distributors').insert({
        name: 'Walk-in Customer', email: `walkin_${Date.now()}@leaftrack.com`, phone: '0000000000',
        status: 'Active', business_type: 'Individual', state: 'West Bengal',
      }).select().single();
      customer = data;
    }
    if (!customer) return NextResponse.json({ error: 'Distributor not found' }, { status: 404 });

    const unitPrice = sale.unit_price || product?.manufacturing_cost || 0;
    const quantity = sale.quantity_sold || 1;
    const taxableAmount = unitPrice * quantity;
    const gstRate = product?.gst_rate || 18;
    const gstAmount = (taxableAmount * gstRate) / 100;
    const totalAmount = taxableAmount + gstAmount;

    // Generate invoice number
    const { data: allInvoices } = await supabaseAdmin.from('invoices').select('invoice_number');
    let maxSeq = 0;
    (allInvoices || []).forEach(inv => {
      const match = inv.invoice_number.match(/(\d{4})$/);
      if (match) { const seq = parseInt(match[1]); if (seq > maxSeq) maxSeq = seq; }
    });
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const invoiceNumber = `INV-${dateStr}-${String(maxSeq + 1).padStart(4, '0')}`;

    const { data: invoice, error: invErr } = await supabaseAdmin.from('invoices').insert({
      invoice_number: invoiceNumber, sale_id: sale.id, distributor_id: customer.id,
      salesman_id: sale.salesman_id, due_date: new Date(Date.now() + due_days * 86400000).toISOString(),
      customer_name: customer.name, customer_email: customer.email, customer_phone: customer.phone,
      customer_address: customer.address, customer_state: customer.state, customer_gstin: customer.gstin,
      company_name: 'SohagTea Manage', company_address: '123 Tea Garden Road, Kolkata, West Bengal - 700001',
      company_gstin: '19AAAAA0000A1Z5', company_phone: '+91-9876543210', company_email: 'info@sohagtea.com',
      subtotal: taxableAmount, taxable_amount: taxableAmount, total_cgst: gstAmount / 2,
      total_sgst: gstAmount / 2, total_igst: 0, total_tax: gstAmount, grand_total: totalAmount,
      balance_due: totalAmount, terms_and_conditions: 'Payment terms: Net 30 days',
    }).select().single();
    if (invErr) throw invErr;

    // Insert invoice item
    await supabaseAdmin.from('invoice_items').insert({
      invoice_id: invoice.id, product_id: product?.id || sale.product_id,
      product_name: product?.name || 'Unknown', hsn_code: product?.hsn_code || '0000',
      quantity, unit_price: unitPrice, discount_percentage: 0, taxable_amount: taxableAmount,
      gst_rate: gstRate, cgst_amount: gstAmount / 2, sgst_amount: gstAmount / 2, igst_amount: 0,
      total_amount: totalAmount,
    });

    // Mark sale as invoice generated
    await supabaseAdmin.from('sales').update({ invoice_generated: true }).eq('id', sale_id);

    return NextResponse.json({ success: true, message: 'Invoice created successfully', invoice: withId(invoice) });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: `Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}