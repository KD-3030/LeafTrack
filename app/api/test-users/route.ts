import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Test endpoint to create sample salesman users
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

    // Check if test salesmen already exist
    const existingSalesmen = await (User as mongoose.Model<IUser>).find({ 
      role: 'Salesman',
      email: { $in: ['john.smith@leaftrack.com', 'sarah.johnson@leaftrack.com', 'mike.wilson@leaftrack.com'] }
    });

    if (existingSalesmen.length >= 3) {
      return NextResponse.json({
        success: true,
        message: 'Test salesmen already exist',
        count: existingSalesmen.length,
      });
    }

    // Create test salesmen
    const testSalesmen = [
      {
        name: 'John Smith',
        email: 'john.smith@leaftrack.com',
        password: await bcrypt.hash('sales123', 10),
        role: 'Salesman',
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@leaftrack.com',
        password: await bcrypt.hash('sales123', 10),
        role: 'Salesman',
      },
      {
        name: 'Mike Wilson',
        email: 'mike.wilson@leaftrack.com',
        password: await bcrypt.hash('sales123', 10),
        role: 'Salesman',
      },
    ];

    const createdUsers = [];
    for (const userData of testSalesmen) {
      // Check if user already exists
      const existingUser = await (User as mongoose.Model<IUser>).findOne({ email: userData.email });
      if (!existingUser) {
        const user = await (User as mongoose.Model<IUser>).create(userData);
        createdUsers.push(user);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdUsers.length} test salesman accounts`,
      users: createdUsers.length,
    });

  } catch (error) {
    console.error('Test users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
