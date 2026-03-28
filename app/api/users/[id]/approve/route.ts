import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Fetch user
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, approval_status')
      .eq('id', params.id)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.approval_status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Only pending users can be approved' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        approval_status: 'approved',
        approved_by: authResult.userId,
        approval_date: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Approve user update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to approve user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User approved successfully',
    });
  } catch (error) {
    console.error('Approve user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
