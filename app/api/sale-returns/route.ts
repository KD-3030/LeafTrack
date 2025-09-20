import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import SaleReturn from '@/models/SaleReturn';
import Invoice from '@/models/Invoice';
import Product from '@/models/Product';
import { requireUserAuth, requireAdminAuth, DecodedToken } from '@/lib/authMiddleware';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// GET - List all sale returns
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Use standardized authentication
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const decoded = authResult as DecodedToken;
    const { searchParams } = new URL(request.url);
    
    // Build filter based on user role and query parameters
    const filter: Record<string, string | object> = {};
    
    // If user is a salesman, only show their returns
    if (decoded.role === 'Salesman') {
      filter.salesman_id = decoded.userId;
    }
    
    // Add additional filters from query params
    const status = searchParams.get('status');
    if (status) filter.status = status;
    
    const refund_status = searchParams.get('refund_status');
    if (refund_status) filter.refund_status = refund_status;
    
    const customer_id = searchParams.get('customer_id');
    if (customer_id) filter.customer_id = customer_id;
    
    // Date range filtering
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    if (start_date && end_date) {
      filter.return_date = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Get returns with populated references
    const returns = await SaleReturn.find(filter)
      .populate('customer_id', 'name email phone')
      .populate('salesman_id', 'name email')
      .populate('original_invoice_id', 'invoice_number invoice_date')
      .populate('original_sale_id', 'createdAt')
      .populate('approved_by', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await SaleReturn.countDocuments(filter);
    
    // Calculate summary statistics
    const summary = await SaleReturn.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total_returns: { $sum: 1 },
          total_refund_amount: { $sum: '$total_refund' },
          pending_returns: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
          },
          completed_returns: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
          },
          pending_refunds: {
            $sum: { $cond: [{ $eq: ['$refund_status', 'Pending'] }, '$total_refund', 0] }
          }
        }
      }
    ]);
    
    return NextResponse.json({
      success: true,
      returns,
      pagination: {
        current_page: page,
        per_page: limit,
        total: total,
        total_pages: Math.ceil(total / limit)
      },
      summary: summary[0] || {
        total_returns: 0,
        total_refund_amount: 0,
        pending_returns: 0,
        completed_returns: 0,
        pending_refunds: 0
      }
    });

  } catch (error) {
    console.error('Error fetching sale returns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sale returns' },
      { status: 500 }
    );
  }
}

// POST - Create a new sale return
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Use standardized authentication  
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const decoded = authResult as DecodedToken;
    
    const {
      original_invoice_id,
      return_items,
      refund_method,
      notes,
      is_manual_entry,
      customer_details,
      return_date,
      total_refund_amount,
      return_reason
    } = await request.json();

    // Handle manual entry vs invoice-based returns
    if (is_manual_entry) {
      // Manual entry validation
      if (!customer_details?.name || !return_items || return_items.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Customer details and return items are required for manual entries' },
          { status: 400 }
        );
      }

      // Generate return number
      const returnCount = await SaleReturn.countDocuments();
      const return_number = `RTN${String(returnCount + 1).padStart(6, '0')}`;

      // Create manual sale return record
      const saleReturn = new SaleReturn({
        return_number,
        customer_details: {
          name: customer_details.name,
          email: customer_details.email || '',
          phone: customer_details.phone || ''
        },
        return_date: return_date || new Date(),
        return_items: return_items.map((item: any) => ({
          product_name: item.product_name,
          quantity_returned: item.quantity_returned || item.quantity,
          unit_price: item.unit_price,
          total_amount: item.total_amount,
          condition: 'Good',
          reason: item.reason || return_reason || 'Manual entry return'
        })),
        total_refund_amount: total_refund_amount || return_items.reduce((sum: number, item: any) => sum + (item.total_amount || 0), 0),
        refund_method: refund_method || 'Cash',
        return_reason: return_reason || 'Manual entry return',
        notes: notes || '',
        status: 'Pending',
        refund_status: 'Pending',
        is_manual_entry: true,
        created_by: decoded.userId
      });

      const savedReturn = await saleReturn.save();

      return NextResponse.json({
        success: true,
        message: 'Manual sale return created successfully',
        data: savedReturn
      });
    } else {
      // Original invoice-based return logic
      if (!original_invoice_id || !return_items || return_items.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Invoice ID and return items are required' },
          { status: 400 }
        );
      }

      // Start transaction to ensure data consistency
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          // Find and validate the original invoice
          const invoice = await Invoice.findById(original_invoice_id)
            .populate('sale_id')
            .session(session);
          
          if (!invoice) {
            throw new Error('Original invoice not found');
          }

          // Validate return items against invoice items
          const invoiceItemsMap = new Map();
          invoice.items.forEach((item: any) => {
            invoiceItemsMap.set(item.product_id.toString(), item);
          });

          let subtotal = 0;
          let tax_amount = 0;
          
          for (const returnItem of return_items) {
            const invoiceItem = invoiceItemsMap.get(returnItem.product_id);
            if (!invoiceItem) {
              throw new Error(`Product ${returnItem.product_id} not found in original invoice`);
            }
            
            if (returnItem.return_quantity > invoiceItem.quantity) {
              throw new Error(`Cannot return more than originally purchased for product ${returnItem.product_name}`);
            }
            
            // Calculate refund amounts
            const itemSubtotal = returnItem.return_quantity * returnItem.unit_price;
            const itemTax = (itemSubtotal * (invoiceItem.gst_rate || 0)) / 100;
            
            subtotal += itemSubtotal;
            tax_amount += itemTax;
            
            returnItem.total_refund = itemSubtotal + itemTax;
          }

          // Create the sale return record
          const saleReturn = new SaleReturn({
            original_invoice_id,
            original_sale_id: invoice.sale_id,
            customer_id: invoice.customer_id,
            salesman_id: invoice.salesman_id,
            return_items,
            subtotal,
            tax_amount,
            total_refund: subtotal + tax_amount,
            refund_method,
            notes,
            status: 'Pending',
            refund_status: 'Pending'
          });

          await saleReturn.save({ session });

          // If items are in good condition, restore to inventory
          for (const returnItem of return_items) {
            if (returnItem.condition === 'Good') {
              await Product.findByIdAndUpdate(
                returnItem.product_id,
                { $inc: { totalStock: returnItem.return_quantity } },
                { session }
              );
            }
          }

        });

        await session.endSession();

        return NextResponse.json({
          success: true,
          message: 'Sale return created successfully',
          return_number: (await SaleReturn.findOne().sort({ createdAt: -1 }))?.return_number
        });

      } catch (transactionError) {
        await session.endSession();
        console.error('Transaction failed:', transactionError);
        
        return NextResponse.json(
          { 
            success: false, 
            error: transactionError instanceof Error ? transactionError.message : 'Failed to create sale return'
          },
          { status: 400 }
        );
      }
    }

  } catch (error) {
    console.error('Error creating sale return:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update sale return status (admin approval)
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    
    // Require admin authentication for status updates
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const decoded = authResult as DecodedToken;
    const {
      return_id,
      status,
      refund_status,
      admin_notes
    } = await request.json();

    if (!return_id) {
      return NextResponse.json(
        { success: false, error: 'Return ID is required' },
        { status: 400 }
      );
    }

    const updateData: Partial<{
      updatedAt: Date;
      status: string;
      admin_approval: boolean;
      approved_by: string;
      approval_date: Date;
      refund_status: string;
      notes: string;
    }> = { updatedAt: new Date() };
    
    if (status) {
      updateData.status = status;
      if (status === 'Completed' || status === 'Rejected') {
        updateData.admin_approval = status === 'Completed';
        updateData.approved_by = decoded.userId;
        updateData.approval_date = new Date();
      }
    }
    
    if (refund_status) {
      updateData.refund_status = refund_status;
    }
    
    if (admin_notes) {
      updateData.notes = admin_notes;
    }

    const updatedReturn = await SaleReturn.findByIdAndUpdate(
      return_id,
      updateData,
      { new: true, runValidators: true }
    ).populate('customer_id', 'name email');

    if (!updatedReturn) {
      return NextResponse.json(
        { success: false, error: 'Sale return not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Sale return updated successfully',
      return: updatedReturn
    });

  } catch (error) {
    console.error('Error updating sale return:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}