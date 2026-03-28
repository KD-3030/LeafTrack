import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { hashPassword } from '@/lib/auth';
import { normalizeRoleId, roleIdToDbRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, invitationToken } = await request.json();

    if (!name || !email || !password || !invitationToken) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Validate invitation
    const { data: invitation, error: invErr } = await supabaseAdmin.from('invitations')
      .select('*').eq('token', invitationToken).eq('used', false).gt('expires_at', new Date().toISOString()).single();
    if (invErr || !invitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation link' }, { status: 400 });
    }

    if (invitation.email.toLowerCase() !== String(email).toLowerCase()) {
      return NextResponse.json({ error: 'Email does not match invitation' }, { status: 400 });
    }

    const invitedRole = normalizeRoleId(invitation.role);
    if (!invitedRole || invitedRole === 'admin' || invitedRole === 'customer') {
      return NextResponse.json({ error: 'Invitation role is invalid' }, { status: 400 });
    }
    if (invitedRole === 'secondary_executive' && !invitation.manager_id) {
      return NextResponse.json({ error: 'Secondary executive invitations require a primary manager assignment' }, { status: 400 });
    }

    // Check existing user
    const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('email', email).single();
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists with this email' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const { data: user, error: createErr } = await supabaseAdmin.from('users').insert({
      name, email, password: hashedPassword,
      role: roleIdToDbRole(invitedRole),
      manager_id: invitation.manager_id || null,
      invited_by: invitation.invited_by || null,
      approval_status: 'pending',
    }).select().single();
    if (createErr) throw createErr;

    // Mark invitation as used
    await supabaseAdmin.from('invitations').update({
      used: true, used_at: new Date().toISOString(), user_id: user.id,
    }).eq('id', invitation.id);

    return NextResponse.json({
      success: true,
      user: { id: user.id, _id: user.id, name: user.name, email: user.email, role: user.role, managerId: user.manager_id, approval_status: user.approval_status, created_at: user.created_at },
      message: 'Account created. Awaiting admin approval.',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}