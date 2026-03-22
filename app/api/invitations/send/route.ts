import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invitation from '@/models/Invitation';
import User from '@/models/User';
import { requireAdminAuth } from '@/lib/authMiddleware';
import { generateSecureToken } from '@/lib/security';
import { normalizeRoleId, roleIdToDbRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { email, role, managerId } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { success: false, error: 'email and role are required' },
        { status: 400 }
      );
    }

    const roleId = normalizeRoleId(role);
    if (!roleId || (roleId !== 'primary_executive' && roleId !== 'secondary_executive')) {
      return NextResponse.json(
        { success: false, error: 'Role must be primary_executive or secondary_executive' },
        { status: 400 }
      );
    }

    if (roleId === 'secondary_executive' && !managerId) {
      return NextResponse.json(
        { success: false, error: 'managerId is required for secondary_executive invites' },
        { status: 400 }
      );
    }

    if (managerId) {
      const manager = await User.findById(managerId);
      if (!manager || manager.role !== 'PrimaryExecutive') {
        return NextResponse.json(
          { success: false, error: 'managerId must belong to a primary executive' },
          { status: 400 }
        );
      }
    }

    const existingUser = await User.findOne({ email: String(email).toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User already exists with this email' },
        { status: 400 }
      );
    }

    const activeInvite = await Invitation.findOne({
      email: String(email).toLowerCase(),
      used: false,
      expires_at: { $gt: new Date() },
    });

    if (activeInvite) {
      return NextResponse.json(
        { success: false, error: 'An active invitation already exists for this email' },
        { status: 400 }
      );
    }

    const token = generateSecureToken(24);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await Invitation.create({
      token,
      email: String(email).toLowerCase(),
      role: roleIdToDbRole(roleId),
      managerId: managerId || undefined,
      invited_by: authResult.userId,
      expires_at: expiresAt,
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        managerId: invitation.managerId,
        expires_at: invitation.expires_at,
      },
      inviteLink: `/signup?token=${token}`,
    });
  } catch (error) {
    console.error('Invitation send error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}