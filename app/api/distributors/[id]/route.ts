import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireUserAuth } from '@/lib/authMiddleware';
import { normalizeRoleId } from '@/lib/roles';
import { withId } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

async function canAccessDistributor(
  distributor: Record<string, unknown>,
  roleId: string | null,
  userId: string
): Promise<boolean> {
  if (roleId === 'admin') return true;
  if (roleId === 'primary_executive') {
    return distributor.pe_id === userId;
  }
  if (roleId === 'secondary_executive') {
    // SE accesses distributors via PE chain
    const { data: seUser } = await supabaseAdmin
      .from('users').select('manager_id').eq('id', userId).single();
    return Boolean(seUser?.manager_id && distributor.pe_id === seUser.manager_id);
  }
  return false;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const roleId = normalizeRoleId(authResult.role);

    const { data: distributor, error } = await supabaseAdmin
      .from('distributors')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !distributor) {
      return NextResponse.json({ error: 'Distributor not found' }, { status: 404 });
    }

    if (!(await canAccessDistributor(distributor, roleId, authResult.userId))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Sync outstanding balance from invoices
    const { data: invoices } = await supabaseAdmin
      .from('invoices')
      .select('balance_due')
      .eq('distributor_id', params.id)
      .neq('status', 'Cancelled');

    const outstandingBalance = (invoices || []).reduce(
      (sum: number, inv: Record<string, unknown>) => sum + Number(inv.balance_due || 0),
      0
    );

    if (Number(distributor.outstanding_balance || 0) !== outstandingBalance) {
      await supabaseAdmin
        .from('distributors')
        .update({ outstanding_balance: outstandingBalance })
        .eq('id', params.id);
    }

    return NextResponse.json({
      success: true,
      distributor: withId({ ...distributor, outstanding_balance: outstandingBalance }),
    });
  } catch (error) {
    console.error('Error fetching distributor:', error);
    return NextResponse.json({ error: 'Failed to fetch distributor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const roleId = normalizeRoleId(authResult.role);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('distributors')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Distributor not found' }, { status: 404 });
    }

    if (!(await canAccessDistributor(existing, roleId, authResult.userId))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const updateData = await request.json();

    if (updateData.email === '' || updateData.email === null) {
      updateData.email = null;
    }

    // SE can't change PE assignment
    if (roleId === 'secondary_executive') {
      delete updateData.pe_id;
      delete updateData.created_by;
    }

    // Admin can set PE
    if (roleId === 'admin' && updateData.pe_id) {
      const { data: pe } = await supabaseAdmin
        .from('users').select('role').eq('id', updateData.pe_id).single();
      if (!pe || normalizeRoleId(pe.role) !== 'primary_executive') {
        return NextResponse.json({ error: 'pe_id must belong to a primary executive' }, { status: 400 });
      }
    }

    if (updateData.phone && updateData.phone !== existing.phone) {
      const { data: phoneConflict } = await supabaseAdmin
        .from('distributors').select('id').eq('phone', updateData.phone).neq('id', params.id).limit(1);
      if (phoneConflict && phoneConflict.length > 0) {
        return NextResponse.json({ error: 'Phone number already exists' }, { status: 409 });
      }
    }

    if (updateData.email && updateData.email !== existing.email) {
      const { data: emailConflict } = await supabaseAdmin
        .from('distributors').select('id').eq('email', updateData.email).neq('id', params.id).limit(1);
      if (emailConflict && emailConflict.length > 0) {
        return NextResponse.json({ error: 'Distributor with this email already exists' }, { status: 400 });
      }
    }

    delete updateData._id;
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.createdAt;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('distributors')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: 'Distributor updated successfully',
      distributor: withId(updated),
    });
  } catch (error) {
    console.error('Error updating distributor:', error);
    return NextResponse.json({ error: 'Failed to update distributor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    if (normalizeRoleId(authResult.role) !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { data: distributor, error } = await supabaseAdmin
      .from('distributors').select('id').eq('id', params.id).single();

    if (error || !distributor) {
      return NextResponse.json({ error: 'Distributor not found' }, { status: 404 });
    }

    await supabaseAdmin
      .from('distributors')
      .update({ status: 'Inactive' })
      .eq('id', params.id);

    return NextResponse.json({
      success: true,
      message: 'Distributor deactivated successfully',
    });
  } catch (error) {
    console.error('Error deleting distributor:', error);
    return NextResponse.json({ error: 'Failed to delete distributor' }, { status: 500 });
  }
}
