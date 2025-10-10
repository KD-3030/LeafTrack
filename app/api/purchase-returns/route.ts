import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PurchaseReturn from '@/models/PurchaseReturn';
import { verifyToken } from '@/lib/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/purchase-returns - Get all purchase returns with filters
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Filters
    const supplier_name = searchParams.get('supplier_name');
    const product_name = searchParams.get('product_name');
    const refund_status = searchParams.get('refund_status');
    const approval_status = searchParams.get('approval_status');
    const return_type = searchParams.get('return_type');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const search = searchParams.get('search');

    // Build query
    interface QueryType {
      supplier_name?: { $regex: string; $options: string };
      product_name?: { $regex: string; $options: string };
      refund_status?: string;
      approval_status?: string;
      return_type?: string;
      return_date?: { $gte?: Date; $lte?: Date };
      $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
    }
    const query: QueryType = {};

    if (supplier_name) {
      query.supplier_name = { $regex: supplier_name, $options: 'i' };
    }

    if (product_name) {
      query.product_name = { $regex: product_name, $options: 'i' };
    }

    if (refund_status) {
      query.refund_status = refund_status;
    }

    if (approval_status) {
      query.approval_status = approval_status;
    }

    if (return_type) {
      query.return_type = return_type;
    }

    if (from_date || to_date) {
      query.return_date = {};
      if (from_date) {
        query.return_date.$gte = new Date(from_date);
      }
      if (to_date) {
        query.return_date.$lte = new Date(to_date);
      }
    }

    // Global search
    if (search) {
      query.$or = [
        { return_number: { $regex: search, $options: 'i' } },
        { product_name: { $regex: search, $options: 'i' } },
        { supplier_name: { $regex: search, $options: 'i' } },
        { batch_number: { $regex: search, $options: 'i' } },
        { debit_note_number: { $regex: search, $options: 'i' } },
        { original_purchase_number: { $regex: search, $options: 'i' } },
      ];
    }

    const returns = await PurchaseReturn.find(query)
      .sort({ return_date: -1, created_at: -1 })
      .lean();

    // Calculate summary statistics
    const summary = {
      total_returns: returns.length,
      total_return_amount: returns.reduce((sum, r) => sum + r.final_return_amount, 0),
      total_refunded: returns.reduce((sum, r) => sum + r.refunded_amount, 0),
      total_pending_refund: returns.reduce((sum, r) => sum + r.pending_refund_amount, 0),
      pending_count: returns.filter(r => r.refund_status === 'Pending').length,
      partial_count: returns.filter(r => r.refund_status === 'Partial').length,
      completed_count: returns.filter(r => r.refund_status === 'Completed').length,
      rejected_count: returns.filter(r => r.refund_status === 'Rejected').length,
      approval_pending_count: returns.filter(r => r.approval_status === 'Pending').length,
      approved_count: returns.filter(r => r.approval_status === 'Approved').length,
      rejected_approval_count: returns.filter(r => r.approval_status === 'Rejected').length,
    };

    return NextResponse.json({
      success: true,
      returns,
      summary,
    });
  } catch (error) {
    console.error('Error fetching purchase returns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase returns' },
      { status: 500 }
    );
  }
}

// POST /api/purchase-returns - Create a new purchase return
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'product_name',
      'returned_quantity',
      'unit',
      'batch_number',
      'supplier_name',
      'return_reason',
      'return_type',
      'unit_price',
      'final_return_amount',
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Calculate total_return_amount if not provided
    if (!body.total_return_amount) {
      body.total_return_amount = body.returned_quantity * body.unit_price;
    }

    // Calculate final_return_amount if not provided
    if (!body.final_return_amount) {
      const total = body.total_return_amount || (body.returned_quantity * body.unit_price);
      const tax = body.tax_amount || 0;
      const discount = body.discount_amount || 0;
      body.final_return_amount = total + tax - discount;
    }

    // Set refunded_amount default
    if (body.refunded_amount === undefined) {
      body.refunded_amount = 0;
    }

    // Set created_by
    body.created_by = decoded.userId;

    const purchaseReturn = new PurchaseReturn(body);
    await purchaseReturn.save();

    return NextResponse.json({
      success: true,
      message: 'Purchase return created successfully',
      return: purchaseReturn,
    });
  } catch (error) {
    console.error('Error creating purchase return:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create purchase return' },
      { status: 500 }
    );
  }
}
