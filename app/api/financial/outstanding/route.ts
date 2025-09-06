import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import jwt from 'jsonwebtoken';

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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const sortBy = searchParams.get('sort') || '-due_date';
    const overdueOnly = searchParams.get('overdue') === 'true';

    // Get outstanding invoices with payment information
    const outstandingInvoices = await Invoice.aggregate([
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
          days_overdue: {
            $max: [
              0,
              {
                $divide: [
                  { $subtract: [new Date(), '$due_date'] },
                  1000 * 60 * 60 * 24 // Convert milliseconds to days
                ]
              }
            ]
          }
        }
      },
      {
        $match: {
          balance_due: { $gt: 0 },
          ...(overdueOnly ? { days_overdue: { $gt: 0 } } : {})
        }
      },
      {
        $addFields: {
          days_overdue: { $floor: '$days_overdue' }
        }
      },
      {
        $sort: getSortObject(sortBy)
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: limit
      },
      {
        $project: {
          invoice_number: 1,
          customer_details: 1,
          invoice_date: 1,
          due_date: 1,
          grand_total: 1,
          paid_amount: 1,
          balance_due: 1,
          days_overdue: 1,
          payment_terms: 1,
          status: 1
        }
      }
    ]);

    // Get total count for pagination
    const totalCountPipeline = await Invoice.aggregate([
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
          days_overdue: {
            $max: [
              0,
              {
                $divide: [
                  { $subtract: [new Date(), '$due_date'] },
                  1000 * 60 * 60 * 24
                ]
              }
            ]
          }
        }
      },
      {
        $match: {
          balance_due: { $gt: 0 },
          ...(overdueOnly ? { days_overdue: { $gt: 0 } } : {})
        }
      },
      {
        $count: 'total'
      }
    ]);

    const total = totalCountPipeline[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Calculate summary statistics
    const summaryStats = await Invoice.aggregate([
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
          days_overdue: {
            $max: [
              0,
              {
                $divide: [
                  { $subtract: [new Date(), '$due_date'] },
                  1000 * 60 * 60 * 24
                ]
              }
            ]
          }
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
          total_outstanding: { $sum: '$balance_due' },
          total_overdue: {
            $sum: {
              $cond: [
                { $gt: ['$days_overdue', 0] },
                '$balance_due',
                0
              ]
            }
          },
          count_outstanding: { $sum: 1 },
          count_overdue: {
            $sum: {
              $cond: [
                { $gt: ['$days_overdue', 0] },
                1,
                0
              ]
            }
          },
          average_overdue_days: {
            $avg: {
              $cond: [
                { $gt: ['$days_overdue', 0] },
                '$days_overdue',
                null
              ]
            }
          }
        }
      }
    ]);

    const summary = summaryStats[0] || {
      total_outstanding: 0,
      total_overdue: 0,
      count_outstanding: 0,
      count_overdue: 0,
      average_overdue_days: 0
    };

    return NextResponse.json({
      success: true,
      invoices: outstandingInvoices,
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
    console.error('Outstanding invoices error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getSortObject(sortBy: string) {
  const sortMap: { [key: string]: any } = {
    '-due_date': { due_date: -1 },
    'due_date': { due_date: 1 },
    '-balance_due': { balance_due: -1 },
    'balance_due': { balance_due: 1 },
    '-days_overdue': { days_overdue: -1 },
    'days_overdue': { days_overdue: 1 },
    '-invoice_date': { invoice_date: -1 },
    'invoice_date': { invoice_date: 1 },
    'customer': { 'customer_details.name': 1 },
    '-customer': { 'customer_details.name': -1 }
  };

  return sortMap[sortBy] || { due_date: -1 };
}
