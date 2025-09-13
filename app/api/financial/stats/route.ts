import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    await connectDB();

    // Calculate financial statistics
    const stats = await calculateFinancialStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Financial stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function calculateFinancialStats() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Aggregate invoice totals
  const invoiceStats = await Invoice.aggregate([
    {
      $group: {
        _id: null,
        total_revenue: { $sum: '$grand_total' },
        invoice_count: { $sum: 1 },
        average_invoice_value: { $avg: '$grand_total' },
      }
    }
  ]);

  // Aggregate payment totals
  const paymentStats = await Payment.aggregate([
    {
      $group: {
        _id: null,
        total_paid: { $sum: '$amount_paid' },
        payment_count: { $sum: 1 },
        average_payment_value: { $avg: '$amount_paid' },
      }
    }
  ]);

  // Payments today
  const paymentsToday = await Payment.aggregate([
    {
      $match: {
        payment_date: { $gte: startOfToday },
        status: 'Confirmed'
      }
    },
    {
      $group: {
        _id: null,
        payments_today: { $sum: '$amount_paid' },
        count_today: { $sum: 1 }
      }
    }
  ]);

  // Payments this month
  const paymentsThisMonth = await Payment.aggregate([
    {
      $match: {
        payment_date: { $gte: startOfMonth },
        status: 'Confirmed'
      }
    },
    {
      $group: {
        _id: null,
        payments_this_month: { $sum: '$amount_paid' },
        count_this_month: { $sum: 1 }
      }
    }
  ]);

  // Calculate outstanding amounts with overdue information
  const outstandingStats = await Invoice.aggregate([
    {
      $lookup: {
        from: 'payments',
        localField: '_id',
        foreignField: 'invoice_id',
        as: 'payments'
      }
    },
    {
      $addFields: {
        paid_amount: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: '$payments',
                  cond: { $eq: ['$$this.status', 'Confirmed'] }
                }
              },
              as: 'payment',
              in: '$$payment.amount_paid'
            }
          }
        }
      }
    },
    {
      $addFields: {
        balance_due: { $subtract: ['$grand_total', '$paid_amount'] },
        is_overdue: { $lt: ['$due_date', new Date()] }
      }
    },
    {
      $match: {
        balance_due: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: null,
        total_pending: { $sum: '$balance_due' },
        overdue_amount: {
          $sum: {
            $cond: [
              '$is_overdue',
              '$balance_due',
              0
            ]
          }
        },
        pending_count: { $sum: 1 },
        overdue_count: {
          $sum: {
            $cond: [
              '$is_overdue',
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  // Calculate average payment time
  const paymentTimeStats = await Payment.aggregate([
    {
      $match: {
        status: 'Confirmed'
      }
    },
    {
      $lookup: {
        from: 'invoices',
        localField: 'invoice_id',
        foreignField: '_id',
        as: 'invoice'
      }
    },
    {
      $unwind: '$invoice'
    },
    {
      $addFields: {
        payment_delay_days: {
          $divide: [
            { $subtract: ['$payment_date', '$invoice.invoice_date'] },
            1000 * 60 * 60 * 24 // Convert milliseconds to days
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        average_payment_time: { $avg: '$payment_delay_days' }
      }
    }
  ]);

  // Compile results
  const totalRevenue = invoiceStats[0]?.total_revenue || 0;
  const totalPaid = paymentStats[0]?.total_paid || 0;
  const totalPending = outstandingStats[0]?.total_pending || 0;
  const overdueAmount = outstandingStats[0]?.overdue_amount || 0;
  const paymentsToday_amount = paymentsToday[0]?.payments_today || 0;
  const paymentsThisMonth_amount = paymentsThisMonth[0]?.payments_this_month || 0;
  const averagePaymentTime = Math.round(paymentTimeStats[0]?.average_payment_time || 0);

  return {
    total_revenue: totalRevenue,
    total_paid: totalPaid,
    total_pending: totalPending,
    overdue_amount: overdueAmount,
    payments_today: paymentsToday_amount,
    payments_this_month: paymentsThisMonth_amount,
    average_payment_time: averagePaymentTime,
    collection_rate: totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0,
    overdue_ratio: totalPending > 0 ? (overdueAmount / totalPending) * 100 : 0,
    invoice_count: invoiceStats[0]?.invoice_count || 0,
    payment_count: paymentStats[0]?.payment_count || 0,
    pending_invoice_count: outstandingStats[0]?.pending_count || 0,
    overdue_invoice_count: outstandingStats[0]?.overdue_count || 0,
  };
}
