import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice, { IInvoice } from '@/models/Invoice';
import Sale, { ISale } from '@/models/Sale';
import Product, { IProduct } from '@/models/Product';
import Customer, { ICustomer } from '@/models/Customer';
import User from '@/models/User';
import CompanySettings, { ICompanySettings } from '@/models/CompanySettings';
import { verifyToken } from '@/lib/auth';
import { Model } from 'mongoose';

// Helper function to calculate GST
const calculateGST = (amount: number, gstRate: number, isInterState: boolean) => {
  const taxAmount = (amount * gstRate) / 100;
  
  if (isInterState) {
    return {
      cgst: 0,
      sgst: 0,
      igst: taxAmount,
    };
  } else {
    return {
      cgst: taxAmount / 2,
      sgst: taxAmount / 2,
      igst: 0,
    };
  }
};

// Helper function to generate invoice number
const generateInvoiceNumber = async (prefix: string, counter: number) => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  return `${prefix}${year}${month}${String(counter).padStart(4, '0')}`;
};

// GET - List all invoices with filtering
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
    const status = searchParams.get('status');
    const customerId = searchParams.get('customer_id');
    const salesmanId = searchParams.get('salesman_id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build filter object
    const filter: any = {};
    
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
      filter.salesman_id = decoded.userId;
    }

    const InvoiceModel = Invoice as Model<IInvoice>;
    
    // Get total count for pagination
    const total = await InvoiceModel.countDocuments(filter);
    
    // Get invoices with pagination
    const invoices = await InvoiceModel.find(filter)
      .populate('customer_id', 'name email phone')
      .populate('salesman_id', 'name email')
      .sort({ invoice_date: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

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
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { sale_id, customer_id, due_days = 30 } = await request.json();

    if (!sale_id) {
      return NextResponse.json({ error: 'Sale ID is required' }, { status: 400 });
    }

    // Get sale details
    const SaleModel = Sale as Model<ISale>;
    const sale = await SaleModel.findById(sale_id)
      .populate('product_id')
      .populate('salesman_id');

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Get customer details
    const CustomerModel = Customer as Model<ICustomer>;
    let customer;
    if (customer_id) {
      customer = await CustomerModel.findById(customer_id);
    } else {
      // Create default customer if not provided
      customer = await CustomerModel.create({
        name: 'Walk-in Customer',
        email: `walkin_${Date.now()}@leaftrack.com`,
        status: 'Active',
      });
    }

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get company settings
    const CompanySettingsModel = CompanySettings as Model<ICompanySettings>;
    let companySettings = await CompanySettingsModel.findOne();
    if (!companySettings) {
      // Create default company settings
      companySettings = await CompanySettingsModel.create({
        company_name: 'SohagTea Manage',
        address: '123 Tea Garden Road',
        city: 'Kolkata',
        state: 'West Bengal',
        pincode: '700001',
        country: 'India',
        phone: '+91-9876543210',
        email: 'info@sohagtea.com',
        gstin: '19AAAAA0000A1Z5',
        pan: 'AAAAA0000A',
      });
    }

    // Calculate GST (inter-state vs intra-state)
    const isInterState = customer.state && 
      customer.state.toLowerCase() !== companySettings.state.toLowerCase();

    // Calculate invoice items
    const product = sale.product_id as any; // Populated product
    const unitPrice = sale.unit_price || product.price;
    const quantity = sale.quantity_sold;
    const discount = sale.discount_percentage || 0;
    const taxableAmount = unitPrice * quantity * (1 - discount / 100);
    
    const gstCalculation = calculateGST(
      taxableAmount, 
      product.gst_rate, 
      isInterState
    );

    const invoiceItem = {
      product_id: product._id,
      product_name: product.name,
      hsn_code: product.hsn_code,
      quantity,
      unit_price: unitPrice,
      discount_percentage: discount,
      taxable_amount: taxableAmount,
      gst_rate: product.gst_rate,
      cgst_amount: gstCalculation.cgst,
      sgst_amount: gstCalculation.sgst,
      igst_amount: gstCalculation.igst,
      total_amount: taxableAmount + gstCalculation.cgst + gstCalculation.sgst + gstCalculation.igst,
    };

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(
      companySettings.invoice_prefix,
      companySettings.invoice_counter
    );

    // Create invoice
    const invoice = new Invoice({
      invoice_number: invoiceNumber,
      sale_id: sale._id,
      customer_id: customer._id,
      salesman_id: sale.salesman_id._id,
      due_date: new Date(Date.now() + due_days * 24 * 60 * 60 * 1000),
      
      customer_details: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        state: customer.state,
        gstin: customer.gstin,
      },
      
      company_details: {
        name: companySettings.company_name,
        address: `${companySettings.address}, ${companySettings.city}, ${companySettings.state} - ${companySettings.pincode}`,
        gstin: companySettings.gstin,
        phone: companySettings.phone,
        email: companySettings.email,
      },
      
      items: [invoiceItem],
      
      subtotal: unitPrice * quantity,
      total_discount: (unitPrice * quantity * discount) / 100,
      taxable_amount: taxableAmount,
      total_cgst: gstCalculation.cgst,
      total_sgst: gstCalculation.sgst,
      total_igst: gstCalculation.igst,
      total_tax: gstCalculation.cgst + gstCalculation.sgst + gstCalculation.igst,
      grand_total: invoiceItem.total_amount,
      balance_due: invoiceItem.total_amount,
      
      terms_and_conditions: companySettings.invoice_terms,
    });

    await invoice.save();

    // Update company settings counter
    await CompanySettingsModel.findByIdAndUpdate(companySettings._id, {
      $inc: { invoice_counter: 1 }
    });

    // Mark sale as invoice generated
    await SaleModel.findByIdAndUpdate(sale._id, {
      invoice_generated: true
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice created successfully',
      invoice,
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}
