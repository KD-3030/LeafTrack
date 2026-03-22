import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
import Invitation from '@/models/Invitation';
import { hashPassword } from '@/lib/auth';
import { Model, Types } from 'mongoose';
import { roleIdToDbRole, normalizeRoleId } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { name, email, password, invitationToken } = await request.json();

    // Validate input
    if (!name || !email || !password || !invitationToken) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const invitation = await Invitation.findOne({
      token: invitationToken,
      used: false,
      expires_at: { $gt: new Date() },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation link' },
        { status: 400 }
      );
    }

    if (invitation.email.toLowerCase() !== String(email).toLowerCase()) {
      return NextResponse.json(
        { error: 'Email does not match invitation' },
        { status: 400 }
      );
    }

    const invitedRole = normalizeRoleId(invitation.role);
    if (!invitedRole || invitedRole === 'admin' || invitedRole === 'customer') {
      return NextResponse.json(
        { error: 'Invitation role is invalid' },
        { status: 400 }
      );
    }

    if (invitedRole === 'secondary_executive' && !invitation.managerId) {
      return NextResponse.json(
        { error: 'Secondary executive invitations require a primary manager assignment' },
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

    // Create user from invitation with pending approval.
    const user = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      role: roleIdToDbRole(invitedRole),
      managerId: invitation.managerId,
      invited_by: invitation.invited_by,
      approval_status: 'pending',
    });

    invitation.used = true;
    invitation.used_at = new Date();
    invitation.user_id = user._id as Types.ObjectId;
    await invitation.save();

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
      message: 'Account created. Awaiting admin approval.',
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}