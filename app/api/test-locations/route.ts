import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Location, { ILocation } from '@/models/Location';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { Model } from 'mongoose';

// Test endpoint to create sample location data
export async function POST(request: NextRequest) {
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

    // Get all salesmen
    const UserModel = User as Model<any>;
    const salesmen = await UserModel.find({ role: 'Salesman' });

    if (salesmen.length === 0) {
      return NextResponse.json(
        { error: 'No salesmen found' },
        { status: 404 }
      );
    }

    const LocationModel = Location as Model<ILocation>;
    
    // Create sample locations for each salesman
    const sampleLocations = [];
    
    for (const salesman of salesmen) {
      // Create 3-5 location points per salesman
      const locationCount = Math.floor(Math.random() * 3) + 3;
      
      for (let i = 0; i < locationCount; i++) {
        // Generate random coordinates around New York City area
        const baseLatitude = 40.7128;
        const baseLongitude = -74.0060;
        
        const latitude = baseLatitude + (Math.random() - 0.5) * 0.1; // ±0.05 degrees
        const longitude = baseLongitude + (Math.random() - 0.5) * 0.1;
        
        const timestamp = new Date();
        timestamp.setMinutes(timestamp.getMinutes() - Math.floor(Math.random() * 60)); // Random time in last hour
        
        const location = await LocationModel.create({
          salesman_id: salesman._id,
          latitude,
          longitude,
          accuracy: Math.floor(Math.random() * 20) + 5, // 5-25 meters
          timestamp,
        });
        
        sampleLocations.push(location);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${sampleLocations.length} sample location records`,
      locations: sampleLocations.length,
    });

  } catch (error) {
    console.error('Test locations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
