import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Location, { ILocation } from '@/models/Location';
import { verifyToken } from '@/lib/auth';
import { Model } from 'mongoose';

// Clear all location data (admin only)
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    // Verify admin token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const LocationModel = Location as Model<ILocation>;
    
    // Delete all location records
    const result = await LocationModel.deleteMany({});

    return NextResponse.json({
      success: true,
      deleted: result.deletedCount,
      message: `Cleared ${result.deletedCount} location records. Ready for new Kolkata locations.`
    });

  } catch (error) {
    console.error('Clear locations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
