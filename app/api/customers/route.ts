import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Customer, { ICustomer } from '@/models/Customer';
import { requireUserAuth } from '@/lib/authMiddleware';
import { Model } from 'mongoose';
import User from '@/models/User';
import { normalizeRoleId } from '@/lib/roles';

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

    const currentUser = await User.findById(authResult.userId).select('role managerId');
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const roleId = normalizeRoleId(currentUser.role);

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
      primary_executive_id?: string;
      secondary_executive_id?: string;
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

    if (roleId === 'primary_executive') {
      filter.primary_executive_id = authResult.userId;
    } else if (roleId === 'secondary_executive') {
      if (!currentUser.managerId) {
        return NextResponse.json({ error: 'Secondary executive is not assigned to a primary executive' }, { status: 400 });
      }
      filter.primary_executive_id = currentUser.managerId.toString();
      filter.secondary_executive_id = authResult.userId;
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

    const currentUser = await User.findById(authResult.userId).select('role managerId');
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const roleId = normalizeRoleId(currentUser.role);

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

    let primaryExecutiveId: string | undefined;
    let secondaryExecutiveId: string | undefined;

    if (roleId === 'primary_executive') {
      primaryExecutiveId = authResult.userId;
      if (customerData.secondary_executive_id) {
        const subordinate = await User.findById(customerData.secondary_executive_id).select('managerId role');
        if (!subordinate || normalizeRoleId(subordinate.role) !== 'secondary_executive' || subordinate.managerId?.toString() !== authResult.userId) {
          return NextResponse.json({ error: 'secondary_executive_id must belong to your team' }, { status: 400 });
        }
        secondaryExecutiveId = customerData.secondary_executive_id;
      }
    } else if (roleId === 'secondary_executive') {
      if (!currentUser.managerId) {
        return NextResponse.json({ error: 'Secondary executive is not assigned to a primary executive' }, { status: 400 });
      }
      primaryExecutiveId = currentUser.managerId.toString();
      secondaryExecutiveId = authResult.userId;
    } else if (roleId === 'admin') {
      if (customerData.primary_executive_id) {
        const primary = await User.findById(customerData.primary_executive_id).select('role');
        if (!primary || normalizeRoleId(primary.role) !== 'primary_executive') {
          return NextResponse.json({ error: 'primary_executive_id must belong to a primary executive' }, { status: 400 });
        }
        primaryExecutiveId = customerData.primary_executive_id;
      }

      if (customerData.secondary_executive_id) {
        const secondary = await User.findById(customerData.secondary_executive_id).select('role managerId');
        if (!secondary || normalizeRoleId(secondary.role) !== 'secondary_executive') {
          return NextResponse.json({ error: 'secondary_executive_id must belong to a secondary executive' }, { status: 400 });
        }
        if (primaryExecutiveId && secondary.managerId?.toString() !== primaryExecutiveId) {
          return NextResponse.json({ error: 'Secondary executive is not mapped to selected primary executive' }, { status: 400 });
        }
        secondaryExecutiveId = customerData.secondary_executive_id;
      }
    }

    // Create customer with defaults
    const customer = new CustomerModel({
      ...customerData,
      credit_limit: customerData.credit_limit || 0,
      credit_days: customerData.credit_days || 30,
      outstanding_balance: customerData.outstanding_balance || 0,
      status: customerData.status || 'Active',
      business_type: customerData.business_type || 'Individual',
      primary_executive_id: primaryExecutiveId,
      secondary_executive_id: secondaryExecutiveId,
      created_by: authResult.userId,
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
