import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, requireAdminAuth } from '@/lib/authMiddleware';
import { normalizeRoleId } from '@/lib/roles';
import { withId } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

async function updateCustomerOutstandingBalance(customerId: string) {
  const { data: invoices } = await supabaseAdmin
    .from('invoices')
    .select('balance_due')
    .eq('customer_id', customerId)
    .neq('status', 'Cancelled');

  const outstandingBalance = (invoices || []).reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

  await supabaseAdmin
    .from('customers')
    .update({ outstanding_balance: outstandingBalance })
    .eq('id', customerId);
}

// GET - Get specific invoice
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;

    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const roleId = normalizeRoleId(decoded.role);

    if (roleId === 'secondary_executive') {
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('primary_executive_id, secondary_executive_id')
        .eq('id', invoice.customer_id)
        .single();

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }
      if (customer.secondary_executive_id !== decoded.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else if (roleId === 'primary_executive') {
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('primary_executive_id')
        .eq('id', invoice.customer_id)
        .single();

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }
      if (customer.primary_executive_id !== decoded.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Calculate payment information
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('amount_paid')
      .eq('invoice_id', params.id)
      .eq('status', 'Confirmed');

    const paidAmount = (payments || []).reduce((sum, p) => sum + p.amount_paid, 0);
    const balanceDue = invoice.grand_total - paidAmount;

    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('outstanding_balance')
      .eq('id', invoice.customer_id)
      .single();

    // Fetch invoice items
    const { data: invoiceItems } = await supabaseAdmin
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', params.id);

    const invoiceWithPayments = {
      ...withId(invoice),
      items: invoice.items || (invoiceItems || []).map(withId),
      paid_amount: paidAmount,
      balance_due: balanceDue,
      payment_status: balanceDue <= 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Pending'),
      customer_total_due: customer?.outstanding_balance || 0,
    };

    return NextResponse.json({ success: true, invoice: invoiceWithPayments });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}

// PUT - Update invoice (status, payment, etc.)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;

    const updates = await request.json();

    const { data: invoice, error: fetchErr } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Handle payment updates
    if (updates.paid_amount !== undefined && updates.payment_method) {
      const { data: currentPayments } = await supabaseAdmin
        .from('payments')
        .select('amount_paid')
        .eq('invoice_id', params.id)
        .eq('status', 'Confirmed');

      const currentPaidAmount = (currentPayments || []).reduce((sum, p) => sum + p.amount_paid, 0);
      const newPaymentAmount = updates.paid_amount - currentPaidAmount;

      if (newPaymentAmount > 0) {
        await supabaseAdmin.from('payments').insert({
          invoice_id: params.id,
          customer_id: invoice.customer_id,
          amount_paid: newPaymentAmount,
          payment_method: updates.payment_method,
          payment_date: updates.payment_date ? new Date(updates.payment_date).toISOString() : new Date().toISOString(),
          status: 'Confirmed',
          reconciled: true,
          notes: 'Payment recorded via invoice update',
          created_by: decoded.userId,
        });
      }
    }

    // Update allowed invoice fields
    const allowedUpdates = ['status', 'notes', 'due_date', 'items', 'grand_total', 'subtotal', 'total_discount', 'discount_mode', 'discount_value', 'balance_due', 'total_cgst', 'total_sgst', 'total_tax'];
    const filteredUpdates: Record<string, unknown> = {};

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });

    if (Object.keys(filteredUpdates).length > 0) {
      filteredUpdates.updated_at = new Date().toISOString();
      filteredUpdates.updated_by = decoded.userId;
    }

    const { data: updatedInvoice, error: updateErr } = await supabaseAdmin
      .from('invoices')
      .update(filteredUpdates)
      .eq('id', params.id)
      .select()
      .single();

    if (updateErr || !updatedInvoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found after update' }, { status: 404 });
    }

    // Recalculate payment status
    const { data: allPayments } = await supabaseAdmin
      .from('payments')
      .select('amount_paid')
      .eq('invoice_id', params.id)
      .eq('status', 'Confirmed');

    const totalPaid = (allPayments || []).reduce((sum, p) => sum + p.amount_paid, 0);
    const balanceDue = updatedInvoice.grand_total - totalPaid;
    const paymentStatus = balanceDue <= 0 ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Pending');

    await supabaseAdmin
      .from('invoices')
      .update({
        paid_amount: totalPaid,
        balance_due: balanceDue,
        payment_status: paymentStatus,
      })
      .eq('id', params.id);

    await updateCustomerOutstandingBalance(updatedInvoice.customer_id);

    const { data: customerData } = await supabaseAdmin
      .from('customers')
      .select('outstanding_balance')
      .eq('id', updatedInvoice.customer_id)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Invoice updated successfully',
      invoice: {
        ...withId(updatedInvoice),
        paid_amount: totalPaid,
        balance_due: balanceDue,
        payment_status: paymentStatus,
        customer_total_due: customerData?.outstanding_balance || 0,
      },
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({
      error: `Failed to update invoice: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

// DELETE - Cancel invoice
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { data: invoice, error: fetchErr } = await supabaseAdmin
      .from('invoices')
      .select('id, invoice_number, customer_id')
      .eq('id', params.id)
      .single();

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const forceDelete = searchParams.get('force') === 'true';

    // Check confirmed payments
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('invoice_id', params.id)
      .eq('status', 'Confirmed');

    const paymentCount = payments?.length || 0;

    if (paymentCount > 0 && !forceDelete) {
      return NextResponse.json({
        error: 'Cannot cancel invoice with confirmed payments. Use force=true to delete anyway.',
        hasPayments: true,
        paymentCount,
      }, { status: 400 });
    }

    // If forcing delete with payments, delete the payments first
    if (forceDelete && paymentCount > 0) {
      await supabaseAdmin.from('payments').delete().eq('invoice_id', params.id);
    }

    // Delete invoice items and invoice
    await supabaseAdmin.from('invoice_items').delete().eq('invoice_id', params.id);
    const { error: delErr } = await supabaseAdmin.from('invoices').delete().eq('id', params.id);

    if (delErr) {
      return NextResponse.json({ error: 'Invoice not found or already deleted' }, { status: 404 });
    }

    await updateCustomerOutstandingBalance(invoice.customer_id);

    return NextResponse.json({
      success: true,
      message: forceDelete
        ? `Invoice deleted successfully. ${paymentCount} payment(s) were removed.`
        : 'Invoice deleted successfully',
      deletedInvoice: { _id: invoice.id, invoice_number: invoice.invoice_number },
      paymentsDeleted: forceDelete ? paymentCount : 0,
    });
  } catch (error) {
    console.error('Error cancelling invoice:', error);
    return NextResponse.json({ error: 'Failed to cancel invoice' }, { status: 500 });
  }
}
