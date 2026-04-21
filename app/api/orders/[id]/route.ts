import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/authMiddleware';
import { normalizeRoleId } from '@/lib/roles';
import { withId } from '@/lib/supabase-helpers';

async function canPrimaryAccessOrder(primaryId: string, salesmanId: string): Promise<boolean> {
  if (salesmanId === primaryId) return true;

  const { data: secondary } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', salesmanId)
    .eq('manager_id', primaryId)
    .eq('role', 'secondary_executive')
    .eq('approval_status', 'approved')
    .maybeSingle();

  return Boolean(secondary);
}

// GET /api/orders/[id] - Get a single order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;
    const { id } = await params;

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const roleId = normalizeRoleId(decoded.role);
    if (roleId === 'secondary_executive' && order.salesman_id !== decoded.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    if (roleId === 'primary_executive') {
      const allowed = await canPrimaryAccessOrder(decoded.userId, order.salesman_id);
      if (!allowed) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Fetch order items
    const { data: orderItems } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', id);

    return NextResponse.json({
      success: true,
      order: {
        ...withId(order),
        items: order.items || (orderItems || []).map(withId),
      },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;
    const { id } = await params;

    const { data: order, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const body = await request.json();
    const roleId = normalizeRoleId(decoded.role);
    const updateData: Record<string, unknown> = {};

    // Admin actions: approve/reject/modify
    if (roleId === 'admin') {
      if (body.status) {
        if (!['approved', 'rejected', 'dispatched'].includes(body.status)) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        updateData.status = body.status;
        updateData.reviewed_at = new Date().toISOString();
        updateData.reviewed_by = decoded.userId;
        updateData.reviewer_name = decoded.name || 'Admin';

        if (body.status === 'rejected' && body.rejection_reason) {
          updateData.rejection_reason = body.rejection_reason;
        }

        // Prevent re-dispatching
        if (body.status === 'dispatched' && order.status === 'dispatched') {
          return NextResponse.json({ error: 'Order is already dispatched' }, { status: 400 });
        }

        // When dispatched, transfer stock to distributor inventory
        const distId = order.distributor_id || order.customer_id;
        if (body.status === 'dispatched' && distId) {
          const { data: orderItems } = await supabaseAdmin
                .from('order_items').select('product_id, quantity').eq('order_id', id);
          if (orderItems && orderItems.length > 0) {
            for (const item of orderItems) {
              if (!item.product_id) continue;
              // Deduct from global stock
              const { data: product } = await supabaseAdmin
                .from('products').select('total_stock').eq('id', item.product_id).single();
              if (product) {
                await supabaseAdmin.from('products')
                  .update({ total_stock: product.total_stock - item.quantity })
                  .eq('id', item.product_id);
              }
              // Upsert distributor inventory
              const { data: inv } = await supabaseAdmin
                .from('distributor_inventory')
                .select('id, current_stock')
                .eq('distributor_id', distId)
                .eq('product_id', item.product_id)
                .maybeSingle();
              if (inv) {
                await supabaseAdmin.from('distributor_inventory')
                  .update({ current_stock: inv.current_stock + item.quantity, last_restocked_at: new Date().toISOString() })
                  .eq('id', inv.id);
              } else {
                await supabaseAdmin.from('distributor_inventory').insert({
                  distributor_id: distId,
                  product_id: item.product_id,
                  current_stock: item.quantity,
                  last_restocked_at: new Date().toISOString(),
                });
              }
            }
          }
        }
      }

      if (body.items) {
        if (!order.admin_modified) {
          updateData.original_total = order.total_amount;
        }
        updateData.admin_modified = true;
        // Items will be updated separately in order_items table
      }

      if (body.subtotal !== undefined) updateData.subtotal = body.subtotal;
      if (body.tax_percentage !== undefined) updateData.tax_percentage = body.tax_percentage;
      if (body.tax_amount !== undefined) updateData.tax_amount = body.tax_amount;
      if (body.discount_amount !== undefined) updateData.discount_amount = body.discount_amount;
      if (body.discount_percentage !== undefined) updateData.discount_percentage = body.discount_percentage;
      if (body.total_amount !== undefined) updateData.total_amount = body.total_amount;
      if (body.admin_notes) updateData.admin_notes = body.admin_notes;
      if (body.delivery_date) updateData.delivery_date = body.delivery_date;
      if (body.payment_terms) updateData.payment_terms = body.payment_terms;
    }
    // Secondary executive actions
    else if (roleId === 'secondary_executive') {
      if (order.salesman_id !== decoded.userId) {
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

      if (body.customer_name) updateData.customer_name = body.customer_name;
      if (body.customer_contact) updateData.customer_contact = body.customer_contact;
      if (body.customer_address) updateData.customer_address = body.customer_address;
      if (body.customer_gstin) updateData.customer_gstin = body.customer_gstin;
      if (body.customer_email) updateData.customer_email = body.customer_email;
        // Items will be updated separately in order_items table
      if (body.subtotal !== undefined) updateData.subtotal = body.subtotal;
      if (body.tax_percentage !== undefined) updateData.tax_percentage = body.tax_percentage;
      if (body.tax_amount !== undefined) updateData.tax_amount = body.tax_amount;
      if (body.discount_amount !== undefined) updateData.discount_amount = body.discount_amount;
      if (body.discount_percentage !== undefined) updateData.discount_percentage = body.discount_percentage;
      if (body.total_amount !== undefined) updateData.total_amount = body.total_amount;
      if (body.notes) updateData.notes = body.notes;
    }
    // Primary executive actions
    else if (roleId === 'primary_executive') {
      const isOwnOrder = order.salesman_id === decoded.userId;
      const isTeamOrder = await canPrimaryAccessOrder(decoded.userId, order.salesman_id);

      if (!isTeamOrder) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

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

        updateData.status = 'pending';
        updateData.reviewed_at = new Date().toISOString();
        updateData.reviewed_by = decoded.userId;
        updateData.reviewer_name = decoded.name || 'Primary Executive';
        if (body.admin_notes) updateData.admin_notes = body.admin_notes;
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

        if (body.customer_name) updateData.customer_name = body.customer_name;
        if (body.customer_contact) updateData.customer_contact = body.customer_contact;
        if (body.customer_address) updateData.customer_address = body.customer_address;
        if (body.customer_gstin) updateData.customer_gstin = body.customer_gstin;
        if (body.customer_email) updateData.customer_email = body.customer_email;
        // Items will be updated separately in order_items table
        if (body.subtotal !== undefined) updateData.subtotal = body.subtotal;
        if (body.tax_percentage !== undefined) updateData.tax_percentage = body.tax_percentage;
        if (body.tax_amount !== undefined) updateData.tax_amount = body.tax_amount;
        if (body.discount_amount !== undefined) updateData.discount_amount = body.discount_amount;
        if (body.discount_percentage !== undefined) updateData.discount_percentage = body.discount_percentage;
        if (body.total_amount !== undefined) updateData.total_amount = body.total_amount;
        if (body.notes) updateData.notes = body.notes;
      }
    } else {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updatedOrder, error: updateErr } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateErr || !updatedOrder) {
      return NextResponse.json(
        { error: 'Failed to update order', details: updateErr?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: roleId === 'admin'
        ? `Order ${body.status || 'updated'} successfully`
        : 'Order updated successfully',
      order: withId(updatedOrder),
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/[id] - Delete order (Salesman: only pending orders, Admin: any order)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;
    const { id } = await params;

    const { data: order, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('id, salesman_id, status')
      .eq('id', id)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const roleId = normalizeRoleId(decoded.role);

    if (roleId === 'secondary_executive') {
      if (order.salesman_id !== decoded.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      if (order.status !== 'pending_primary') {
        return NextResponse.json(
          { error: 'Cannot delete order after primary review has started' },
          { status: 400 }
        );
      }
    } else if (roleId === 'primary_executive') {
      const isOwnOrder = order.salesman_id === decoded.userId;
      const isTeamOrder = await canPrimaryAccessOrder(decoded.userId, order.salesman_id);

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

    // Delete order items first, then order
    await supabaseAdmin.from('order_items').delete().eq('order_id', id);
    await supabaseAdmin.from('orders').delete().eq('id', id);

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
