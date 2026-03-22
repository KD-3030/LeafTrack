import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { normalizeRoleId } from '@/lib/roles';
import mongoose from 'mongoose';

async function canPrimaryAccessOrder(primaryId: string, salesmanId: string): Promise<boolean> {
  if (salesmanId === primaryId) return true;

  const secondary = await User.findOne({
    _id: salesmanId,
    managerId: primaryId,
    role: 'SecondaryExecutive',
    approval_status: 'approved',
  }).select('_id').lean();

  return Boolean(secondary);
}

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

    const roleId = normalizeRoleId(decoded.role);
    if (roleId === 'secondary_executive' && order.salesman_id.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    if (roleId === 'primary_executive') {
      const allowed = await canPrimaryAccessOrder(decoded.userId, order.salesman_id.toString());
      if (!allowed) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
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

    console.log('PUT /api/orders/[id] - User:', decoded.userId, 'Role:', decoded.role);

    const order = await Order.findById(params.id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const body = await request.json();
    console.log('PUT /api/orders/[id] - Body:', JSON.stringify(body));

    const roleId = normalizeRoleId(decoded.role);

    // Admin actions: approve/reject/modify
    if (roleId === 'admin') {
      // Update status if provided
      if (body.status) {
        if (!['approved', 'rejected'].includes(body.status)) {
          return NextResponse.json(
            { error: 'Invalid status' },
            { status: 400 }
          );
        }

        order.status = body.status;
        order.reviewed_at = new Date();
        order.reviewed_by = new mongoose.Types.ObjectId(decoded.userId);
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
    // Secondary executive actions: edit only own orders before primary review.
    else if (roleId === 'secondary_executive') {
      if (order.salesman_id.toString() !== decoded.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      if (order.status !== 'pending_primary') {
        return NextResponse.json(
          { error: 'Cannot edit order after it has been reviewed by primary executive' },
          { status: 400 }
        );
      }

      if (body.status) {
        return NextResponse.json(
          { error: 'Secondary executives cannot submit directly to admin' },
          { status: 403 }
        );
      }

      // Allow updating customer and item details.
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
    // Primary executive actions:
    // 1) manage own orders before admin review
    // 2) review secondary orders and forward to admin
    else if (roleId === 'primary_executive') {
      const isOwnOrder = order.salesman_id.toString() === decoded.userId;
      const isTeamOrder = await canPrimaryAccessOrder(decoded.userId, order.salesman_id.toString());

      if (!isTeamOrder) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Team-review action: primary can forward team order to admin.
      if (!isOwnOrder && body.status) {
        if (order.status !== 'pending_primary') {
          return NextResponse.json(
            { error: 'Only orders pending primary review can be forwarded to admin' },
            { status: 400 }
          );
        }

        if (body.status !== 'pending') {
          return NextResponse.json(
            { error: 'Primary executive can only forward team orders to admin approval' },
            { status: 400 }
          );
        }

        order.status = 'pending';
        order.reviewed_at = new Date();
        order.reviewed_by = new mongoose.Types.ObjectId(decoded.userId);
        order.reviewer_name = decoded.name || 'Primary Executive';
        if (body.admin_notes) order.admin_notes = body.admin_notes;
      } else {
        if (order.status !== 'pending') {
          return NextResponse.json(
            { error: 'Cannot edit order after it has been reviewed' },
            { status: 400 }
          );
        }

        if (!isOwnOrder) {
          return NextResponse.json(
            { error: 'Only your own pending orders can be edited' },
            { status: 403 }
          );
        }

        // Own-order edits before admin review.
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
    } else {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await order.save();

    console.log('PUT /api/orders/[id] - Order updated successfully:', order._id, 'Status:', order.status);

    return NextResponse.json({
      success: true,
      message: roleId === 'admin' 
        ? `Order ${body.status || 'updated'} successfully` 
        : 'Order updated successfully',
      order,
    });
  } catch (error) {
    console.error('Error updating order:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to update order', details: error instanceof Error ? error.message : String(error) },
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

    const roleId = normalizeRoleId(decoded.role);

    if (roleId === 'secondary_executive') {
      if (order.salesman_id.toString() !== decoded.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      if (order.status !== 'pending_primary') {
        return NextResponse.json(
          { error: 'Cannot delete order after primary review has started' },
          { status: 400 }
        );
      }
    } else if (roleId === 'primary_executive') {
      const isOwnOrder = order.salesman_id.toString() === decoded.userId;
      const isTeamOrder = await canPrimaryAccessOrder(decoded.userId, order.salesman_id.toString());

      if (!isTeamOrder) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      if (isOwnOrder && order.status !== 'pending') {
        return NextResponse.json(
          { error: 'Cannot delete own order after review has started' },
          { status: 400 }
        );
      }

      if (!isOwnOrder && order.status !== 'pending_primary') {
        return NextResponse.json(
          { error: 'Only team orders pending your review can be deleted' },
          { status: 400 }
        );
      }
    } else if (roleId !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
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
