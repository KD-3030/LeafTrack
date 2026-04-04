import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/authMiddleware';
import { withId } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

async function updateCustomerOutstandingBalance(customerId: string) {
  const { data: invoices } = await supabaseAdmin.from('invoices').select('balance_due').eq('distributor_id', customerId).neq('status', 'Cancelled');
  const outstandingBalance = (invoices || []).reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
  await supabaseAdmin.from('distributors').update({ outstanding_balance: outstandingBalance }).eq('id', customerId);
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { customer_id, invoice_date, due_date, payment_terms, notes, items, manual_discount, discount_mode, discount_value, invoice_sequence, custom_invoice_number } = await request.json();

    if (!customer_id || !invoice_date || !due_date || !items || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Customer, dates, and items are required' }, { status: 400 });
    }

    // Validate customer
    const { data: customer } = await supabaseAdmin.from('distributors').select('*').eq('id', customer_id).single();
    if (!customer) return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 400 });

    // Get company settings
    const { data: settings } = await supabaseAdmin.from('company_settings').select('*').limit(1).single();
    if (!settings) return NextResponse.json({ success: false, error: 'Company settings not found' }, { status: 400 });

    // Validate products and compute gross amounts
    const rawItems = [];
    let grossSubtotal = 0;

    for (const item of items) {
      const { data: product } = await supabaseAdmin.from('products').select('*').eq('id', item.product_id).single();
      if (!product) return NextResponse.json({ success: false, error: `Product ${item.product_name} not found` }, { status: 400 });

      const grossAmount = item.quantity * item.unit_price;
      grossSubtotal += grossAmount;
      rawItems.push({ product, quantity: item.quantity, unit_price: item.unit_price, gst_rate: item.gst_rate, grossAmount });
    }

    // Calculate total discount and apply BEFORE tax
    const discountPct = discount_mode === 'percentage' ? Math.min(100, Math.max(0, Number(discount_value) || 0)) : 0;
    const totalDiscount = discount_mode === 'percentage'
      ? Math.round((grossSubtotal * discountPct / 100) * 100) / 100
      : Math.max(0, Number(manual_discount) || 0);

    // Distribute discount proportionally across items, compute tax on discounted amount
    let subtotal = 0, totalTax = 0, totalCgst = 0, totalSgst = 0;
    const validatedItems = [];

    for (const raw of rawItems) {
      const itemDiscount = grossSubtotal > 0
        ? Math.round((raw.grossAmount / grossSubtotal) * totalDiscount * 100) / 100
        : 0;
      const taxableAmount = Math.max(0, raw.grossAmount - itemDiscount);
      const taxAmount = Math.round((taxableAmount * raw.gst_rate / 100) * 100) / 100;
      const cgstAmount = Math.round((taxAmount / 2) * 100) / 100;
      const sgstAmount = Math.round((taxAmount - cgstAmount) * 100) / 100;
      const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

      subtotal += taxableAmount;
      totalTax += taxAmount;
      totalCgst += cgstAmount;
      totalSgst += sgstAmount;

      validatedItems.push({
        product_id: raw.product.id, product_name: raw.product.name, hsn_code: raw.product.hsn_code,
        quantity: raw.quantity, unit_price: raw.unit_price, taxable_amount: taxableAmount,
        discount_amount: itemDiscount, discount_percentage: discount_mode === 'percentage' ? discountPct : 0,
        gst_rate: raw.gst_rate, cgst_amount: cgstAmount, sgst_amount: sgstAmount,
        igst_amount: 0, total_amount: totalAmount,
      });
    }

    const grandTotal = Math.max(0, Math.round((subtotal + totalTax) * 100) / 100);

    // Generate invoice number
    let invoiceNumber: string;
    if (custom_invoice_number) {
      invoiceNumber = custom_invoice_number.trim();
      const { data: existing } = await supabaseAdmin.from('invoices').select('id').eq('invoice_number', invoiceNumber).single();
      if (existing) return NextResponse.json({ success: false, error: `Invoice number ${invoiceNumber} already exists` }, { status: 400 });
    } else {
      const { data: allInvoices } = await supabaseAdmin.from('invoices').select('invoice_number');
      let maxSeq = 0;
      (allInvoices || []).forEach(inv => { const m = inv.invoice_number.match(/(\d+)\s*$/); if (m) { const s = parseInt(m[1]); if (s > maxSeq) maxSeq = s; } });
      const customSeq = invoice_sequence ? parseInt(invoice_sequence.toString()) : null;
      const seqNum = customSeq || (maxSeq + 1);
      const dateStr = new Date(invoice_date).toISOString().split('T')[0].replace(/-/g, '');
      invoiceNumber = `INV-${dateStr}-${seqNum.toString().padStart(4, '0')}`;
    }

    const { data: invoice, error: invErr } = await supabaseAdmin.from('invoices').insert({
      invoice_number: invoiceNumber, manually_created: true,
      invoice_date: new Date(invoice_date).toISOString(), due_date: new Date(due_date).toISOString(),
      distributor_id: customer.id, salesman_id: authResult.userId,
      customer_name: customer.name, customer_email: customer.email, customer_phone: customer.phone,
      customer_address: customer.address, customer_state: customer.state, customer_gstin: customer.gstin,
      company_name: settings.company_name,
      company_address: `${settings.address}, ${settings.city}, ${settings.state} ${settings.pincode}`,
      company_gstin: settings.gstin, company_phone: settings.phone, company_email: settings.email,
      subtotal, total_discount: totalDiscount,
      discount_mode: discount_mode === 'percentage' ? 'percentage' : 'amount',
      discount_value: Math.max(0, Number(discount_value) || 0),
      taxable_amount: subtotal, total_cgst: totalCgst, total_sgst: totalSgst,
      total_igst: 0, total_tax: totalTax, grand_total: grandTotal,
      paid_amount: 0, balance_due: grandTotal,
      status: 'Draft', payment_status: 'Pending',
      notes: notes || '', terms_and_conditions: payment_terms || '30 days',
    }).select().single();
    if (invErr) throw invErr;

    // Insert invoice items
    const itemRows = validatedItems.map(item => ({ invoice_id: invoice.id, ...item }));
    if (itemRows.length > 0) await supabaseAdmin.from('invoice_items').insert(itemRows);

    await updateCustomerOutstandingBalance(customer.id);

    return NextResponse.json({ success: true, message: 'Manual invoice created successfully' });
  } catch (error) {
    console.error('Error creating manual invoice:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to create manual invoice' }, { status: 400 });
  }
}