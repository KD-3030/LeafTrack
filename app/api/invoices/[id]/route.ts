import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, requireAdminAuth } from '@/lib/authMiddleware';
import { normalizeRoleId } from '@/lib/roles';
import { withId } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

async function updateCustomerOutstandingBalance(distributorId: string) {
  const { data: invoices } = await supabaseAdmin
    .from('invoices')
    .select('balance_due')
    .eq('distributor_id', distributorId)
    .neq('status', 'Cancelled');

  const outstandingBalance = (invoices || []).reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

  await supabaseAdmin
    .from('distributors')
    .update({ outstanding_balance: outstandingBalance })
    .eq('id', distributorId);
}

// GET - Get specific invoice
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;
    const { id } = await params;

    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const roleId = normalizeRoleId(decoded.role);

    if (roleId === 'secondary_executive') {
      // SE sees invoices for distributors of their PE
      const { data: seUser } = await supabaseAdmin
        .from('users').select('manager_id').eq('id', decoded.userId).single();
      const { data: dist } = await supabaseAdmin
        .from('distributors').select('pe_id').eq('id', invoice.distributor_id).single();
      if (!seUser?.manager_id || !dist || dist.pe_id !== seUser.manager_id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else if (roleId === 'primary_executive') {
      const { data: customer } = await supabaseAdmin
        .from('distributors')
        .select('pe_id')
        .eq('id', invoice.distributor_id)
        .single();

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }
      if (customer.pe_id !== decoded.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Calculate payment information
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('amount_paid')
      .eq('invoice_id', id)
      .eq('status', 'Confirmed');

    const paidAmount = (payments || []).reduce((sum, p) => sum + p.amount_paid, 0);
    const balanceDue = invoice.grand_total - paidAmount;

    const { data: customer } = await supabaseAdmin
      .from('distributors')
      .select('outstanding_balance')
      .eq('id', invoice.distributor_id)
      .single();

    // Fetch invoice items
    const { data: invoiceItems } = await supabaseAdmin
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);

    // Fetch salesman info
    let salesmanInfo = { name: 'Unknown', email: '' };
    if (invoice.salesman_id) {
      const { data: salesman } = await supabaseAdmin.from('users').select('name, email').eq('id', invoice.salesman_id).single();
      if (salesman) salesmanInfo = { name: salesman.name, email: salesman.email };
    }

    const invoiceWithPayments = {
      ...withId(invoice),
      items: invoice.items || (invoiceItems || []).map(withId),
      customer_details: {
        name: invoice.customer_name || 'Unknown',
        email: invoice.customer_email || '',
        phone: invoice.customer_phone || '',
        gstin: invoice.customer_gstin || '',
      },
      salesman_id: salesmanInfo,
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
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;
    const { id } = await params;

    const updates = await request.json();

    const { data: invoice, error: fetchErr } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Handle payment updates
    if (updates.paid_amount !== undefined && updates.payment_method) {
      const { data: currentPayments } = await supabaseAdmin
        .from('payments')
        .select('amount_paid')
        .eq('invoice_id', id)
        .eq('status', 'Confirmed');

      const currentPaidAmount = (currentPayments || []).reduce((sum, p) => sum + p.amount_paid, 0);
      const newPaymentAmount = updates.paid_amount - currentPaidAmount;

      if (newPaymentAmount > 0) {
        await supabaseAdmin.from('payments').insert({
          invoice_id: id,
          distributor_id: invoice.distributor_id,
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

    // Update allowed invoice fields (items handled separately via invoice_items table)
    const allowedUpdates = ['status', 'notes', 'due_date', 'grand_total', 'subtotal', 'total_discount', 'discount_mode', 'discount_value', 'balance_due', 'total_cgst', 'total_sgst', 'total_tax', 'taxable_amount'];
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

    // Update invoice_items if items are provided
    if (updates.items && Array.isArray(updates.items) && updates.items.length > 0) {
      // Delete existing items
      await supabaseAdmin.from('invoice_items').delete().eq('invoice_id', params.id);

      // Compute per-item discount and re-insert
      const totalDiscount = Number(updates.total_discount || 0);
      const discountMode = updates.discount_mode as string | undefined;
      const discountValue = Number(updates.discount_value || 0);
      const grossSubtotal = updates.items.reduce((s: number, it: Record<string, number>) => s + ((it.quantity || 0) * (it.unit_price || 0)), 0);

      const newItems = updates.items.map((item: Record<string, unknown>) => {
        const qty = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || 0);
        const grossAmount = qty * unitPrice;
        const itemDiscount = grossSubtotal > 0 && totalDiscount > 0
          ? Math.round((grossAmount / grossSubtotal) * totalDiscount * 100) / 100
          : 0;
        const taxableAmount = Math.max(0, grossAmount - itemDiscount);
        const gstRate = Number(item.gst_rate || 0);
        const taxAmount = Math.round((taxableAmount * gstRate / 100) * 100) / 100;
        const cgstAmount = Math.round((taxAmount / 2) * 100) / 100;
        const sgstAmount = Math.round((taxAmount - cgstAmount) * 100) / 100;
        return {
          invoice_id: params.id,
          product_id: item.product_id || null,
          product_name: item.product_name || '-',
          hsn_code: item.hsn_code || '',
          quantity: qty,
          unit_price: unitPrice,
          discount_percentage: discountMode === 'percentage' ? discountValue : 0,
          taxable_amount: taxableAmount,
          gst_rate: gstRate,
          cgst_amount: cgstAmount,
          sgst_amount: sgstAmount,
          igst_amount: 0,
          total_amount: Math.round((taxableAmount + taxAmount) * 100) / 100,
        };
      });

      const { error: itemsErr } = await supabaseAdmin.from('invoice_items').insert(newItems);
      if (itemsErr) {
        console.error('Error updating invoice items:', itemsErr);
        return NextResponse.json({ error: 'Failed to update invoice items' }, { status: 500 });
      }
    }

    const { data: updatedInvoice, error: updateErr } = await supabaseAdmin
      .from('invoices')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr || !updatedInvoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found after update' }, { status: 404 });
    }

    // Recalculate payment status
    const { data: allPayments } = await supabaseAdmin
      .from('payments')
      .select('amount_paid')
      .eq('invoice_id', id)
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
      .eq('id', id);

    await updateCustomerOutstandingBalance(updatedInvoice.distributor_id);

    const { data: customerData } = await supabaseAdmin
      .from('distributors')
      .select('outstanding_balance')
      .eq('id', updatedInvoice.distributor_id)
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
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { id } = await params;

    const { data: invoice, error: fetchErr } = await supabaseAdmin
      .from('invoices')
      .select('id, invoice_number, distributor_id')
      .eq('id', id)
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
      .eq('invoice_id', id)
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
      await supabaseAdmin.from('payments').delete().eq('invoice_id', id);
    }

    // Delete invoice items and invoice
    await supabaseAdmin.from('invoice_items').delete().eq('invoice_id', id);
    const { error: delErr } = await supabaseAdmin.from('invoices').delete().eq('id', id);

    if (delErr) {
      return NextResponse.json({ error: 'Invoice not found or already deleted' }, { status: 404 });
    }

    await updateCustomerOutstandingBalance(invoice.distributor_id);

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
