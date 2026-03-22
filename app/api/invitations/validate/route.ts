import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invitation from '@/models/Invitation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'token is required' },
        { status: 400 }
      );
    }

    const invitation = await Invitation.findOne({
      token,
      used: false,
      expires_at: { $gt: new Date() },
    }).select('email role managerId expires_at');

    if (!invitation) {
      return NextResponse.json(
        { success: false, valid: false, error: 'Invalid or expired invitation' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      invitation,
    });
  } catch (error) {
    console.error('Invitation validate error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}