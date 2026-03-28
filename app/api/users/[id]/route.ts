import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/authMiddleware';
import bcrypt from 'bcryptjs';
import { normalizeRoleId, roleIdToDbRole } from '@/lib/roles';
import { withId } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = params;
    const body = await request.json();
    const { name, email, role, password, managerId } = body;

    // Find the user to update
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .eq('id', id)
      .single();

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if email is already taken by another user
    if (email && email !== existingUser.email) {
      const { data: emailExists } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', id)
        .maybeSingle();

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare update object
    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) {
      const roleId = normalizeRoleId(role);
      if (!roleId) {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 400 }
        );
      }
      updateData.role = roleIdToDbRole(roleId);

      if (roleId === 'secondary_executive') {
        if (!managerId) {
          return NextResponse.json(
            { error: 'Secondary Executive requires managerId' },
            { status: 400 }
          );
        }

        const { data: manager } = await supabaseAdmin
          .from('users')
          .select('id, role')
          .eq('id', managerId)
          .single();

        if (!manager || manager.role !== 'PrimaryExecutive') {
          return NextResponse.json(
            { error: 'managerId must belong to a Primary Executive' },
            { status: 400 }
          );
        }
        updateData.manager_id = managerId;
      } else {
        updateData.manager_id = null;
      }
    } else if (managerId) {
      const { data: manager } = await supabaseAdmin
        .from('users')
        .select('id, role')
        .eq('id', managerId)
        .single();

      if (!manager || manager.role !== 'PrimaryExecutive') {
        return NextResponse.json(
          { error: 'managerId must belong to a Primary Executive' },
          { status: 400 }
        );
      }
      updateData.manager_id = managerId;
    }

    // Hash new password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, role, manager_id, phone, address, state, gstin, approval_status, created_at, updated_at')
      .single();

    if (updateError) {
      console.error('Update user error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: withId(updatedUser),
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = params;

    // Prevent self-deletion
    if (authResult.userId === id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    // Fetch target user
    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', id)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const targetRoleId = normalizeRoleId(targetUser.role);

    // If deleting a PE, check they have no assigned SEs
    if (targetRoleId === 'primary_executive') {
      const { count } = await supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'SecondaryExecutive')
        .eq('manager_id', id);

      if (count && count > 0) {
        return NextResponse.json(
          { error: 'Reassign or remove secondary executives before deleting this primary executive' },
          { status: 400 }
        );
      }
    }

    // If deleting an SE, clear secondary_executive_id from customers
    if (targetRoleId === 'secondary_executive') {
      await supabaseAdmin
        .from('customers')
        .update({ secondary_executive_id: null })
        .eq('secondary_executive_id', id);
    }

    // Delete the user
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Delete user error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
