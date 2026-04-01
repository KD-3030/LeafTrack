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
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    let query = supabaseAdmin.from('retailers').select('*');

    if (distributor_id) query = query.eq('distributor_id', distributor_id);
    if (status && status !== 'all') query = query.eq('status', status);
    if (search) {
      query = query.or(`name.ilike.%${search}%,shop_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Role-based filtering: SE sees retailers of their PE's distributors
    if (roleId === 'secondary_executive') {
      const { data: seUser } = await supabaseAdmin
        .from('users').select('manager_id').eq('id', authResult.userId).single();
      if (!seUser?.manager_id) {
        return NextResponse.json({ success: true, retailers: [] });
      }
      const { data: dists } = await supabaseAdmin
        .from('distributors').select('id').eq('pe_id', seUser.manager_id);
      const distIds = (dists || []).map(d => d.id);
      if (distIds.length === 0) {
        return NextResponse.json({ success: true, retailers: [] });
      }
      query = query.in('distributor_id', distIds);
    } else if (roleId === 'primary_executive') {
      // PE sees retailers of their distributors
      const { data: dists } = await supabaseAdmin
        .from('distributors').select('id').eq('pe_id', authResult.userId);
      const distIds = (dists || []).map(d => d.id);
      if (distIds.length === 0) {
        return NextResponse.json({ success: true, retailers: [] });
      }
      query = query.in('distributor_id', distIds);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json({ success: true, retailers: withIds(data || []) });
  } catch (error) {
    console.error('Error fetching retailers:', error);
    return NextResponse.json({ error: 'Failed to fetch retailers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const roleId = normalizeRoleId(authResult.role);
    const body = await request.json();

    if (!body.name || !body.distributor_id) {
      return NextResponse.json({ error: 'Name and distributor_id are required' }, { status: 400 });
    }

    // Verify distributor exists
    const { data: dist } = await supabaseAdmin
      .from('distributors').select('id, pe_id').eq('id', body.distributor_id).single();
    if (!dist) return NextResponse.json({ error: 'Distributor not found' }, { status: 404 });

    // SE must be under a PE that owns this distributor
    if (roleId === 'secondary_executive') {
      const { data: seUser } = await supabaseAdmin
        .from('users').select('manager_id').eq('id', authResult.userId).single();
      if (!seUser?.manager_id || dist.pe_id !== seUser.manager_id) {
        return NextResponse.json({ error: 'You are not assigned to this distributor' }, { status: 403 });
      }
    } else if (roleId === 'primary_executive') {
      if (dist.pe_id !== authResult.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const { data, error } = await supabaseAdmin.from('retailers').insert({
      name: body.name,
      phone: body.phone || null,
      shop_name: body.shop_name || null,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      pincode: body.pincode || null,
      location_lat: body.location_lat || null,
      location_lng: body.location_lng || null,
      distributor_id: body.distributor_id,
      created_by_se_id: roleId === 'secondary_executive' ? authResult.userId : null,
      status: 'Active',
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Retailer created', retailer: withId(data) }, { status: 201 });
  } catch (error) {
    console.error('Error creating retailer:', error);
    return NextResponse.json({ error: 'Failed to create retailer' }, { status: 500 });
  }
}
