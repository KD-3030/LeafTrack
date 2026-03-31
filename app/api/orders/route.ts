import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/authMiddleware';
import { withId, withIds } from '@/lib/supabase-helpers';
import { normalizeRoleId } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customer_name = searchParams.get('customer_name');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const search = searchParams.get('search');

    const roleId = normalizeRoleId(authResult.role);

    let query = supabaseAdmin.from('orders').select('*, order_items(*)');

    // Role-based filtering
    if (roleId === 'secondary_executive') {
      query = query.eq('salesman_id', authResult.userId);
    } else if (roleId === 'primary_executive') {
      const { data: team } = await supabaseAdmin.from('users')
        .select('id').eq('manager_id', authResult.userId)
        .eq('role', 'SecondaryExecutive').eq('approval_status', 'approved');
      const teamIds = [authResult.userId, ...(team || []).map(t => t.id)];
      query = query.in('salesman_id', teamIds);
    }

    if (status && status !== 'all') query = query.eq('status', status);
    if (customer_name) query = query.ilike('customer_name', `%${customer_name}%`);
    if (from_date) query = query.gte('order_date', from_date);
    if (to_date) query = query.lte('order_date', to_date);
    if (search) query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,salesman_name.ilike.%${search}%,customer_contact.ilike.%${search}%`);

    const { data: orders, error } = await query.order('order_date', { ascending: false });
    if (error) throw error;

    const mapped = (orders || []).map(o => ({
      ...withId(o),
      items: o.order_items || [],
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    }));

    const pendingForAdmin = mapped.filter(o => o.status === 'pending');
    const pendingForPrimary = mapped.filter(o => o.status === 'pending_primary');

    const summary = {
      total_orders: mapped.length,
      pending_count: pendingForAdmin.length,
      primary_review_count: pendingForPrimary.length,
      approved_count: mapped.filter(o => o.status === 'approved').length,
      dispatched_count: mapped.filter(o => o.status === 'dispatched').length,
      rejected_count: mapped.filter(o => o.status === 'rejected').length,
      total_value: mapped.reduce((s, o) => s + (o.total_amount || 0), 0),
      pending_value: (roleId === 'admin' ? pendingForAdmin : [...pendingForAdmin, ...pendingForPrimary])
        .reduce((s, o) => s + (o.total_amount || 0), 0),
      approved_value: mapped.filter(o => o.status === 'approved').reduce((s, o) => s + (o.total_amount || 0), 0),
    };

    return NextResponse.json({ success: true, orders: mapped, summary });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const roleId = normalizeRoleId(authResult.role);
    if (roleId !== 'secondary_executive' && roleId !== 'primary_executive') {
      return NextResponse.json({ error: 'Only executives can create orders' }, { status: 403 });
    }

    const body = await request.json();
    const required = ['customer_name', 'customer_contact', 'items', 'subtotal', 'total_amount'];
    for (const f of required) {
      if (!body[f]) return NextResponse.json({ error: `Missing required field: ${f}` }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Order must have at least one item' }, { status: 400 });
    }

    const isSecondary = roleId === 'secondary_executive';

    const { data: order, error } = await supabaseAdmin.from('orders').insert({
      order_date: body.order_date || new Date().toISOString(),
      salesman_id: authResult.userId,
      salesman_name: authResult.name || 'Unknown',
      customer_id: body.customer_id || null,
      customer_name: body.customer_name,
      customer_contact: body.customer_contact,
      customer_address: body.customer_address || null,
      customer_gstin: body.customer_gstin || null,
      customer_email: body.customer_email || null,
      distributor_id: body.distributor_id || null,
      order_type: body.order_type || 'restock',
      subtotal: body.subtotal,
      tax_percentage: body.tax_percentage || 0,
      tax_amount: body.tax_amount || 0,
      discount_amount: body.discount_amount || 0,
      total_amount: body.total_amount,
      status: isSecondary ? 'pending_primary' : 'pending',
      submitted_at: new Date().toISOString(),
      notes: body.notes || null,
    }).select().single();
    if (error) throw error;

    // Insert order items
    const itemRows = body.items.map((item: Record<string, unknown>) => ({
      order_id: order.id,
      product_id: item.product_id || null,
      product_name: item.product_name,
      quantity: item.quantity,
      unit: item.unit || 'kg',
      price_per_unit: item.price_per_unit,
      total_price: item.total_price,
    }));
    if (itemRows.length > 0) await supabaseAdmin.from('order_items').insert(itemRows);

    return NextResponse.json({
      success: true,
      message: isSecondary
        ? 'Order submitted successfully and is pending primary executive review'
        : 'Order submitted successfully and is pending admin approval',
      order: { ...withId(order), items: body.items, createdAt: order.created_at, updatedAt: order.updated_at },
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}