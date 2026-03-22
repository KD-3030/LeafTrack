import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
import { requireUserAuth } from '@/lib/authMiddleware';
import { Model } from 'mongoose';
import { normalizeRoleId } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const roleId = normalizeRoleId(authResult.role);
    const UserModel = User as Model<IUser>;

    if (roleId === 'primary_executive') {
      const secondaries = await UserModel.find({
        role: 'SecondaryExecutive',
        managerId: authResult.userId,
        approval_status: 'approved',
      })
        .select('_id name email role approval_status managerId')
        .sort({ name: 1 })
        .lean();

      return NextResponse.json({ success: true, team: secondaries });
    }

    if (roleId === 'admin') {
      const managerId = request.nextUrl.searchParams.get('managerId');
      if (!managerId) {
        return NextResponse.json(
          { success: false, error: 'managerId is required for admin queries' },
          { status: 400 }
        );
      }

      const secondaries = await UserModel.find({
        role: 'SecondaryExecutive',
        managerId,
      })
        .select('_id name email role approval_status managerId')
        .sort({ name: 1 })
        .lean();

      return NextResponse.json({ success: true, team: secondaries });
    }

    return NextResponse.json(
      { success: false, error: 'Access denied' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Get team users error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
