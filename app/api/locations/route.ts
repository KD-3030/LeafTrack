import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Location, { ILocation } from '@/models/Location';
import User from '@/models/User'; // Import User model to ensure it's registered
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

// GET - Retrieve locations (admin can get all, salesman can get own)
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Ensure User model is registered for population
    User; // Force User model registration
    
    // Verify token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const salesmanId = searchParams.get('salesman_id');
    const hours = searchParams.get('hours') || '24';
    const limit = parseInt(searchParams.get('limit') || '100');

    // Calculate time filter (default last 24 hours)
    const timeFilter = new Date();
    timeFilter.setHours(timeFilter.getHours() - parseInt(hours));

    let query: any = { timestamp: { $gte: timeFilter } };

    // If salesman, only show own locations
    if (decoded.role === 'Salesman') {
      query.salesman_id = decoded.userId;
    } else if (salesmanId) {
      // Admin can filter by specific salesman
      query.salesman_id = salesmanId;
    }

    const locations = await (Location as mongoose.Model<ILocation>).find(query)
      .populate('salesman_id', 'name email')
      .sort({ timestamp: -1 })
      .limit(limit);

    return NextResponse.json({
      success: true,
      locations,
    });

  } catch (error) {
    console.error('Get locations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new location (salesman only)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Verify token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'Salesman') {
      return NextResponse.json(
        { error: 'Only salesmen can submit locations' },
        { status: 403 }
      );
    }

    const { latitude, longitude, accuracy, address } = await request.json();

    // Validate input
    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    if (latitude < -90 || latitude > 90) {
      return NextResponse.json(
        { error: 'Invalid latitude' },
        { status: 400 }
      );
    }

    if (longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid longitude' },
        { status: 400 }
      );
    }

    // Create location
    const location = await (Location as mongoose.Model<ILocation>).create({
      salesman_id: decoded.userId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy ? parseFloat(accuracy) : undefined,
      address,
      timestamp: new Date(),
    });

    const populatedLocation = await (Location as mongoose.Model<ILocation>).findById(location._id)
      .populate('salesman_id', 'name email');

    return NextResponse.json({
      success: true,
      location: populatedLocation,
    });

  } catch (error) {
    console.error('Create location error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Cleanup old locations (admin only)
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

    // Delete locations older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await (Location as mongoose.Model<ILocation>).deleteMany({
      timestamp: { $lt: sevenDaysAgo }
    });

    return NextResponse.json({
      success: true,
      deleted: result.deletedCount,
      message: `Deleted ${result.deletedCount} old location records`
    });

  } catch (error) {
    console.error('Delete old locations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
