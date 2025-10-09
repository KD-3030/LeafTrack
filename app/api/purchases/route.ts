import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Purchase from '@/models/Purchase';
import { verifyToken } from '@/lib/auth';

// GET /api/purchases - Get all purchases with filters
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
    const payment_status = searchParams.get('payment_status');
    const quality_check = searchParams.get('quality_check');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const search = searchParams.get('search');

    // Build query
    interface QueryType {
      supplier_name?: { $regex: string; $options: string };
      product_name?: { $regex: string; $options: string };
      payment_status?: string;
      quality_check?: string;
      purchase_date?: { $gte?: Date; $lte?: Date };
      $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
    }
    const query: QueryType = {};

    if (supplier_name) {
      query.supplier_name = { $regex: supplier_name, $options: 'i' };
    }

    if (product_name) {
      query.product_name = { $regex: product_name, $options: 'i' };
    }

    if (payment_status) {
      query.payment_status = payment_status;
    }

    if (quality_check) {
      query.quality_check = quality_check;
    }

    if (from_date || to_date) {
      query.purchase_date = {};
      if (from_date) {
        query.purchase_date.$gte = new Date(from_date);
      }
      if (to_date) {
        query.purchase_date.$lte = new Date(to_date);
      }
    }

    // Global search
    if (search) {
      query.$or = [
        { purchase_number: { $regex: search, $options: 'i' } },
        { product_name: { $regex: search, $options: 'i' } },
        { supplier_name: { $regex: search, $options: 'i' } },
        { batch_number: { $regex: search, $options: 'i' } },
        { invoice_number: { $regex: search, $options: 'i' } },
      ];
    }

    const purchases = await Purchase.find(query)
      .sort({ purchase_date: -1, created_at: -1 })
      .lean();

    // Calculate summary statistics
    const summary = {
      total_purchases: purchases.length,
      total_amount: purchases.reduce((sum, p) => sum + p.final_amount, 0),
      total_paid: purchases.reduce((sum, p) => sum + p.paid_amount, 0),
      total_due: purchases.reduce((sum, p) => sum + p.due_amount, 0),
      pending_count: purchases.filter(p => p.payment_status === 'Pending').length,
      partial_count: purchases.filter(p => p.payment_status === 'Partial').length,
      paid_count: purchases.filter(p => p.payment_status === 'Paid').length,
    };

    return NextResponse.json({
      success: true,
      purchases,
      summary,
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchases' },
      { status: 500 }
    );
  }
}

// POST /api/purchases - Create a new purchase
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
      'quantity',
      'unit',
      'batch_number',
      'supplier_name',
      'unit_price',
      'final_amount',
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Calculate total_amount if not provided
    if (!body.total_amount) {
      body.total_amount = body.quantity * body.unit_price;
    }

    // Calculate final_amount if not provided
    if (!body.final_amount) {
      const total = body.total_amount || (body.quantity * body.unit_price);
      const tax = body.tax_amount || 0;
      const discount = body.discount_amount || 0;
      body.final_amount = total + tax - discount;
    }

    // Set paid_amount default
    if (body.paid_amount === undefined) {
      body.paid_amount = 0;
    }

    // Set created_by
    body.created_by = decoded.userId;

    const purchase = new Purchase(body);
    await purchase.save();

    return NextResponse.json({
      success: true,
      message: 'Purchase created successfully',
      purchase,
    });
  } catch (error) {
    console.error('Error creating purchase:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create purchase' },
      { status: 500 }
    );
  }
}
