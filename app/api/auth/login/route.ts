import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
import { comparePassword, generateToken } from '@/lib/auth';
import { Model } from 'mongoose';
import { strictRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = strictRateLimit(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    await connectDB();
    
    const { email, password, role } = await request.json();

    // Validate input
    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Find user
    const UserModel = User as Model<IUser>;
    const user = await UserModel.findOne({ email, role });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials or role mismatch' },
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

    // Generate token
    const token = generateToken((user._id as string).toString(), user.role);

    // Return user data (without password)
    const userData = {
      id: (user._id as string).toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.createdAt,
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