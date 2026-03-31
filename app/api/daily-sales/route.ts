import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireUserAuth } from '@/lib/authMiddleware';
import { normalizeRoleId } from '@/lib/roles';
import { withId, withIds } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const roleId = normalizeRoleId(authResult.role);
    const { searchParams } = new URL(request.url);
    const distributor_id = searchParams.get('distributor_id');
    const se_id = searchParams.get('se_id');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const product_id = searchParams.get('product_id');

    let query = supabaseAdmin.from('daily_sales').select('*');

    if (distributor_id) query = query.eq('distributor_id', distributor_id);
    if (product_id) query = query.eq('product_id', product_id);
    if (from_date) query = query.gte('sale_date', from_date);
    if (to_date) query = query.lte('sale_date', to_date);

    // Role-based filtering
    if (roleId === 'secondary_executive') {
      query = query.eq('se_id', authResult.userId);
    } else if (roleId === 'primary_executive') {
      // PE sees sales from their distributors
      const { data: dists } = await supabaseAdmin
        .from('distributors').select('id').eq('pe_id', authResult.userId);
      const distIds = (dists || []).map(d => d.id);
      if (distIds.length === 0) return NextResponse.json({ success: true, daily_sales: [] });
      query = query.in('distributor_id', distIds);
      if (se_id) query = query.eq('se_id', se_id);
    } else if (roleId === 'admin') {
      if (se_id) query = query.eq('se_id', se_id);
    }

    const { data, error } = await query.order('sale_date', { ascending: false }).order('created_at', { ascending: false });
    if (error) throw error;

    // Enrich with related names
    const sales = data || [];
    const distIds = [...new Set(sales.map(s => s.distributor_id))];
    const productIds = [...new Set(sales.map(s => s.product_id))];
    const seIds = [...new Set(sales.map(s => s.se_id))];
    const retailerIds = [...new Set(sales.filter(s => s.retailer_id).map(s => s.retailer_id))];

    const [
      { data: distributors },
      { data: products },
      { data: users },
      { data: retailers },
    ] = await Promise.all([
      distIds.length ? supabaseAdmin.from('distributors').select('id, name').in('id', distIds) : { data: [] },
      productIds.length ? supabaseAdmin.from('products').select('id, name').in('id', productIds) : { data: [] },
      seIds.length ? supabaseAdmin.from('users').select('id, name').in('id', seIds) : { data: [] },
      retailerIds.length ? supabaseAdmin.from('retailers').select('id, name, shop_name').in('id', retailerIds) : { data: [] },
    ]);

    const distMap = Object.fromEntries((distributors || []).map(d => [d.id, d.name]));
    const prodMap = Object.fromEntries((products || []).map(p => [p.id, p.name]));
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u.name]));
    const retailerMap = Object.fromEntries((retailers || []).map(r => [r.id, r.name]));

    const enriched = sales.map(s => ({
      ...withId(s),
      distributor_name: distMap[s.distributor_id] || null,
      product_name: prodMap[s.product_id] || null,
      se_name: userMap[s.se_id] || null,
      retailer_name: s.retailer_id ? retailerMap[s.retailer_id] || null : null,
    }));

    return NextResponse.json({ success: true, daily_sales: enriched });
  } catch (error) {
    console.error('Error fetching daily sales:', error);
    return NextResponse.json({ error: 'Failed to fetch daily sales' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const roleId = normalizeRoleId(authResult.role);
    if (roleId !== 'secondary_executive' && roleId !== 'admin') {
      return NextResponse.json({ error: 'Only secondary executives can log daily sales' }, { status: 403 });
    }

    const body = await request.json();
    const { distributor_id, product_id, quantity_sold, sale_amount } = body;

    if (!distributor_id || !product_id || !quantity_sold || sale_amount === undefined) {
      return NextResponse.json({ error: 'distributor_id, product_id, quantity_sold, and sale_amount are required' }, { status: 400 });
    }

    // Verify SE is assigned to this distributor
    if (roleId === 'secondary_executive') {
      const { data: assignment } = await supabaseAdmin
        .from('se_distributor_assignments')
        .select('id')
        .eq('se_id', authResult.userId)
        .eq('distributor_id', distributor_id)
        .eq('is_active', true)
        .maybeSingle();
      if (!assignment) {
        return NextResponse.json({ error: 'You are not assigned to this distributor' }, { status: 403 });
      }
    }

    // Verify product exists
    const { data: product } = await supabaseAdmin
      .from('products').select('id, name').eq('id', product_id).single();
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    // If retailer_id is provided, verify it belongs to the distributor
    if (body.retailer_id) {
      const { data: retailer } = await supabaseAdmin
        .from('retailers').select('id').eq('id', body.retailer_id).eq('distributor_id', distributor_id).single();
      if (!retailer) return NextResponse.json({ error: 'Retailer not found or does not belong to this distributor' }, { status: 400 });
    }

    // Deduct from distributor inventory
    const { data: inv } = await supabaseAdmin
      .from('distributor_inventory')
      .select('id, current_stock')
      .eq('distributor_id', distributor_id)
      .eq('product_id', product_id)
      .maybeSingle();

    if (inv) {
      await supabaseAdmin
        .from('distributor_inventory')
        .update({ current_stock: inv.current_stock - quantity_sold })
        .eq('id', inv.id);
    }
    // If no inventory record exists, allow sale (soft limit) but don't create negative record

    const { data, error } = await supabaseAdmin.from('daily_sales').insert({
      se_id: roleId === 'secondary_executive' ? authResult.userId : (body.se_id || authResult.userId),
      distributor_id,
      retailer_id: body.retailer_id || null,
      product_id,
      quantity_sold,
      unit: body.unit || 'kg',
      sale_amount,
      payment_type: body.payment_type || 'cash',
      location_lat: body.location_lat || null,
      location_lng: body.location_lng || null,
      notes: body.notes || null,
      sale_date: body.sale_date || new Date().toISOString().split('T')[0],
    }).select().single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Sale logged successfully',
      daily_sale: withId(data),
    }, { status: 201 });
  } catch (error) {
    console.error('Error logging daily sale:', error);
    return NextResponse.json({ error: 'Failed to log daily sale' }, { status: 500 });
  }
}
