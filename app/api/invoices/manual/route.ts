import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import { requireAdminAuth, DecodedToken } from '@/lib/authMiddleware';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// POST - Create manual invoice
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Require admin authentication for manual invoice creation
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const decoded = authResult as DecodedToken;
    const {
      customer_id,
      invoice_date,
      due_date,
      payment_terms,
      notes,
      items
    } = await request.json();

    // Validate required fields
    if (!customer_id || !invoice_date || !due_date || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer, dates, and items are required' },
        { status: 400 }
      );
    }

    // Start transaction to ensure data consistency
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Validate customer exists
        const customer = await Customer.findById(customer_id).session(session);
        if (!customer) {
          throw new Error('Customer not found');
        }

        // Validate all products exist and calculate totals
        let subtotal = 0;
        let totalTax = 0;
        const validatedItems = [];

        for (const item of items) {
          const product = await Product.findById(item.product_id).session(session);
          if (!product) {
            throw new Error(`Product ${item.product_name} not found`);
          }

          // Validate and calculate amounts
          const taxableAmount = item.quantity * item.unit_price;
          const taxAmount = (taxableAmount * item.gst_rate) / 100;
          const totalAmount = taxableAmount + taxAmount;

          subtotal += taxableAmount;
          totalTax += taxAmount;

          validatedItems.push({
            product_id: product._id,
            product_name: product.name,
            hsn_code: product.hsn_code,
            quantity: item.quantity,
            unit_price: item.unit_price,
            price: item.unit_price, // For compatibility
            taxable_amount: taxableAmount,
            gst_rate: item.gst_rate,
            tax_amount: taxAmount,
            total_amount: totalAmount
          });
        }

        const grandTotal = subtotal + totalTax;

        // Generate invoice number
        const invoiceCount = await Invoice.countDocuments().session(session);
        const invoiceNumber = `INV-${Date.now()}-${(invoiceCount + 1).toString().padStart(4, '0')}`;

        // Create manual invoice
        const invoice = new Invoice({
          invoice_number: invoiceNumber,
          invoice_type: 'Manual',
          invoice_date: new Date(invoice_date),
          due_date: new Date(due_date),
          customer_id: customer._id,
          customer_details: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            gstin: customer.gstin,
            address: customer.address
          },
          salesman_id: decoded.userId, // Admin creating the invoice
          items: validatedItems,
          subtotal: subtotal,
          tax_amount: totalTax,
          grand_total: grandTotal,
          paid_amount: 0,
          balance_due: grandTotal,
          status: 'Draft',
          payment_status: 'Pending',
          payment_terms: payment_terms || '30 days',
          notes: notes || '',
          created_by: decoded.userId,
          manually_created: true
        });

        await invoice.save({ session });

        // Update product stock (if tracking stock for manual invoices)
        // Note: This depends on business logic - manual invoices might not affect stock
        // Uncomment below if manual invoices should reduce stock
        /*
        for (const item of validatedItems) {
          await Product.findByIdAndUpdate(
            item.product_id,
            { $inc: { totalStock: -item.quantity } },
            { session }
          );
        }
        */

      });

      await session.endSession();

      return NextResponse.json({
        success: true,
        message: 'Manual invoice created successfully'
      });

    } catch (transactionError) {
      await session.endSession();
      console.error('Transaction failed:', transactionError);
      
      return NextResponse.json(
        { 
          success: false, 
          error: transactionError instanceof Error ? transactionError.message : 'Failed to create manual invoice'
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error creating manual invoice:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}