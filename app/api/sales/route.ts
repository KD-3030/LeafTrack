import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Sale from '@/models/Sale';
import Assignment from '@/models/Assignment';
// import Product from '@/models/Product';
import Customer from '@/models/Customer';
// import User from '@/models/User';
import { requireAuth } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

// GET - List all sales with enhanced filtering
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const decoded = authResult;

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
    interface SaleFilter {
      salesman_id?: string;
      customer_id?: string;
      invoice_generated?: boolean;
      sale_date?: {
        $gte?: Date;
        $lte?: Date;
      };
    }
    
    const filter: SaleFilter = {};
    
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
    if (decoded.role?.toLowerCase() === 'salesman') {
      filter.salesman_id = decoded.userId;
    }
    
    // Get total count for pagination
    const total = await Sale.countDocuments(filter);
    
    // Get sales with pagination and population
    const sales = await Sale.find(filter)
      .populate('assignment_id')
      .populate('salesman_id', 'name email')
      .populate('product_id', 'name manufacturingCost hsn_code gst_rate')
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
    
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const decoded = authResult;
    
    const saleData = await request.json();

    // Validate required fields
    if (!saleData.assignment_id || !saleData.quantity_sold || !saleData.unit_price) {
      return NextResponse.json({ 
        error: 'Assignment ID, quantity sold, and unit price are required' 
      }, { status: 400 });
    }

    // Verify assignment exists and get details
    const assignment = await Assignment.findById(saleData.assignment_id)
      .populate('productId', 'name manufacturingCost hsn_code gst_rate')
      .populate('salesman_id');

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check if user has permission to create sale for this assignment
    if (decoded.role?.toLowerCase() === 'salesman' && assignment.salesman_id._id.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized to create sale for this assignment' }, { status: 403 });
    }

    // Check if assignment has sufficient quantity
    if (saleData.quantity_sold > assignment.quantity) {
      return NextResponse.json({ 
        error: `Insufficient stock. Available: ${assignment.quantity} units` 
      }, { status: 400 });
    }

    // Handle customer creation/selection
    let customerId = saleData.customer_id;
    
    if (!customerId && saleData.customer_details) {
      // Create new customer if customer details are provided
      const customer = await Customer.create({
        name: saleData.customer_details.name,
        email: saleData.customer_details.email || `customer_${Date.now()}@leaftrack.com`,
        phone: saleData.customer_details.phone,
        address: saleData.customer_details.address,
        state: saleData.customer_details.state,
        gstin: saleData.customer_details.gstin,
        business_type: 'Individual',
        status: 'Active',
      });
      customerId = customer._id;
    }

    // Calculate total amount
    const unitPrice = saleData.unit_price;
    const quantity = saleData.quantity_sold;
    const discountPercentage = saleData.discount_percentage || 0;
    const totalAmount = unitPrice * quantity * (1 - discountPercentage / 100);

    // Create sale
    const productData = assignment.productId as unknown as { _id: string };
    const sale = new Sale({
      assignment_id: saleData.assignment_id,
      salesman_id: assignment.salesman_id._id,
      product_id: productData._id,
      customer_id: customerId,
      quantity_sold: quantity,
      unit_price: unitPrice,
      priceAtSale: assignment.sellingPricePerUnit, // Store the selling price from assignment
      discount_percentage: discountPercentage,
      total_amount: totalAmount,
      payment_method: saleData.payment_method || 'Cash',
      notes: saleData.notes,
    });

    await sale.save();

    // Update assignment quantity (reduce by sold quantity)
    assignment.quantity -= quantity;
    await assignment.save();

    // Populate the created sale for response
    await sale.populate([
      { path: 'assignment_id' },
      { path: 'salesman_id', select: 'name email' },
      { path: 'product_id', select: 'name manufacturingCost hsn_code gst_rate' },
      { path: 'customer_id', select: 'name email phone' }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Sale created successfully',
      sale,
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.message 
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
  }
}
