import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { verifyToken } from '@/lib/auth';

// GET /api/orders/[id] - Get a single order
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const order = await Order.findById(params.id).lean();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If salesman, only allow viewing their own orders
    if (decoded.role === 'salesman' && order.salesman_id.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

// PUT /api/orders/[id] - Update order (Admin: approve/reject/modify, Salesman: edit pending orders)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const order = await Order.findById(params.id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const body = await request.json();

    // Admin actions: approve/reject/modify
    if (decoded.role === 'admin') {
      // Update status if provided
      if (body.status) {
        if (!['pending', 'approved', 'rejected'].includes(body.status)) {
          return NextResponse.json(
            { error: 'Invalid status' },
            { status: 400 }
          );
        }

        order.status = body.status;
        order.reviewed_at = new Date();
        order.reviewed_by = decoded.userId;
        order.reviewer_name = decoded.name || 'Admin';

        if (body.status === 'rejected' && body.rejection_reason) {
          order.rejection_reason = body.rejection_reason;
        }
      }

      // Admin can modify order details
      if (body.items) {
        // Store original total if this is the first modification
        if (!order.admin_modified) {
          order.original_total = order.total_amount;
        }
        order.admin_modified = true;
        order.items = body.items;
      }

      if (body.subtotal !== undefined) order.subtotal = body.subtotal;
      if (body.tax_percentage !== undefined) order.tax_percentage = body.tax_percentage;
      if (body.tax_amount !== undefined) order.tax_amount = body.tax_amount;
      if (body.discount_amount !== undefined) order.discount_amount = body.discount_amount;
      if (body.total_amount !== undefined) order.total_amount = body.total_amount;
      if (body.admin_notes) order.admin_notes = body.admin_notes;
      if (body.delivery_date) order.delivery_date = body.delivery_date;
      if (body.payment_terms) order.payment_terms = body.payment_terms;

    } 
    // Salesman actions: only edit their own pending orders
    else if (decoded.role === 'salesman') {
      if (order.salesman_id.toString() !== decoded.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      if (order.status !== 'pending') {
        return NextResponse.json(
          { error: 'Cannot edit order after it has been reviewed' },
          { status: 400 }
        );
      }

      // Allow updating customer and item details
      if (body.customer_name) order.customer_name = body.customer_name;
      if (body.customer_contact) order.customer_contact = body.customer_contact;
      if (body.customer_address) order.customer_address = body.customer_address;
      if (body.customer_gstin) order.customer_gstin = body.customer_gstin;
      if (body.customer_email) order.customer_email = body.customer_email;
      if (body.items) order.items = body.items;
      if (body.subtotal !== undefined) order.subtotal = body.subtotal;
      if (body.tax_percentage !== undefined) order.tax_percentage = body.tax_percentage;
      if (body.tax_amount !== undefined) order.tax_amount = body.tax_amount;
      if (body.discount_amount !== undefined) order.discount_amount = body.discount_amount;
      if (body.total_amount !== undefined) order.total_amount = body.total_amount;
      if (body.notes) order.notes = body.notes;
    }

    await order.save();

    return NextResponse.json({
      success: true,
      message: decoded.role === 'admin' 
        ? `Order ${body.status || 'updated'} successfully` 
        : 'Order updated successfully',
      order,
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/[id] - Delete order (Salesman: only pending orders, Admin: any order)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const order = await Order.findById(params.id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Salesman can only delete their own pending orders
    if (decoded.role === 'salesman') {
      if (order.salesman_id.toString() !== decoded.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      if (order.status !== 'pending') {
        return NextResponse.json(
          { error: 'Cannot delete order after it has been reviewed' },
          { status: 400 }
        );
      }
    }

    await Order.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
