import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

interface JWTPayload {
  role: string;
  id: string;
}

// GET - Get specific invoice
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Build filter
    const filter: {
      _id: string;
      salesman_id?: string | mongoose.Types.ObjectId;
    } = { _id: params.id };
    
    // If user is a salesman, only show their invoices
    if (decoded.role === 'salesman') {
      filter.salesman_id = decoded.id;
    }

    const invoice = await Invoice.findOne(filter).lean();

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Calculate payment information
    const payments = await Payment.find({
      invoice_id: params.id,
      status: 'Confirmed'
    }).lean();

    const paidAmount = payments.reduce((sum, payment) => sum + payment.amount_paid, 0);
    const balanceDue = invoice.grand_total - paidAmount;

    const invoiceWithPayments = {
      ...invoice,
      paid_amount: paidAmount,
      balance_due: balanceDue,
      payment_status: balanceDue <= 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Pending')
    };

    return NextResponse.json({
      success: true,
      invoice: invoiceWithPayments,
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}

// PUT - Update invoice (status, payment, etc.)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    if (decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const updates = await request.json();

    // Find the invoice
    const invoice = await Invoice.findById(params.id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Handle payment updates
    if (updates.paid_amount !== undefined && updates.payment_method) {
      const currentPayments = await Payment.find({
        invoice_id: params.id,
        status: 'Confirmed'
      });

      const currentPaidAmount = currentPayments.reduce((sum, payment) => sum + payment.amount_paid, 0);
      const newPaymentAmount = updates.paid_amount - currentPaidAmount;
      
      if (newPaymentAmount > 0) {
        // Create a payment record for the difference
        const payment = new Payment({
          invoice_id: params.id,
          customer_id: invoice.customer_id, // Use the actual ObjectId, not customer_details
          amount_paid: newPaymentAmount,
          payment_method: updates.payment_method,
          payment_date: updates.payment_date || new Date(),
          status: 'Confirmed',
          reconciled: true,
          notes: 'Payment recorded via invoice update',
          created_by: decoded.id
        });
        await payment.save();
      }
    }

    // Update allowed invoice fields
    const allowedUpdates = ['status', 'notes', 'due_date', 'items', 'grand_total'];
    const filteredUpdates: Record<string, unknown> = {};
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });

    if (Object.keys(filteredUpdates).length > 0) {
      filteredUpdates.updated_at = new Date();
      filteredUpdates.updated_by = decoded.id;
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      params.id,
      filteredUpdates,
      { new: true, runValidators: true }
    ).lean();

    if (!updatedInvoice) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invoice not found after update' 
      }, { status: 404 });
    }

    // Recalculate payment status
    const allPayments = await Payment.find({
      invoice_id: params.id,
      status: 'Confirmed'
    });

    const totalPaid = allPayments.reduce((sum, payment) => sum + payment.amount_paid, 0);
    const balanceDue = updatedInvoice.grand_total - totalPaid;

    const invoiceWithPayments = {
      ...updatedInvoice,
      paid_amount: totalPaid,
      balance_due: balanceDue,
      payment_status: balanceDue <= 0 ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Pending')
    };

    return NextResponse.json({
      success: true,
      message: 'Invoice updated successfully',
      invoice: invoiceWithPayments,
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
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    if (decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const invoice = await Invoice.findById(params.id);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check for query parameter to force delete
    const { searchParams } = new URL(request.url);
    const forceDelete = searchParams.get('force') === 'true';

    // Check if there are confirmed payments
    const payments = await Payment.find({
      invoice_id: params.id,
      status: 'Confirmed'
    });

    if (payments.length > 0 && !forceDelete) {
      return NextResponse.json({ 
        error: 'Cannot cancel invoice with confirmed payments. Use force=true to delete anyway.',
        hasPayments: true,
        paymentCount: payments.length
      }, { status: 400 });
    }

    // If forcing delete with payments, delete the payments first
    if (forceDelete && payments.length > 0) {
      await Payment.deleteMany({
        invoice_id: params.id
      });
    }

    // Permanently delete the invoice from the database
    const deletedInvoice = await Invoice.findByIdAndDelete(params.id);

    if (!deletedInvoice) {
      return NextResponse.json({ 
        error: 'Invoice not found or already deleted' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: forceDelete 
        ? `Invoice deleted successfully. ${payments.length} payment(s) were removed.`
        : 'Invoice deleted successfully',
      deletedInvoice: {
        _id: deletedInvoice._id,
        invoice_number: deletedInvoice.invoice_number,
      },
      paymentsDeleted: forceDelete ? payments.length : 0
    });
  } catch (error) {
    console.error('Error cancelling invoice:', error);
    return NextResponse.json({ error: 'Failed to cancel invoice' }, { status: 500 });
  }
}
