import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

async function handleValidation(token: string | null) {
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  const { data: invitation, error } = await supabaseAdmin
    .from('invitations')
    .select('id, email, role, manager_id, used, expires_at')
    .eq('token', token)
    .single();

  if (error || !invitation) {
    return NextResponse.json({ valid: false, error: 'Invalid invitation token' }, { status: 404 });
  }

  if (invitation.used) {
    return NextResponse.json({ valid: false, error: 'Invitation has already been used' }, { status: 400 });
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: 'Invitation has expired' }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    invitation: {
      _id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      manager_id: invitation.manager_id,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    return handleValidation(token);
  } catch (error) {
    console.error('Error validating invitation:', error);
    return NextResponse.json({ error: 'Failed to validate invitation' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body?.token || null;
    return handleValidation(token);
  } catch (error) {
    console.error('Error validating invitation:', error);
    return NextResponse.json({ error: 'Failed to validate invitation' }, { status: 500 });
  }
}