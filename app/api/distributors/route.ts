import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireUserAuth } from '@/lib/authMiddleware';
import { normalizeRoleId } from '@/lib/roles';
import { withId } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { data: currentUser } = await supabaseAdmin
      .from('users').select('role, manager_id').eq('id', authResult.userId).single();
    if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const roleId = normalizeRoleId(currentUser.role);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const state = searchParams.get('state');
    const business_type = searchParams.get('business_type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabaseAdmin.from('distributors').select('*', { count: 'exact' });

    if (status && status !== 'all') query = query.eq('status', status);
    if (state && state !== 'all') query = query.ilike('state', `%${state}%`);
    if (business_type) query = query.eq('business_type', business_type);
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,business_name.ilike.%${search}%,gstin.ilike.%${search}%`);
    }

    if (roleId === 'primary_executive') {
      query = query.eq('pe_id', authResult.userId);
    } else if (roleId === 'secondary_executive') {
      // SE sees distributors of their PE(s) via manager_id
      const { data: seUser } = await supabaseAdmin
        .from('users').select('manager_id').eq('id', authResult.userId).single();
      if (!seUser?.manager_id) {
        return NextResponse.json({
          success: true, distributors: [],
          pagination: { currentPage: page, totalPages: 0, totalCount: 0, hasNextPage: false, hasPrevPage: false },
        });
      }
      query = query.eq('pe_id', seUser.manager_id);
    }

    const { data, count, error } = await query.order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
    if (error) throw error;

    const total = count || 0;
    const distIds = (data || []).map((d: { id: string }) => d.id);
    const balanceMap: Record<string, number> = {};

    if (distIds.length > 0) {
      const { data: invoices } = await supabaseAdmin
        .from('invoices').select('distributor_id, balance_due')
        .in('distributor_id', distIds).neq('status', 'Cancelled');
      if (invoices) {
        for (const inv of invoices) {
          balanceMap[inv.distributor_id] = (balanceMap[inv.distributor_id] || 0) + (inv.balance_due || 0);
        }
      }
    }

    const distributors = (data || []).map((d: Record<string, unknown>) => ({
      ...withId(d as { id: string } & Record<string, unknown>),
      outstanding_balance: balanceMap[(d as { id: string }).id] || (d as { outstanding_balance?: number }).outstanding_balance || 0,
      createdAt: d.created_at, updatedAt: d.updated_at,
    }));

    return NextResponse.json({
      success: true, distributors,
      pagination: { currentPage: page, totalPages: Math.ceil(total / limit), totalCount: total, hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
    });
  } catch (error) {
    console.error('Error fetching distributors:', error);
    return NextResponse.json({ error: 'Failed to fetch distributors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { data: currentUser } = await supabaseAdmin
      .from('users').select('role, manager_id').eq('id', authResult.userId).single();
    if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const roleId = normalizeRoleId(currentUser.role);

    const body = await request.json();
    if (!body.name || !body.phone) return NextResponse.json({ error: 'Name and phone number are required' }, { status: 400 });
    if (body.email === '' || body.email === null) body.email = null;

    if (body.email) {
      const { data: dup } = await supabaseAdmin.from('distributors').select('id').eq('email', body.email).maybeSingle();
      if (dup) return NextResponse.json({ error: 'Distributor with this email already exists' }, { status: 400 });
    }

    let peId: string | null = null;

    if (roleId === 'primary_executive') {
      peId = authResult.userId;
    } else if (roleId === 'secondary_executive') {
      if (!currentUser.manager_id) return NextResponse.json({ error: 'Secondary executive is not assigned to a primary executive' }, { status: 400 });
      peId = currentUser.manager_id;
    } else if (roleId === 'admin') {
      if (body.pe_id) {
        const { data: pe } = await supabaseAdmin.from('users').select('role').eq('id', body.pe_id).single();
        if (!pe || normalizeRoleId(pe.role) !== 'primary_executive')
          return NextResponse.json({ error: 'pe_id must belong to a primary executive' }, { status: 400 });
        peId = body.pe_id;
      }
    }

    const { data, error } = await supabaseAdmin.from('distributors').insert({
      name: body.name, email: body.email || null, phone: body.phone,
      address: body.address || null, city: body.city || null, state: body.state || null,
      pincode: body.pincode || null, gstin: body.gstin || null, pan: body.pan || null,
      business_name: body.business_name || null, business_type: body.business_type || 'Individual',
      credit_limit: body.credit_limit || 0, credit_days: body.credit_days || 30,
      outstanding_balance: body.outstanding_balance || 0, status: body.status || 'Active',
      approval_status: body.approval_status || 'approved',
      tags: body.tags || [], notes: body.notes || null,
      documents: body.documents || [],
      pe_id: peId,
      created_by: authResult.userId,
    }).select().single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Distributor with this phone or email already exists' }, { status: 400 });
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Distributor created successfully', distributor: { ...withId(data), createdAt: data.created_at, updatedAt: data.updated_at } });
  } catch (error) {
    console.error('Error creating distributor:', error);
    return NextResponse.json({ error: 'Failed to create distributor' }, { status: 500 });
  }
}
