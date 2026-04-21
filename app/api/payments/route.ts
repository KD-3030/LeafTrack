import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireUserAuth } from '@/lib/authMiddleware';
import { withId } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

async function recalculateInvoiceBalance(invoiceId: string) {
  const { data: invoice } = await supabaseAdmin.from('invoices').select('grand_total').eq('id', invoiceId).single();
  if (!invoice) throw new Error('Invoice not found');

  const { data: payments } = await supabaseAdmin.from('payments').select('amount_paid').eq('invoice_id', invoiceId).in('status', ['Confirmed', 'Pending']);
  const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
  const balanceDue = Number(invoice.grand_total) - totalPaid;

  let paymentStatus: 'Pending' | 'Partial' | 'Paid' = 'Pending';
  if (balanceDue <= 0) paymentStatus = 'Paid';
  else if (totalPaid > 0) paymentStatus = 'Partial';

  await supabaseAdmin.from('invoices').update({
    paid_amount: totalPaid,
    balance_due: Math.max(0, balanceDue),
    payment_status: paymentStatus,
  }).eq('id', invoiceId);

  return { totalPaid, balanceDue: Math.max(0, balanceDue), paymentStatus };
}

export async function GET(request: NextRequest) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const sortBy = searchParams.get('sort') || '-payment_date';
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    const reconciled = searchParams.get('reconciled');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let query = supabaseAdmin.from('payments').select('*', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (method) query = query.eq('payment_method', method);
    if (reconciled !== null && reconciled !== undefined && reconciled !== '') {
      query = query.eq('reconciled', reconciled === 'true');
    }
    if (dateFrom) query = query.gte('payment_date', new Date(dateFrom).toISOString());
    if (dateTo) query = query.lte('payment_date', new Date(dateTo).toISOString());

    // Sort
    const sortMap: Record<string, { col: string; asc: boolean }> = {
      '-payment_date': { col: 'payment_date', asc: false },
      'payment_date': { col: 'payment_date', asc: true },
      '-amount_paid': { col: 'amount_paid', asc: false },
      'amount_paid': { col: 'amount_paid', asc: true },
      'status': { col: 'status', asc: true },
      '-status': { col: 'status', asc: false },
      'method': { col: 'payment_method', asc: true },
      '-method': { col: 'payment_method', asc: false },
      'reconciled': { col: 'reconciled', asc: true },
      '-reconciled': { col: 'reconciled', asc: false },
    };
    const sort = sortMap[sortBy] || { col: 'payment_date', asc: false };
    const offset = (page - 1) * limit;

    const { data: rawPayments, count, error } = await query
      .order(sort.col, { ascending: sort.asc })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    const payments = rawPayments || [];
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    // Enrich with invoice and distributor data
    const invIds = [...new Set(payments.map(p => p.invoice_id).filter(Boolean))];
    const distIds = [...new Set(payments.map(p => p.distributor_id).filter(Boolean))];
    const [invRes, distRes] = await Promise.all([
      invIds.length ? supabaseAdmin.from('invoices').select('id, invoice_number, grand_total, due_date').in('id', invIds) : { data: [] },
      distIds.length ? supabaseAdmin.from('distributors').select('id, name, email, phone').in('id', distIds) : { data: [] },
    ]);
    const invMap = new Map((invRes.data || []).map(i => [i.id, i]));
    const distMap = new Map((distRes.data || []).map(d => [d.id, d]));

    const enriched = payments.map(p => ({
      ...withId(p),
      invoice_id: p.invoice_id && invMap.has(p.invoice_id) ? { _id: p.invoice_id, ...invMap.get(p.invoice_id) } : p.invoice_id,
      customer_id: p.distributor_id && distMap.has(p.distributor_id) ? { _id: p.distributor_id, ...distMap.get(p.distributor_id) } : p.distributor_id,
    }));

    // Summary statistics - fetch all matching payments for summary
    let summaryQuery = supabaseAdmin.from('payments').select('amount_paid, status, reconciled');
    if (status) summaryQuery = summaryQuery.eq('status', status);
    if (method) summaryQuery = summaryQuery.eq('payment_method', method);
    if (reconciled !== null && reconciled !== undefined && reconciled !== '') {
      summaryQuery = summaryQuery.eq('reconciled', reconciled === 'true');
    }
    if (dateFrom) summaryQuery = summaryQuery.gte('payment_date', new Date(dateFrom).toISOString());
    if (dateTo) summaryQuery = summaryQuery.lte('payment_date', new Date(dateTo).toISOString());

    const { data: allPayments } = await summaryQuery;
    const all = allPayments || [];
    const summary = {
      total_amount: all.reduce((s, p) => s + Number(p.amount_paid || 0), 0),
      count: all.length,
      confirmed_amount: all.filter(p => p.status === 'Confirmed').reduce((s, p) => s + Number(p.amount_paid || 0), 0),
      pending_amount: all.filter(p => p.status === 'Pending').reduce((s, p) => s + Number(p.amount_paid || 0), 0),
      reconciled_amount: all.filter(p => p.reconciled).reduce((s, p) => s + Number(p.amount_paid || 0), 0),
      unreconciled_count: all.filter(p => !p.reconciled).length,
    };

    return NextResponse.json({
      success: true,
      payments: enriched,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      summary,
    });
  } catch (error) {
    console.error('Payments GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { invoice_id, customer_id, distributor_id, amount_paid, payment_method, payment_date, transaction_id, bank_reference, cheque_number, cheque_date, bank_name, notes } = body;

    if (!invoice_id || !amount_paid || !payment_method) {
      return NextResponse.json({ error: 'Missing required fields: invoice_id, amount_paid, payment_method' }, { status: 400 });
    }
    if (amount_paid <= 0) {
      return NextResponse.json({ error: 'Amount paid must be greater than 0' }, { status: 400 });
    }

    const { data: invoice } = await supabaseAdmin.from('invoices').select('grand_total, distributor_id').eq('id', invoice_id).single();
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const { data: existingPayments } = await supabaseAdmin.from('payments').select('amount_paid').eq('invoice_id', invoice_id).eq('status', 'Confirmed');
    const totalPaid = (existingPayments || []).reduce((sum, p) => sum + Number(p.amount_paid), 0);
    const remainingBalance = Number(invoice.grand_total) - totalPaid;

    if (amount_paid > remainingBalance) {
      return NextResponse.json({ error: `Payment amount exceeds remaining balance (${remainingBalance})` }, { status: 400 });
    }

    const finalDistributorId = distributor_id || customer_id || invoice.distributor_id;
    if (!finalDistributorId) return NextResponse.json({ error: 'Distributor ID is required' }, { status: 400 });

    const paymentData: Record<string, unknown> = {
      invoice_id,
      distributor_id: finalDistributorId,
      amount_paid: parseFloat(amount_paid),
      payment_method,
      payment_date: payment_date ? new Date(payment_date).toISOString() : new Date().toISOString(),
      status: payment_method === 'Cash' ? 'Confirmed' : 'Pending',
      reconciled: payment_method === 'Cash',
      created_by: authResult.userId,
      notes,
    };

    if (transaction_id) paymentData.transaction_id = transaction_id;
    if (bank_reference) paymentData.bank_reference = bank_reference;
    if (cheque_number) paymentData.cheque_number = cheque_number;
    if (cheque_date) paymentData.cheque_date = new Date(cheque_date).toISOString();
    if (bank_name) paymentData.bank_name = bank_name;

    const { data: payment, error: payErr } = await supabaseAdmin.from('payments').insert(paymentData).select().single();
    if (payErr) throw payErr;

    await recalculateInvoiceBalance(invoice_id);

    // Enrich response
    const invInfo = { _id: invoice_id, grand_total: invoice.grand_total };
    const { data: distInfo } = await supabaseAdmin.from('distributors').select('id, name, email, phone').eq('id', finalDistributorId).single();

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      payment: {
        ...withId(payment),
        invoice_id: invInfo,
        customer_id: distInfo ? { _id: distInfo.id, ...distInfo } : finalDistributorId,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}