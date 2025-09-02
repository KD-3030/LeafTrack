import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { Model } from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const UserModel = User as Model<IUser>;
    const users = await UserModel.find({}).select('-password').sort({ createdAt: -1 });
    
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
