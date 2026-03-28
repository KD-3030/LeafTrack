import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { comparePassword, generateToken } from '@/lib/auth';
import { strictRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = strictRateLimit(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', String(email).toLowerCase())
      .single();
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (user.approval_status === 'pending') {
      return NextResponse.json(
        { error: 'Account is pending approval', code: 'PENDING_APPROVAL' },
        { status: 403 }
      );
    }

    if (user.approval_status === 'rejected') {
      return NextResponse.json(
        { error: user.rejection_reason || 'Account has been rejected', code: 'REJECTED' },
        { status: 403 }
      );
    }

    if (user.approval_status !== 'approved') {
      return NextResponse.json(
        { error: 'Invalid account approval status', code: 'INVALID_APPROVAL_STATUS' },
        { status: 403 }
      );
    }

    // Generate token with Supabase UUID
    const token = generateToken(user.id, user.role, user.name);

    // Return user data (without password)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      managerId: user.manager_id,
      approval_status: user.approval_status,
      created_at: user.created_at,
    };

    return NextResponse.json({
      success: true,
      user: userData,
      token,
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}