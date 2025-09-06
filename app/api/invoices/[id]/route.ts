import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice, { IInvoice } from '@/models/Invoice';
import { verifyToken } from '@/lib/auth';
import { Model } from 'mongoose';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET - Get specific invoice
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const InvoiceModel = Invoice as Model<IInvoice>;
    
    // Build filter
    const filter: any = { _id: params.id };
    
    // If user is a salesman, only show their invoices
    if (decoded.role === 'Salesman') {
      filter.salesman_id = decoded.userId;
    }

    const invoice = await InvoiceModel.findOne(filter)
      .populate('customer_id', 'name email phone address state gstin')
      .populate('salesman_id', 'name email')
      .populate('sale_id');

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}

// PUT - Update invoice (status, payment, etc.)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const updates = await request.json();
    const allowedUpdates = [
      'status',
      'payment_status',
      'payment_method',
      'payment_date',
      'paid_amount',
      'notes',
    ];

    // Filter only allowed updates
    const filteredUpdates: any = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Calculate balance due if paid amount is updated
    if (filteredUpdates.paid_amount !== undefined) {
      const invoice = await (Invoice as Model<IInvoice>).findById(params.id);
      if (invoice) {
        filteredUpdates.balance_due = invoice.grand_total - filteredUpdates.paid_amount;
        
        // Auto-update payment status
        if (filteredUpdates.paid_amount >= invoice.grand_total) {
          filteredUpdates.payment_status = 'Paid';
          filteredUpdates.status = 'Paid';
        } else if (filteredUpdates.paid_amount > 0) {
          filteredUpdates.payment_status = 'Partial';
        } else {
          filteredUpdates.payment_status = 'Pending';
        }
      }
    }

    const InvoiceModel = Invoice as Model<IInvoice>;
    const invoice = await InvoiceModel.findByIdAndUpdate(
      params.id,
      filteredUpdates,
      { new: true, runValidators: true }
    );

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice updated successfully',
      invoice,
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}

// DELETE - Cancel invoice
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const InvoiceModel = Invoice as Model<IInvoice>;
    const invoice = await InvoiceModel.findById(params.id);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Can only cancel invoices that are not paid
    if (invoice.payment_status === 'Paid') {
      return NextResponse.json({ 
        error: 'Cannot cancel a paid invoice' 
      }, { status: 400 });
    }

    // Update status to cancelled
    invoice.status = 'Cancelled';
    invoice.payment_status = 'Pending';
    await invoice.save();

    return NextResponse.json({
      success: true,
      message: 'Invoice cancelled successfully',
      invoice,
    });
  } catch (error) {
    console.error('Error cancelling invoice:', error);
    return NextResponse.json({ error: 'Failed to cancel invoice' }, { status: 500 });
  }
}
