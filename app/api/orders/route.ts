import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { normalizeRoleId } from '@/lib/roles';
import mongoose from 'mongoose';

// GET /api/orders - Get all orders (filtered by role)
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
    const status = searchParams.get('status');
    const customer_name = searchParams.get('customer_name');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const search = searchParams.get('search');

    // Build query based on user role
    interface QueryType {
      salesman_id?: string | { $in: string[] };
      status?: string;
      customer_name?: { $regex: string; $options: string };
      order_date?: { $gte?: Date; $lte?: Date };
      $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
    }
    const query: QueryType = {};

    const roleId = normalizeRoleId(decoded.role);
    if (roleId === 'secondary_executive') {
      query.salesman_id = decoded.userId;
    } else if (roleId === 'primary_executive') {
      const teamMembers = await User.find({
        managerId: decoded.userId,
        role: 'SecondaryExecutive',
        approval_status: 'approved',
      }).select('_id');
        query.salesman_id = {
          $in: [decoded.userId, ...teamMembers.map((member) => (member._id as mongoose.Types.ObjectId).toString())],
      };
    }

    // Apply filters
    if (status && status !== 'all') {
      query.status = status;
    }

    if (customer_name) {
      query.customer_name = { $regex: customer_name, $options: 'i' };
    }

    if (from_date || to_date) {
      query.order_date = {};
      if (from_date) {
        query.order_date.$gte = new Date(from_date);
      }
      if (to_date) {
        query.order_date.$lte = new Date(to_date);
      }
    }

    // Global search
    if (search) {
      query.$or = [
        { order_number: { $regex: search, $options: 'i' } },
        { customer_name: { $regex: search, $options: 'i' } },
        { salesman_name: { $regex: search, $options: 'i' } },
        { customer_contact: { $regex: search, $options: 'i' } },
      ];
    }

    const orders = await Order.find(query)
      .sort({ order_date: -1, submitted_at: -1 })
      .lean();

    // Calculate summary statistics
    const pendingForAdmin = orders.filter((o) => o.status === 'pending');
    const pendingForPrimary = orders.filter((o) => o.status === 'pending_primary');

    const summary = {
      total_orders: orders.length,
      pending_count: pendingForAdmin.length,
      primary_review_count: pendingForPrimary.length,
      approved_count: orders.filter(o => o.status === 'approved').length,
      rejected_count: orders.filter(o => o.status === 'rejected').length,
      total_value: orders.reduce((sum, o) => sum + o.total_amount, 0),
      pending_value: (roleId === 'admin' ? pendingForAdmin : [...pendingForAdmin, ...pendingForPrimary])
        .reduce((sum, o) => sum + o.total_amount, 0),
      approved_value: orders.filter(o => o.status === 'approved').reduce((sum, o) => sum + o.total_amount, 0),
    };

    return NextResponse.json({
      success: true,
      orders,
      summary,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create a new order
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

    const roleId = normalizeRoleId(decoded.role);
    if (roleId !== 'secondary_executive' && roleId !== 'primary_executive') {
      return NextResponse.json(
        { error: 'Only executives can create orders' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'customer_name',
      'customer_contact',
      'items',
      'subtotal',
      'total_amount',
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate items
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Order must have at least one item' },
        { status: 400 }
      );
    }

    const isSecondaryExecutive = roleId === 'secondary_executive';

    // Create order
    const order = new Order({
      ...body,
      salesman_id: decoded.userId,
      salesman_name: decoded.name || 'Unknown',
      // Secondary orders are reviewed by primary executives first.
      status: isSecondaryExecutive ? 'pending_primary' : 'pending',
      submitted_at: new Date(),
    });

    await order.save();

    return NextResponse.json({
      success: true,
      message: isSecondaryExecutive
        ? 'Order submitted successfully and is pending primary executive review'
        : 'Order submitted successfully and is pending admin approval',
      order,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
