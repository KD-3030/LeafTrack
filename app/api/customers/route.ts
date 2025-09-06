import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Customer, { ICustomer } from '@/models/Customer';
import { verifyToken } from '@/lib/auth';
import { Model } from 'mongoose';

// GET - List all customers
export async function GET(request: NextRequest) {
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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const state = searchParams.get('state');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build filter object
    const filter: any = {};
    
    if (status) filter.status = status;
    if (state) filter.state = new RegExp(state, 'i');
    
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { business_name: new RegExp(search, 'i') },
      ];
    }

    const CustomerModel = Customer as Model<ICustomer>;
    
    // Get total count for pagination
    const total = await CustomerModel.countDocuments(filter);
    
    // Get customers with pagination
    const customers = await CustomerModel.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      success: true,
      customers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCount: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

// POST - Create new customer
export async function POST(request: NextRequest) {
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

    const customerData = await request.json();

    // Validate required fields
    if (!customerData.name || !customerData.email) {
      return NextResponse.json({ 
        error: 'Name and email are required' 
      }, { status: 400 });
    }

    const CustomerModel = Customer as Model<ICustomer>;
    
    // Check if customer with email already exists
    const existingCustomer = await CustomerModel.findOne({ 
      email: customerData.email 
    });
    
    if (existingCustomer) {
      return NextResponse.json({ 
        error: 'Customer with this email already exists' 
      }, { status: 409 });
    }

    // Create new customer
    const customer = new CustomerModel(customerData);
    await customer.save();

    return NextResponse.json({
      success: true,
      message: 'Customer created successfully',
      customer,
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.message 
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
