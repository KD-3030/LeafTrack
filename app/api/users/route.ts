import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
import { requireAdminAuth } from '@/lib/authMiddleware';
import { Model } from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const UserModel = User as Model<IUser>;
    const users = await UserModel.find({})
      .select('-password')
      .populate('managerId', 'name email role')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      users,
    });

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
