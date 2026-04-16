import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const { reason } = await request.json();
    const rejectionReason = String(reason || '').trim();
    if (!rejectionReason) {
      return NextResponse.json(
        { success: false, error: 'reason is required' },
        { status: 400 }
      );
    }

    // Fetch user
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, approval_status')
      .eq('id', id)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.approval_status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Only pending users can be rejected' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        approval_status: 'rejected',
        approved_by: authResult.userId,
        approval_date: new Date().toISOString(),
        rejection_reason: rejectionReason,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Reject user update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to reject user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User rejected successfully',
    });
  } catch (error) {
    console.error('Reject user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
