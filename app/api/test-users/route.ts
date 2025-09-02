import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { Model } from 'mongoose';

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

    const UserModel = User as Model<any>;
    
    // Check if test salesmen already exist
    const existingSalesmen = await UserModel.find({ 
      role: 'Salesman',
      email: { $in: ['john.doe@leaftrack.com', 'jane.smith@leaftrack.com', 'mike.johnson@leaftrack.com'] }
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
        name: 'John Doe',
        email: 'john.doe@leaftrack.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Salesman',
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@leaftrack.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Salesman',
      },
      {
        name: 'Mike Johnson',
        email: 'mike.johnson@leaftrack.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Salesman',
      },
    ];

    const createdUsers = [];
    for (const userData of testSalesmen) {
      // Check if user already exists
      const existingUser = await UserModel.findOne({ email: userData.email });
      if (!existingUser) {
        const user = await UserModel.create(userData);
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
