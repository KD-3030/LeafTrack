import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireUserAuth } from '@/lib/authMiddleware';
import { normalizeRoleId } from '@/lib/roles';
import { withId } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

function canAccessCustomer(
  customer: Record<string, unknown>,
  roleId: string | null,
  userId: string
): boolean {
  if (roleId === 'admin') return true;
  if (roleId === 'primary_executive') {
    return customer.pe_id === userId;
  }
  if (roleId === 'secondary_executive') {
    return false; // SE access is checked via PE chain in the route handler
  }
  // For SE, access check uses PE chain in the route handler
  return false;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const roleId = normalizeRoleId(authResult.role);

    const { data: customer, error } = await supabaseAdmin
      .from('distributors')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (!canAccessCustomer(customer, roleId, authResult.userId)) {
      // For SE, check via PE chain
      if (roleId === 'secondary_executive') {
        const { data: seUser } = await supabaseAdmin
          .from('users').select('manager_id').eq('id', authResult.userId).single();
        if (!seUser?.manager_id || customer.pe_id !== seUser.manager_id) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
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

    if (Number(customer.outstanding_balance || 0) !== outstandingBalance) {
      await supabaseAdmin
        .from('distributors')
        .update({ outstanding_balance: outstandingBalance })
        .eq('id', params.id);
    }

    return NextResponse.json({
      success: true,
      customer: withId({ ...customer, outstanding_balance: outstandingBalance }),
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const roleId = normalizeRoleId(authResult.role);

    const { data: existingCustomer, error: fetchError } = await supabaseAdmin
      .from('distributors')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (!canAccessCustomer(existingCustomer, roleId, authResult.userId)) {
      // For SE, check via PE chain
      if (roleId === 'secondary_executive') {
        const { data: seUser } = await supabaseAdmin
          .from('users').select('manager_id').eq('id', authResult.userId).single();
        if (!seUser?.manager_id || existingCustomer.pe_id !== seUser.manager_id) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const updateData = await request.json();

    if (updateData.email === '' || updateData.email === null) {
      updateData.email = null;
    }

    if (roleId === 'secondary_executive') {
      delete updateData.pe_id;
      delete updateData.created_by;
    }

    if (roleId === 'primary_executive') {
      updateData.pe_id = authResult.userId;
    }

    if (roleId === 'admin') {
      if (updateData.pe_id || updateData.primary_executive_id) {
        const peid = updateData.pe_id || updateData.primary_executive_id;
        const { data: pe } = await supabaseAdmin
          .from('users').select('role').eq('id', peid).single();
        if (!pe || normalizeRoleId(pe.role) !== 'primary_executive') {
          return NextResponse.json({ error: 'pe_id must belong to a primary executive' }, { status: 400 });
        }
        updateData.pe_id = peid;
        delete updateData.primary_executive_id;
      }
    }

    if (updateData.phone && updateData.phone !== existingCustomer.phone) {
      const { data: phoneConflict } = await supabaseAdmin
        .from('distributors').select('id').eq('phone', updateData.phone).neq('id', params.id).limit(1);
      if (phoneConflict && phoneConflict.length > 0) {
        return NextResponse.json({ error: 'Phone number already exists' }, { status: 409 });
      }
    }

    if (updateData.email && updateData.email !== existingCustomer.email) {
      const { data: emailConflict } = await supabaseAdmin
        .from('distributors').select('id').eq('email', updateData.email).neq('id', params.id).limit(1);
      if (emailConflict && emailConflict.length > 0) {
        return NextResponse.json({ error: 'Customer with this email already exists' }, { status: 400 });
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
      message: 'Customer updated successfully',
      customer: withId(updated),
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    if (normalizeRoleId(authResult.role) !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { data: customer, error } = await supabaseAdmin
      .from('distributors').select('id').eq('id', params.id).single();

    if (error || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    await supabaseAdmin
      .from('distributors')
      .update({ status: 'Inactive' })
      .eq('id', params.id);

    return NextResponse.json({
      success: true,
      message: 'Customer deactivated successfully',
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
