import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Location, { ILocation } from '@/models/Location';
import User, { IUser } from '@/models/User';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

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
    const salesmen = await (User as mongoose.Model<IUser>).find({ role: 'Salesman' });

    if (salesmen.length === 0) {
      return NextResponse.json(
        { error: 'No salesmen found' },
        { status: 404 }
      );
    }
    
    // Create sample locations for each salesman
    const sampleLocations = [];
    
    for (const salesman of salesmen) {
      // Create 3-5 location points per salesman
      const locationCount = Math.floor(Math.random() * 3) + 3;
      
      for (let i = 0; i < locationCount; i++) {
        // Generate random coordinates around Kolkata, West Bengal area
        // Including major areas: Park Street, Salt Lake, Howrah, New Town, etc.
        const kolkataAreas = [
          { lat: 22.5726, lng: 88.3639, name: "Central Kolkata (Park Street)" },
          { lat: 22.5675, lng: 88.4326, name: "Salt Lake City" },
          { lat: 22.5958, lng: 88.2636, name: "Howrah" },
          { lat: 22.6203, lng: 88.4370, name: "New Town" },
          { lat: 22.5204, lng: 88.3856, name: "South Kolkata (Ballygunge)" },
          { lat: 22.6757, lng: 88.3711, name: "Dum Dum" },
          { lat: 22.4707, lng: 88.3378, name: "Jadavpur" },
          { lat: 22.5049, lng: 88.3200, name: "Tollygunge" }
        ];
        
        const baseArea = kolkataAreas[Math.floor(Math.random() * kolkataAreas.length)];
        
        // Add some randomness around the selected area (±0.02 degrees ~ 2km)
        const latitude = baseArea.lat + (Math.random() - 0.5) * 0.04;
        const longitude = baseArea.lng + (Math.random() - 0.5) * 0.04;
        
        const timestamp = new Date();
        timestamp.setMinutes(timestamp.getMinutes() - Math.floor(Math.random() * 60)); // Random time in last hour
        
        const location = await (Location as mongoose.Model<ILocation>).create({
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
      message: `Created ${sampleLocations.length} sample location records around Kolkata area`,
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
