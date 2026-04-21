import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, requireAdminAuth } from '@/lib/authMiddleware';
import { withId } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

// Helper function to recalculate invoice balance based on all confirmed payments
async function recalculateInvoiceBalance(invoiceId: string) {
  const { data: invoice, error: invErr } = await supabaseAdmin
    .from('invoices')
    .select('grand_total')
    .eq('id', invoiceId)
    .single();

  if (invErr || !invoice) {
    throw new Error('Invoice not found');
  }

  // Get all confirmed/pending payments for this invoice (excluding cancelled)
  const { data: confirmedPayments } = await supabaseAdmin
    .from('payments')
    .select('amount_paid')
    .eq('invoice_id', invoiceId)
    .in('status', ['Confirmed', 'Pending']);

  const totalPaid = (confirmedPayments || []).reduce((sum, p) => sum + (p.amount_paid || 0), 0);
  const balanceDue = invoice.grand_total - totalPaid;

  let paymentStatus: 'Pending' | 'Partial' | 'Paid' = 'Pending';
  if (balanceDue <= 0) {
    paymentStatus = 'Paid';
  } else if (totalPaid > 0) {
    paymentStatus = 'Partial';
  }

  await supabaseAdmin
    .from('invoices')
    .update({
      paid_amount: totalPaid,
      balance_due: Math.max(0, balanceDue),
      payment_status: paymentStatus,
    })
    .eq('id', invoiceId);

  return { totalPaid, balanceDue: Math.max(0, balanceDue), paymentStatus };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;

    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Fetch related invoice and customer data
    const [invoiceRes, customerRes] = await Promise.all([
      payment.invoice_id
        ? supabaseAdmin.from('invoices').select('id, invoice_number, grand_total, due_date, customer_details').eq('id', payment.invoice_id).single()
        : Promise.resolve({ data: null }),
      payment.distributor_id
        ? supabaseAdmin.from('distributors').select('id, name, email, phone').eq('id', payment.distributor_id).single()
        : Promise.resolve({ data: null }),
    ]);

    const enriched = {
      ...withId(payment),
      invoice_id: invoiceRes.data ? withId(invoiceRes.data) : payment.invoice_id,
      customer_id: customerRes.data ? withId(customerRes.data) : payment.distributor_id,
    };

    return NextResponse.json({ success: true, payment: enriched });
  } catch (error) {
    console.error('Payment GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;

    const { id } = await params;

    // Find the payment first to get invoice_id for recalc
    const { data: payment, error: fetchErr } = await supabaseAdmin
      .from('payments')
      .select('invoice_id')
      .eq('id', id)
      .single();

    if (fetchErr || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      amount_paid, payment_method, payment_date, status,
      reconciled, transaction_id, bank_reference,
      cheque_number, cheque_date, bank_name, notes
    } = body;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (amount_paid !== undefined) updateData.amount_paid = amount_paid;
    if (payment_method !== undefined) updateData.payment_method = payment_method;
    if (payment_date !== undefined) updateData.payment_date = new Date(payment_date).toISOString();
    if (status !== undefined) updateData.status = status;
    if (reconciled !== undefined) {
      updateData.reconciled = reconciled;
      if (reconciled) {
        updateData.reconciled_date = new Date().toISOString();
        updateData.reconciled_by = decoded.userId;
      }
    }
    if (transaction_id !== undefined) updateData.transaction_id = transaction_id;
    if (bank_reference !== undefined) updateData.bank_reference = bank_reference;
    if (cheque_number !== undefined) updateData.cheque_number = cheque_number;
    if (cheque_date !== undefined) updateData.cheque_date = cheque_date ? new Date(cheque_date).toISOString() : null;
    if (bank_name !== undefined) updateData.bank_name = bank_name;
    if (notes !== undefined) updateData.notes = notes;

    const { data: updatedPayment, error: updateErr } = await supabaseAdmin
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateErr || !updatedPayment) {
      return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
    }

    // Recalculate invoice balance if payment amount or status changed
    if (payment.invoice_id && (amount_paid !== undefined || status !== undefined)) {
      await recalculateInvoiceBalance(payment.invoice_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment updated successfully',
      payment: withId(updatedPayment),
    });
  } catch (error) {
    console.error('Payment update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;

    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const forceDelete = searchParams.get('force') === 'true';

    const { data: payment, error: fetchErr } = await supabaseAdmin
      .from('payments')
      .select('invoice_id, reconciled, status')
      .eq('id', id)
      .single();

    if (fetchErr || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (forceDelete) {
      await supabaseAdmin.from('payments').delete().eq('id', id);

      if (payment.invoice_id) {
        await recalculateInvoiceBalance(payment.invoice_id);
      }

      return NextResponse.json({ success: true, message: 'Payment permanently deleted' });
    }

    // Check if payment is reconciled for soft delete
    if (payment.reconciled && payment.status === 'Confirmed') {
      return NextResponse.json(
        { error: 'Cannot delete reconciled payments. Use force delete option or contact system administrator.' },
        { status: 400 }
      );
    }

    // Soft delete by updating status to cancelled
    const { data: updatedPayment } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'Cancelled',
        reconciled: false,
        notes: 'Deleted by administrator',
      })
      .eq('id', id)
      .select()
      .single();

    if (payment.invoice_id) {
      await recalculateInvoiceBalance(payment.invoice_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment cancelled successfully',
      payment: updatedPayment ? withId(updatedPayment) : null,
    });
  } catch (error) {
    console.error('Payment deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
