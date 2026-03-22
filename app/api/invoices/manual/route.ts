import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import CompanySettings from '@/models/CompanySettings';
import { requireAdminAuth, DecodedToken } from '@/lib/authMiddleware';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

async function updateCustomerOutstandingBalance(customerId: mongoose.Types.ObjectId | string, session: mongoose.ClientSession) {
  const InvoiceModel = Invoice;
  const CustomerModel = Customer;

  const invoices = await InvoiceModel.find({
    customer_id: customerId,
    status: { $ne: 'Cancelled' },
  }).select('balance_due').session(session).lean();

  const outstandingBalance = invoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

  await CustomerModel.findByIdAndUpdate(
    customerId,
    { $set: { outstanding_balance: outstandingBalance } },
    { session }
  );
}

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
      items,
      manual_discount,
      discount_mode,
      discount_value,
      invoice_sequence,
      custom_invoice_number
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

        // Get company settings for invoice
        const companySettings = await CompanySettings.findOne().session(session);
        if (!companySettings) {
          throw new Error('Company settings not found. Please configure company details first.');
        }

        // Validate all products exist and calculate totals
        let subtotal = 0;
        let totalTax = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        const validatedItems = [];

        for (const item of items) {
          const product = await Product.findById(item.product_id).session(session);
          if (!product) {
            throw new Error(`Product ${item.product_name} not found`);
          }

          // Use the pre-calculated values from the client (important for GST inclusive mode)
          // The client already handles GST calculation correctly based on the mode
          const taxableAmount = item.taxable_amount || (item.quantity * item.unit_price);
          const taxAmount = item.tax_amount || ((taxableAmount * item.gst_rate) / 100);
          const cgstAmount = taxAmount / 2; // Split GST into CGST and SGST
          const sgstAmount = taxAmount / 2;
          const totalAmount = item.total_amount || (taxableAmount + taxAmount);

          subtotal += taxableAmount;
          totalTax += taxAmount;
          totalCgst += cgstAmount;
          totalSgst += sgstAmount;

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
            cgst_amount: cgstAmount,
            sgst_amount: sgstAmount,
            igst_amount: 0,
            total_amount: totalAmount
          });
        }

        const totalDiscount = Math.max(0, Number(manual_discount) || 0);
        const grandTotal = Math.max(0, subtotal + totalTax - totalDiscount);

        // Generate invoice number
        let invoiceNumber: string;
        
        if (custom_invoice_number) {
          // Use custom invoice number if provided
          invoiceNumber = custom_invoice_number.trim();
          
          // Check if custom invoice number already exists
          const existingInvoice = await Invoice.findOne({ invoice_number: invoiceNumber }).session(session);
          if (existingInvoice) {
            throw new Error(`Invoice number ${invoiceNumber} already exists. Please use a different number.`);
          }
        } else {
          // Generate invoice number in format: INV-YYYYMMDD-XXXX
          // Find the highest sequence number from existing invoices
          const allInvoices = await Invoice.find({}).select('invoice_number').session(session);
          let maxSequence = 0;
          allInvoices.forEach(inv => {
            const match = inv.invoice_number.match(/(\d{4})$/);
            if (match) {
              const seq = parseInt(match[1]);
              if (seq > maxSequence) {
                maxSequence = seq;
              }
            }
          });
          
          // Allow custom sequence number or use next available
          const customSequence = invoice_sequence ? parseInt(invoice_sequence.toString()) : null;
          const sequenceNumber = customSequence || (maxSequence + 1);
          
          const dateStr = new Date(invoice_date).toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
          invoiceNumber = `INV-${dateStr}-${sequenceNumber.toString().padStart(4, '0')}`;
        }

        // Create manual invoice
        const invoice = new Invoice({
          invoice_number: invoiceNumber,
          invoice_type: 'Manual',
          manually_created: true, // Mark as manually created (makes sale_id optional)
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
          company_details: {
            name: companySettings.company_name,
            address: `${companySettings.address}, ${companySettings.city}, ${companySettings.state} ${companySettings.pincode}`,
            gstin: companySettings.gstin,
            phone: companySettings.phone,
            email: companySettings.email,
          },
          salesman_id: decoded.userId, // Admin creating the invoice
          items: validatedItems,
          subtotal: subtotal,
          total_discount: totalDiscount,
          discount_mode: discount_mode === 'percentage' ? 'percentage' : 'amount',
          discount_value: Math.max(0, Number(discount_value) || 0),
          taxable_amount: subtotal, // Required field - same as subtotal for now
          total_cgst: totalCgst, // CGST amount
          total_sgst: totalSgst, // SGST amount
          total_igst: 0, // For inter-state (not implemented yet)
          total_tax: totalTax, // Required field - using totalTax
          tax_amount: totalTax, // Keep for compatibility
          grand_total: grandTotal,
          paid_amount: 0,
          balance_due: grandTotal,
          status: 'Draft',
          payment_status: 'Pending',
          payment_terms: payment_terms || '30 days',
          notes: notes || '',
          created_by: decoded.userId,
        });

        await invoice.save({ session });

        await updateCustomerOutstandingBalance(customer._id as mongoose.Types.ObjectId, session);

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