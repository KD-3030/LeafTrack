import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/authMiddleware';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;

    const body = await request.json();
    const { email, role, manager_id } = body;

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('email', email.toLowerCase()).single();
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Check for existing unused invitation
    const { data: existingInvitation } = await supabaseAdmin
      .from('invitations')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();
    if (existingInvitation) {
      return NextResponse.json({ error: 'An active invitation already exists for this email' }, { status: 400 });
    }

    // Validate manager if role requires it
    if (role === 'SecondaryExecutive' && !manager_id) {
      return NextResponse.json({ error: 'Manager is required for Secondary Executive role' }, { status: 400 });
    }
    if (manager_id) {
      const { data: manager } = await supabaseAdmin.from('users').select('id, role').eq('id', manager_id).single();
      if (!manager) {
        return NextResponse.json({ error: 'Manager not found' }, { status: 404 });
      }
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const { data: invitation, error } = await supabaseAdmin
      .from('invitations')
      .insert({
        email: email.toLowerCase(),
        role,
        manager_id: manager_id || null,
        token: invitationToken,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_by: decoded.userId,
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Invitation created successfully',
      invitation: {
        ...invitation,
        _id: invitation.id,
        signupUrl: `/signup?token=${invitationToken}`,
      },
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to send invitation' }, { status: 500 });
  }
}