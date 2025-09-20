import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Invoice from '@/models/Invoice';
import { requireUserAuth, DecodedToken } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Use standardized authentication
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const decoded = authResult as DecodedToken;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const sortBy = searchParams.get('sort') || '-payment_date';
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    const reconciled = searchParams.get('reconciled');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build filter
    const filter: any = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (method) {
      filter.payment_method = method;
    }
    
    if (reconciled !== null && reconciled !== undefined) {
      filter.reconciled = reconciled === 'true';
    }
    
    if (dateFrom || dateTo) {
      filter.payment_date = {};
      if (dateFrom) {
        filter.payment_date.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.payment_date.$lte = new Date(dateTo);
      }
    }

    // Get payments with populated invoice and customer data
    const payments = await Payment.find(filter)
      .populate('invoice_id', 'invoice_number grand_total due_date')
      .populate('customer_id', 'name email phone')
      .sort(getSortObject(sortBy))
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Payment.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    // Calculate summary statistics for current filter
    const summaryStats = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total_amount: { $sum: '$amount_paid' },
          count: { $sum: 1 },
          confirmed_amount: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'Confirmed'] },
                '$amount_paid',
                0
              ]
            }
          },
          pending_amount: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'Pending'] },
                '$amount_paid',
                0
              ]
            }
          },
          reconciled_amount: {
            $sum: {
              $cond: [
                '$reconciled',
                '$amount_paid',
                0
              ]
            }
          },
          unreconciled_count: {
            $sum: {
              $cond: [
                { $eq: ['$reconciled', false] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const summary = summaryStats[0] || {
      total_amount: 0,
      count: 0,
      confirmed_amount: 0,
      pending_amount: 0,
      reconciled_amount: 0,
      unreconciled_count: 0
    };

    return NextResponse.json({
      success: true,
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      summary
    });
  } catch (error) {
    console.error('Payments GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use standardized authentication
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const decoded = authResult as DecodedToken;
    await connectDB();

    const body = await request.json();
    const {
      invoice_id,
      customer_id,
      amount_paid,
      payment_method,
      transaction_id,
      bank_reference,
      cheque_number,
      cheque_date,
      bank_name,
      notes
    } = body;

    // Validate required fields
    if (!invoice_id || !amount_paid || !payment_method) {
      return NextResponse.json(
        { error: 'Missing required fields: invoice_id, amount_paid, payment_method' },
        { status: 400 }
      );
    }

    if (amount_paid <= 0) {
      return NextResponse.json(
        { error: 'Amount paid must be greater than 0' },
        { status: 400 }
      );
    }

    // Verify invoice exists and get customer info
    const invoice = await Invoice.findById(invoice_id).lean();
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Calculate current balance
    const existingPayments = await Payment.find({
      invoice_id,
      status: 'Confirmed'
    }).lean();

    const totalPaid = existingPayments.reduce((sum, payment) => sum + payment.amount_paid, 0);
    const remainingBalance = invoice.grand_total - totalPaid;

    if (amount_paid > remainingBalance) {
      return NextResponse.json(
        { error: `Payment amount (₹${amount_paid}) exceeds remaining balance (₹${remainingBalance})` },
        { status: 400 }
      );
    }

    // Create payment record
    const paymentData: any = {
      invoice_id,
      customer_id: customer_id || invoice.customer_details,
      amount_paid: parseFloat(amount_paid),
      payment_method,
      payment_date: new Date(),
      status: 'Pending', // Start as pending for review
      reconciled: false,
      created_by: decoded.userId,
      notes
    };

    // Add method-specific fields
    if (payment_method === 'Bank Transfer' || payment_method === 'UPI') {
      if (transaction_id) paymentData.transaction_id = transaction_id;
      if (bank_reference) paymentData.bank_reference = bank_reference;
    }

    if (payment_method === 'Cheque') {
      if (cheque_number) paymentData.cheque_number = cheque_number;
      if (cheque_date) paymentData.cheque_date = new Date(cheque_date);
      if (bank_name) paymentData.bank_name = bank_name;
    }

    // Auto-confirm cash payments
    if (payment_method === 'Cash') {
      paymentData.status = 'Confirmed';
      paymentData.reconciled = true;
    }

    const payment = new Payment(paymentData);
    await payment.save();

    // Populate the response
    const populatedPayment = await Payment.findById(payment._id)
      .populate('invoice_id', 'invoice_number grand_total due_date')
      .populate('customer_id', 'name email phone')
      .lean();

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      payment: populatedPayment
    }, { status: 201 });
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getSortObject(sortBy: string) {
  const sortMap: { [key: string]: any } = {
    '-payment_date': { payment_date: -1 },
    'payment_date': { payment_date: 1 },
    '-amount_paid': { amount_paid: -1 },
    'amount_paid': { amount_paid: 1 },
    'status': { status: 1 },
    '-status': { status: -1 },
    'method': { payment_method: 1 },
    '-method': { payment_method: -1 },
    'reconciled': { reconciled: 1 },
    '-reconciled': { reconciled: -1 }
  };

  return sortMap[sortBy] || { payment_date: -1 };
}
