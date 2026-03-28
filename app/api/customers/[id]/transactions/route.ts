import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireUserAuth } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const customerId = params.id;
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    // Fetch invoices and payments in parallel
    const [invoicesRes, paymentsRes] = await Promise.all([
      supabaseAdmin
        .from('invoices')
        .select('id, invoice_number, invoice_date, grand_total, paid_amount, balance_due, payment_status, status, taxable_amount, total_tax')
        .eq('customer_id', customerId)
        .neq('status', 'Cancelled')
        .order('invoice_date', { ascending: false }),
      supabaseAdmin
        .from('payments')
        .select('id, invoice_id, amount_paid, payment_method, payment_date, status, transaction_id, bank_reference, cheque_number, notes')
        .eq('customer_id', customerId)
        .order('payment_date', { ascending: false }),
    ]);

    if (invoicesRes.error) throw invoicesRes.error;
    if (paymentsRes.error) throw paymentsRes.error;

    const invoices = (invoicesRes.data || []).map(inv => ({
      ...inv,
      _id: inv.id,
    }));

    // Build invoice number map for payment enrichment
    const invoiceMap = new Map(invoices.map(i => [i.id, i.invoice_number]));

    const payments = (paymentsRes.data || []).map(p => ({
      ...p,
      _id: p.id,
      amount_paid: p.amount_paid,
      invoice_id: p.invoice_id ? { _id: p.invoice_id, invoice_number: invoiceMap.get(p.invoice_id) || '' } : null,
      reference_number: p.transaction_id || p.bank_reference || p.cheque_number,
    }));

    // Summary statistics
    const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0);
    const totalPaidAmount = invoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
    const totalDueAmount = invoices.reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);

    const confirmedPayments = (paymentsRes.data || []).filter(
      p => p.status === 'Confirmed' || p.status === 'Pending'
    );
    const totalPaymentAmount = confirmedPayments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

    const paidInvoices = invoices.filter(inv => inv.payment_status === 'Paid').length;
    const pendingInvoices = invoices.filter(inv => inv.payment_status === 'Pending').length;
    const partialInvoices = invoices.filter(inv => inv.payment_status === 'Partial').length;
    const overdueInvoices = invoices.filter(inv => inv.payment_status !== 'Paid' && Number(inv.balance_due) > 0).length;

    return NextResponse.json({
      success: true,
      summary: {
        total_invoices: invoices.length,
        total_invoice_amount: totalInvoiceAmount,
        total_paid_amount: totalPaidAmount,
        total_payment_records: totalPaymentAmount,
        total_due_amount: totalDueAmount,
        paid_invoices: paidInvoices,
        pending_invoices: pendingInvoices,
        partial_invoices: partialInvoices,
        overdue_invoices: overdueInvoices,
        payment_count: payments.length,
      },
      transactions: {
        invoices,
        payments,
      },
    });
  } catch (error) {
    console.error('Error fetching customer transactions:', error);
    return NextResponse.json({
      error: 'Failed to fetch customer transactions',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
