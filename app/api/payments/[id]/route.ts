import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Customer from '@/models/Customer'; // Import Customer model for populate
import jwt, { JwtPayload } from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

interface DecodedToken extends JwtPayload {
  userId: string;
  role: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    await connectDB();

    const payment = await Payment.findById(params.id)
      .populate('invoice_id', 'invoice_number grand_total due_date customer_details')
      .populate('customer_id', 'name email phone')
      .lean();

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Payment GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const {
      amount_paid,
      payment_method,
      payment_date,
      status,
      reconciled,
      transaction_id,
      bank_reference,
      cheque_number,
      cheque_date,
      bank_name,
      notes,
      reconciliation_notes
    } = body;

    // Find the payment
    const payment = await Payment.findById(params.id);
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Update fields
    interface UpdateData {
      updated_by: string;
      updated_at: Date;
      amount_paid?: number;
      payment_method?: string;
      payment_date?: Date;
      status?: string;
      reconciled?: boolean;
      reconciled_date?: Date;
      reconciled_by?: string;
      transaction_id?: string;
      bank_reference?: string;
      cheque_number?: string;
      cheque_date?: Date | null;
      bank_name?: string;
      notes?: string;
      reconciliation_notes?: string;
    }
    const updateData: UpdateData = {
      updated_by: decoded.userId,
      updated_at: new Date()
    };

    // Allow editing amount_paid
    if (amount_paid !== undefined) {
      updateData.amount_paid = amount_paid;
    }

    // Allow editing payment_method
    if (payment_method !== undefined) {
      updateData.payment_method = payment_method;
    }

    // Allow editing payment_date
    if (payment_date !== undefined) {
      updateData.payment_date = new Date(payment_date);
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    if (reconciled !== undefined) {
      updateData.reconciled = reconciled;
      if (reconciled) {
        updateData.reconciled_date = new Date();
        updateData.reconciled_by = decoded.userId || decoded.id;
      }
    }

    if (transaction_id !== undefined) {
      updateData.transaction_id = transaction_id;
    }

    if (bank_reference !== undefined) {
      updateData.bank_reference = bank_reference;
    }

    if (cheque_number !== undefined) {
      updateData.cheque_number = cheque_number;
    }

    if (cheque_date !== undefined) {
      updateData.cheque_date = cheque_date ? new Date(cheque_date) : null;
    }

    if (bank_name !== undefined) {
      updateData.bank_name = bank_name;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (reconciliation_notes !== undefined) {
      updateData.reconciliation_notes = reconciliation_notes;
    }

    // Update the payment
    const updatedPayment = await Payment.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('invoice_id', 'invoice_number grand_total due_date customer_details')
      .populate('customer_id', 'name email phone')
      .lean();

    return NextResponse.json({
      success: true,
      message: 'Payment updated successfully',
      payment: updatedPayment
    });
  } catch (error) {
    console.error('Payment update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (decoded.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Only administrators can delete payments' },
        { status: 403 }
      );
    }

    await connectDB();

    // Check if force delete is requested
    const { searchParams } = new URL(request.url);
    const forceDelete = searchParams.get('force') === 'true';

    // Find the payment
    const payment = await Payment.findById(params.id);
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // If force delete is requested, permanently delete the payment
    if (forceDelete) {
      await Payment.findByIdAndDelete(params.id);
      
      return NextResponse.json({
        success: true,
        message: 'Payment permanently deleted',
      });
    }

    // Check if payment is reconciled for soft delete
    if (payment.reconciled && payment.status === 'Confirmed') {
      return NextResponse.json(
        { error: 'Cannot delete reconciled payments. Use force delete option or contact system administrator.' },
        { status: 400 }
      );
    }

    // Soft delete by updating status to cancelled
    const updatedPayment = await Payment.findByIdAndUpdate(
      params.id,
      {
        status: 'Cancelled',
        reconciled: false,
        cancelled_by: decoded.id,
        cancelled_at: new Date(),
        cancellation_reason: 'Deleted by administrator'
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Payment cancelled successfully',
      payment: updatedPayment
    });
  } catch (error) {
    console.error('Payment deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
