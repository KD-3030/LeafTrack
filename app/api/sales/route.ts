import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Sale, { ISale } from '@/models/Sale';
import Assignment from '@/models/Assignment';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { Model } from 'mongoose';

// GET - List all sales with enhanced filtering
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
    const salesmanId = searchParams.get('salesman_id');
    const customerId = searchParams.get('customer_id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const invoiceGenerated = searchParams.get('invoice_generated');

    // Build filter object
    const filter: any = {};
    
    if (salesmanId) filter.salesman_id = salesmanId;
    if (customerId) filter.customer_id = customerId;
    if (invoiceGenerated !== null) {
      filter.invoice_generated = invoiceGenerated === 'true';
    }
    
    if (fromDate || toDate) {
      filter.sale_date = {};
      if (fromDate) filter.sale_date.$gte = new Date(fromDate);
      if (toDate) filter.sale_date.$lte = new Date(toDate);
    }

    // If user is a salesman, filter by their ID
    if (decoded.role === 'Salesman') {
      filter.salesman_id = decoded.userId;
    }

    const SaleModel = Sale as Model<ISale>;
    
    // Get total count for pagination
    const total = await SaleModel.countDocuments(filter);
    
    // Get sales with pagination and population
    const sales = await SaleModel.find(filter)
      .populate('assignment_id')
      .populate('salesman_id', 'name email')
      .populate('product_id', 'name price hsn_code gst_rate')
      .populate('customer_id', 'name email phone')
      .sort({ sale_date: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      success: true,
      sales,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCount: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

// POST - Create new sale with customer integration
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

    const saleData = await request.json();

    // Validate required fields
    if (!saleData.assignment_id || !saleData.quantity_sold || !saleData.unit_price) {
      return NextResponse.json({ 
        error: 'Assignment ID, quantity sold, and unit price are required' 
      }, { status: 400 });
    }

    // Verify assignment exists and get details
    const AssignmentModel = Assignment as Model<any>;
    const assignment = await AssignmentModel.findById(saleData.assignment_id)
      .populate('product_id')
      .populate('salesman_id');

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check if user has permission to create sale for this assignment
    if (decoded.role === 'Salesman' && assignment.salesman_id._id.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized to create sale for this assignment' }, { status: 403 });
    }

    // Handle customer creation/selection
    let customerId = saleData.customer_id;
    
    if (!customerId && saleData.customer_details) {
      // Create new customer if customer details are provided
      const CustomerModel = Customer as Model<any>;
      const customer = await CustomerModel.create({
        name: saleData.customer_details.name,
        email: saleData.customer_details.email || `customer_${Date.now()}@leaftrack.com`,
        phone: saleData.customer_details.phone,
        address: saleData.customer_details.address,
        state: saleData.customer_details.state,
        gstin: saleData.customer_details.gstin,
      });
      customerId = customer._id;
    }

    // Calculate total amount
    const unitPrice = saleData.unit_price;
    const quantity = saleData.quantity_sold;
    const discountPercentage = saleData.discount_percentage || 0;
    const totalAmount = unitPrice * quantity * (1 - discountPercentage / 100);

    // Create sale
    const SaleModel = Sale as Model<ISale>;
    const sale = new SaleModel({
      assignment_id: saleData.assignment_id,
      salesman_id: assignment.salesman_id._id,
      product_id: assignment.product_id._id,
      customer_id: customerId,
      quantity_sold: quantity,
      unit_price: unitPrice,
      discount_percentage: discountPercentage,
      total_amount: totalAmount,
      payment_method: saleData.payment_method || 'Cash',
      notes: saleData.notes,
    });

    await sale.save();

    // Populate the created sale for response
    await sale.populate([
      { path: 'assignment_id' },
      { path: 'salesman_id', select: 'name email' },
      { path: 'product_id', select: 'name price hsn_code gst_rate' },
      { path: 'customer_id', select: 'name email phone' }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Sale created successfully',
      sale,
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.message 
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
  }
}
