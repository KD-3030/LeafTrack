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
    const se_id = searchParams.get('se_id');
    const distributor_id = searchParams.get('distributor_id');
    const active_only = searchParams.get('active_only') !== 'false'; // default true

    let query = supabaseAdmin.from('se_distributor_assignments').select('*');

    if (se_id) query = query.eq('se_id', se_id);
    if (distributor_id) query = query.eq('distributor_id', distributor_id);
    if (active_only) query = query.eq('is_active', true);

    // SE can only see own assignments
    if (roleId === 'secondary_executive') {
      query = query.eq('se_id', authResult.userId);
    } else if (roleId === 'primary_executive') {
      // PE sees assignments for their distributors
      const { data: dists } = await supabaseAdmin
        .from('distributors').select('id').eq('pe_id', authResult.userId);
      const distIds = (dists || []).map(d => d.id);
      if (distIds.length === 0) return NextResponse.json({ success: true, assignments: [] });
      query = query.in('distributor_id', distIds);
    }

    const { data, error } = await query.order('assigned_at', { ascending: false });
    if (error) throw error;

    // Enrich
    const items = data || [];
    const seIds = [...new Set(items.map(i => i.se_id))];
    const distIds = [...new Set(items.map(i => i.distributor_id))];

    const [{ data: users }, { data: distributors }] = await Promise.all([
      seIds.length ? supabaseAdmin.from('users').select('id, name, email').in('id', seIds) : { data: [] },
      distIds.length ? supabaseAdmin.from('distributors').select('id, name, city').in('id', distIds) : { data: [] },
    ]);

    const userMap = Object.fromEntries((users || []).map(u => [u.id, u]));
    const distMap = Object.fromEntries((distributors || []).map(d => [d.id, d]));

    const enriched = items.map(i => ({
      ...withId(i),
      se_name: userMap[i.se_id]?.name || null,
      se_email: userMap[i.se_id]?.email || null,
      distributor_name: distMap[i.distributor_id]?.name || null,
      distributor_city: distMap[i.distributor_id]?.city || null,
    }));

    return NextResponse.json({ success: true, assignments: enriched });
  } catch (error) {
    console.error('Error fetching SE assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const roleId = normalizeRoleId(authResult.role);
    if (roleId !== 'admin' && roleId !== 'primary_executive') {
      return NextResponse.json({ error: 'Only admin and PE can assign SEs to distributors' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.se_id || !body.distributor_id) {
      return NextResponse.json({ error: 'se_id and distributor_id are required' }, { status: 400 });
    }

    // Verify SE exists and is a SecondaryExecutive
    const { data: se } = await supabaseAdmin
      .from('users').select('id, role, manager_id').eq('id', body.se_id).single();
    if (!se || normalizeRoleId(se.role) !== 'secondary_executive') {
      return NextResponse.json({ error: 'User is not a secondary executive' }, { status: 400 });
    }

    // Verify distributor exists
    const { data: dist } = await supabaseAdmin
      .from('distributors').select('id, pe_id').eq('id', body.distributor_id).single();
    if (!dist) return NextResponse.json({ error: 'Distributor not found' }, { status: 404 });

    // PE can only assign SEs to their own distributors
    if (roleId === 'primary_executive') {
      if (dist.pe_id !== authResult.userId) {
        return NextResponse.json({ error: 'You can only assign SEs to your own distributors' }, { status: 403 });
      }
      if (se.manager_id !== authResult.userId) {
        return NextResponse.json({ error: 'SE is not on your team' }, { status: 403 });
      }
    }

    // Upsert: if assignment exists but inactive, reactivate
    const { data: existing } = await supabaseAdmin
      .from('se_distributor_assignments')
      .select('id, is_active')
      .eq('se_id', body.se_id)
      .eq('distributor_id', body.distributor_id)
      .maybeSingle();

    if (existing) {
      if (existing.is_active) {
        return NextResponse.json({ error: 'SE is already assigned to this distributor' }, { status: 409 });
      }
      // Reactivate
      const { data: updated, error } = await supabaseAdmin
        .from('se_distributor_assignments')
        .update({ is_active: true, assigned_by: authResult.userId, assigned_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Assignment reactivated', assignment: withId(updated) });
    }

    const { data, error } = await supabaseAdmin.from('se_distributor_assignments').insert({
      se_id: body.se_id,
      distributor_id: body.distributor_id,
      assigned_by: authResult.userId,
      is_active: true,
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'SE assigned to distributor', assignment: withId(data) }, { status: 201 });
  } catch (error) {
    console.error('Error creating SE assignment:', error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const roleId = normalizeRoleId(authResult.role);
    if (roleId !== 'admin' && roleId !== 'primary_executive') {
      return NextResponse.json({ error: 'Only admin and PE can remove SE assignments' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Assignment id is required' }, { status: 400 });

    // If PE, verify the assignment is for their distributor
    if (roleId === 'primary_executive') {
      const { data: assignment } = await supabaseAdmin
        .from('se_distributor_assignments').select('distributor_id').eq('id', id).single();
      if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

      const { data: dist } = await supabaseAdmin
        .from('distributors').select('pe_id').eq('id', assignment.distributor_id).single();
      if (!dist || dist.pe_id !== authResult.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const { error } = await supabaseAdmin
      .from('se_distributor_assignments')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'SE assignment deactivated' });
  } catch (error) {
    console.error('Error removing SE assignment:', error);
    return NextResponse.json({ error: 'Failed to remove assignment' }, { status: 500 });
  }
}
