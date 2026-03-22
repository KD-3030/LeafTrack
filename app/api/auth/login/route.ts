import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
import { comparePassword, generateToken } from '@/lib/auth';
import { Model } from 'mongoose';
import { strictRateLimit } from '@/lib/rateLimit';
import { normalizeRoleId, roleIdToDbRole } from '@/lib/roles';

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
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Normalize role and map it to canonical DB enum value.
    const normalizedRoleId = normalizeRoleId(role);
    if (!normalizedRoleId) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    const normalizedRole = roleIdToDbRole(normalizedRoleId);
    
    console.log('🔐 Login attempt:', { email, role: normalizedRole, hasPassword: !!password });
    
    const UserModel = User as Model<IUser>;
    const user = await UserModel.findOne({ 
      email, 
      role: normalizedRole 
    });
    
    if (!user) {
      console.log('❌ User not found or role mismatch:', { email, role: normalizedRole });
      // Check if user exists with different role
      const userWithEmail = await UserModel.findOne({ email });
      if (userWithEmail) {
        console.log('⚠️ User exists but with role:', userWithEmail.role);
      }
      return NextResponse.json(
        { error: 'Invalid credentials or role mismatch' },
        { status: 401 }
      );
    }

    console.log('✅ User found:', { email, role: user.role });

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    console.log('✅ Password verified for user:', email);

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

    // Generate token with user name
    const token = generateToken((user._id as string).toString(), user.role, user.name);

    // Return user data (without password)
    const userData = {
      id: (user._id as string).toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      managerId: user.managerId,
      approval_status: user.approval_status,
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