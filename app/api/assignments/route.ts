import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Assignment, { IAssignment } from '@/models/Assignment';
import Product from '@/models/Product'; // Import Product model for population
import User from '@/models/User'; // Import User model for population
import { verifyToken } from '@/lib/auth';
import { Model } from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Ensure models are registered by importing and accessing the default exports
    // This forces the model registration code to run
    const ProductModel = Product;
    const UserModel = User;
    
    // Get auth token to identify the user
    const authHeader = request.headers.get('authorization');
    let userFilter = {};
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        
        // If user is a salesman, filter assignments for that salesman only
        if (decoded && decoded.role === 'Salesman') {
          userFilter = { salesman_id: decoded.userId };
        }
        // Admin can see all assignments (no filter)
      } catch (error) {
        // If token is invalid, continue without filtering (for backwards compatibility)
        console.warn('Invalid token in assignments request:', error);
      }
    }
    
    const AssignmentModel = Assignment as Model<IAssignment>;
    const assignments = await AssignmentModel.find(userFilter)
      .populate('salesman_id', 'name email')
      .populate('product_id', 'name price')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      assignments,
    });

  } catch (error) {
    console.error('Get assignments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Ensure models are registered by importing and accessing the default exports
    // This forces the model registration code to run
    const ProductModel = Product;
    const UserModel = User;
    
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
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { salesman_id, product_id, quantity } = await request.json();

    // Validate input
    if (!salesman_id || !product_id || !quantity) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Create assignment
    const AssignmentModel = Assignment as Model<IAssignment>;
    const assignment = await AssignmentModel.create({
      salesman_id,
      product_id,
      quantity: parseInt(quantity),
    });

    const populatedAssignment = await AssignmentModel.findById(assignment._id)
      .populate('salesman_id', 'name email')
      .populate('product_id', 'name price');

    return NextResponse.json({
      success: true,
      assignment: populatedAssignment,
    });

  } catch (error) {
    console.error('Create assignment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
