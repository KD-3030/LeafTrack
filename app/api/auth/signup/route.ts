import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
import { hashPassword, generateToken } from '@/lib/auth';
import { Model } from 'mongoose';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { name, email, password, role } = await request.json();

    // Validate input
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const UserModel = User as Model<IUser>;
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Normalize role to match schema enum: 'Admin', 'Salesman', 'Customer'
    const normalizedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

    // Create user with normalized role
    const user = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      role: normalizedRole,
    });

    // Generate token with user name
    const token = generateToken((user._id as string).toString(), user.role, user.name);

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
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}