import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Customer, { ICustomer } from '@/models/Customer';
import { requireUserAuth } from '@/lib/authMiddleware';
import { Model } from 'mongoose';

export const dynamic = 'force-dynamic';

// GET - List all customers with filtering
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Use the proper authentication middleware
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const state = searchParams.get('state');
    const business_type = searchParams.get('business_type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build filter object
    interface CustomerFilter {
      status?: string;
      state?: RegExp;
      'address.state'?: string;
      business_type?: string;
      $or?: Array<Record<string, RegExp>>;
    }
    const filter: CustomerFilter = {};
    
    if (status && status !== 'all') filter.status = status;
    if (state && state !== 'all') filter.state = new RegExp(state, 'i');
    if (business_type) filter.business_type = business_type;
    
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { business_name: new RegExp(search, 'i') },
        { gstin: new RegExp(search, 'i') },
      ];
    }

    const CustomerModel = Customer as Model<ICustomer>;
    
    // Get total count for pagination
    const total = await CustomerModel.countDocuments(filter);
    
    // Get customers with pagination
    const customers = await CustomerModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Import Invoice model to get outstanding balance
    const Invoice = (await import('@/models/Invoice')).default;
    
    // Calculate outstanding balance for each customer
    const customersWithBalance = await Promise.all(
      customers.map(async (customer) => {
        const invoices = await Invoice.find({
          customer_id: customer._id,
          status: { $ne: 'Cancelled' }
        }).select('balance_due').lean();
        
        const outstanding_balance = invoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
        
        return {
          ...customer,
          outstanding_balance,
        };
      })
    );

    return NextResponse.json({
      success: true,
      customers: customersWithBalance,
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
    
    // Use the proper authentication middleware
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const customerData = await request.json();

    // Validate required fields
    if (!customerData.name || !customerData.phone) {
      return NextResponse.json(
        { error: 'Name and phone number are required' },
        { status: 400 }
      );
    }

    // Convert empty email to undefined to work with sparse index
    if (customerData.email === '' || customerData.email === null) {
      customerData.email = undefined;
    }

    // Check if customer with email already exists (only if email is provided)
    const CustomerModel = Customer as Model<ICustomer>;
    if (customerData.email) {
      const existingCustomer = await CustomerModel.findOne({ email: customerData.email });
      
      if (existingCustomer) {
        return NextResponse.json(
          { error: 'Customer with this email already exists' },
          { status: 400 }
        );
      }
    }

    // Create customer with defaults
    const customer = new CustomerModel({
      ...customerData,
      credit_limit: customerData.credit_limit || 0,
      credit_days: customerData.credit_days || 30,
      status: customerData.status || 'Active',
      business_type: customerData.business_type || 'Individual',
    });

    await customer.save();

    return NextResponse.json({
      success: true,
      message: 'Customer created successfully',
      customer,
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.message 
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
