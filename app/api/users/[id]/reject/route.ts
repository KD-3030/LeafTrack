import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { requireAdminAuth } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { reason } = await request.json();
    const rejectionReason = String(reason || '').trim();
    if (!rejectionReason) {
      return NextResponse.json(
        { success: false, error: 'reason is required' },
        { status: 400 }
      );
    }

    const user = await User.findById(params.id);
    if (!user) {
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

    user.approval_status = 'rejected';
    user.approved_by = authResult.userId;
    user.approval_date = new Date();
    user.rejection_reason = rejectionReason;
    await user.save();

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
