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

    let query = supabaseAdmin.from('distributor_inventory').select('*');

    if (distributor_id) {
      query = query.eq('distributor_id', distributor_id);
    } else if (roleId === 'primary_executive') {
      const { data: dists } = await supabaseAdmin
        .from('distributors').select('id').eq('pe_id', authResult.userId);
      const distIds = (dists || []).map(d => d.id);
      if (distIds.length === 0) return NextResponse.json({ success: true, inventory: [] });
      query = query.in('distributor_id', distIds);
    } else if (roleId === 'secondary_executive') {
      // SE sees inventory of distributors belonging to their PE
      const { data: seUser } = await supabaseAdmin
        .from('users').select('manager_id').eq('id', authResult.userId).single();
      if (!seUser?.manager_id) return NextResponse.json({ success: true, inventory: [] });
      const { data: dists } = await supabaseAdmin
        .from('distributors').select('id').eq('pe_id', seUser.manager_id);
      const distIds = (dists || []).map(d => d.id);
      if (distIds.length === 0) return NextResponse.json({ success: true, inventory: [] });
      query = query.in('distributor_id', distIds);
    }

    const { data, error } = await query.order('distributor_id');
    if (error) throw error;

    // Enrich with names and PE details
    const items = data || [];
    const distIds = [...new Set(items.map(i => i.distributor_id))];
    const productIds = [...new Set(items.map(i => i.product_id))];

    const [{ data: distributors }, { data: products }] = await Promise.all([
      distIds.length ? supabaseAdmin.from('distributors').select('id, name, pe_id').in('id', distIds) : { data: [] },
      productIds.length ? supabaseAdmin.from('products').select('id, name, hsn_code').in('id', productIds) : { data: [] },
    ]);

    const peIds = [...new Set((distributors || []).map(d => d.pe_id).filter(Boolean))];
    const { data: users } = peIds.length
      ? await supabaseAdmin.from('users').select('id, name, email, phone').in('id', peIds)
      : { data: [] };

    const distMap = Object.fromEntries((distributors || []).map(d => [d.id, d]));
    const prodMap = Object.fromEntries((products || []).map(p => [p.id, p]));
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u]));

    const enriched = items.map(i => {
      const dist = distMap[i.distributor_id];
      const prod = prodMap[i.product_id];
      const pe = dist?.pe_id ? userMap[dist.pe_id] : null;

      return {
        ...withId(i),
        distributor_name: dist?.name || null,
        pe_id: dist?.pe_id || null,
        pe_name: pe?.name || null,
        pe_email: pe?.email || null,
        pe_phone: pe?.phone || null,
        product_name: prod?.name || null,
        product_hsn: prod?.hsn_code || null,
      };
    });

    return NextResponse.json({ success: true, inventory: enriched });
  } catch (error) {
    console.error('Error fetching distributor inventory:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}
