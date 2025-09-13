import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Sale from '@/models/Sale';
// import Product from '@/models/Product';
import Customer from '@/models/Customer';
// import User from '@/models/User';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { IProduct } from '@/models/Product';
import { IUser } from '@/models/User';

// Type for populated sale document
interface PopulatedSale {
  _id: mongoose.Types.ObjectId;
  assignment_id: mongoose.Types.ObjectId;
  salesman_id: IUser;
  product_id: IProduct;
  customer_id?: mongoose.Types.ObjectId;
  quantity_sold: number;
  unit_price: number;
  discount_percentage: number;
  total_amount: number;
  sale_date: Date;
  payment_method?: 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Credit';
  invoice_generated: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const dynamic = 'force-dynamic';

// Helper function to calculate GST
// const calculateGST = (amount: number, gstRate: number, isInterState: boolean) => {
//   const taxAmount = (amount * gstRate) / 100;
  
//   if (isInterState) {
//     return {
//       cgst: 0,
//       sgst: 0,
//       igst: taxAmount,
//     };
//   } else {
//     return {
//       cgst: taxAmount / 2,
//       sgst: taxAmount / 2,
//       igst: 0,
//     };
//   }
// };

// Helper function to generate invoice number
// const generateInvoiceNumber = async (prefix: string, counter: number) => {
//   const year = new Date().getFullYear();
//   const month = String(new Date().getMonth() + 1).padStart(2, '0');
//   return `${prefix}${year}${month}${String(counter).padStart(4, '0')}`;
// };

// GET - List all invoices with filtering
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    let decoded: { role: string; id: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { role: string; id: string };
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customer_id');
    const salesmanId = searchParams.get('salesman_id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build filter object
    const filter: {
      status?: string;
      customer_id?: string | mongoose.Types.ObjectId;
      salesman_id?: string | mongoose.Types.ObjectId;
      invoice_date?: {
        $gte?: Date;
        $lte?: Date;
      };
    } = {};
    
    if (status) filter.status = status;
    if (customerId) filter.customer_id = customerId;
    if (salesmanId) filter.salesman_id = salesmanId;
    
    if (fromDate || toDate) {
      filter.invoice_date = {};
      if (fromDate) filter.invoice_date.$gte = new Date(fromDate);
      if (toDate) filter.invoice_date.$lte = new Date(toDate);
    }

    // If user is a salesman, filter by their ID
    if (decoded.role === 'Salesman') {
      filter.salesman_id = new mongoose.Types.ObjectId(decoded.id);
    }
    
    // Get total count for pagination
    const total = await Invoice.countDocuments(filter);
    
    // Get invoices with pagination and calculate payment status
    const invoices = await Invoice.aggregate([
      { $match: filter },
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
          payment_status: {
            $cond: [
              { $eq: ['$paid_amount', '$grand_total'] },
              'Paid',
              {
                $cond: [
                  { $gt: ['$paid_amount', 0] },
                  'Partial',
                  'Pending'
                ]
              }
            ]
          }
        }
      },
      { $sort: { invoice_date: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ]);

    return NextResponse.json({
      success: true,
      invoices,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCount: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

// POST - Create invoice from sale
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    try {
      jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { sale_id, customer_id, due_days = 30 } = await request.json();

    if (!sale_id) {
      return NextResponse.json({ error: 'Sale ID is required' }, { status: 400 });
    }

    // Get sale details
    const sale = await Sale.findById(sale_id)
      .populate('product_id')
      .populate('salesman_id')
      .lean();
      
    // Type assertion after checking if sale exists
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }
    
    const populatedSale = sale as unknown as PopulatedSale;

    // Get or create customer
    let customer;
    if (customer_id) {
      customer = await Customer.findById(customer_id).lean();
    } else {
      // Create default customer if not provided
      customer = await Customer.create({
        name: 'Walk-in Customer',
        email: `walkin_${Date.now()}@leaftrack.com`,
        status: 'Active',
        business_type: 'Individual',
        state: 'West Bengal',
      });
    }

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Company details (hardcoded for now)
    const companyDetails = {
      name: 'SohagTea Manage',
      address: '123 Tea Garden Road, Kolkata, West Bengal - 700001',
      gstin: '19AAAAA0000A1Z5',
      phone: '+91-9876543210',
      email: 'info@sohagtea.com',
    };

    // Calculate GST (simplified)
    const product = populatedSale.product_id;
    const unitPrice = populatedSale.unit_price || product.manufacturingCost || 0; // Use manufacturingCost as fallback
    const quantity = populatedSale.quantity_sold || 1;
    const discount = 0; // No discount for now
    const taxableAmount = unitPrice * quantity;
    const gstRate = product.gst_rate || 18;
    const gstAmount = (taxableAmount * gstRate) / 100;
    const totalAmount = taxableAmount + gstAmount;

    const invoiceItem = {
      product_id: product._id,
      product_name: product.name,
      hsn_code: product.hsn_code || '0000',
      quantity,
      unit_price: unitPrice,
      discount_percentage: discount,
      taxable_amount: taxableAmount,
      gst_rate: gstRate,
      cgst_amount: gstAmount / 2,
      sgst_amount: gstAmount / 2,
      igst_amount: 0,
      total_amount: totalAmount,
    };

    // Generate invoice number
    const invoiceCount = await Invoice.countDocuments();
    const invoiceNumber = `INV${new Date().getFullYear()}${String(invoiceCount + 1).padStart(4, '0')}`;

    // Create invoice
    const invoice = new Invoice({
      invoice_number: invoiceNumber,
      sale_id: sale._id,
      customer_id: customer._id,
      salesman_id: sale.salesman_id,
      due_date: new Date(Date.now() + due_days * 24 * 60 * 60 * 1000),
      
      customer_details: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        state: customer.state,
        gstin: customer.gstin,
      },
      
      company_details: companyDetails,
      
      items: [invoiceItem],
      
      subtotal: taxableAmount,
      total_discount: 0,
      taxable_amount: taxableAmount,
      total_cgst: gstAmount / 2,
      total_sgst: gstAmount / 2,
      total_igst: 0,
      total_tax: gstAmount,
      grand_total: totalAmount,
      balance_due: totalAmount,
      
      terms_and_conditions: 'Payment terms: Net 30 days',
    });

    await invoice.save();

    // Mark sale as invoice generated
    await Sale.findByIdAndUpdate(sale._id, {
      invoice_generated: true
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice created successfully',
      invoice,
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ 
      error: `Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
