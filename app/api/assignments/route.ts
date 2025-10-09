import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Assignment, { IAssignment } from '@/models/Assignment';
import Product, { IProduct } from '@/models/Product';
import { requireUserAuth, requireAdminAuth, DecodedToken } from '@/lib/authMiddleware';
import { Model } from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Use standardized authentication with user filtering
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const decoded = authResult as DecodedToken;
    
    // Create user filter for data access
    let userFilter = {};
    
    // If user is a salesman, filter assignments for that salesman only
    if (decoded.role?.toLowerCase() === 'salesman') {
      userFilter = { salesman_id: decoded.userId };
    }
    // Admin can see all assignments (no filter)
    
    const AssignmentModel = Assignment as Model<IAssignment>;
    const assignments = await AssignmentModel.find(userFilter)
      .populate('salesman_id', 'name email')
      .populate('productId', 'name manufacturingCost hsn_code totalStock gst_rate')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      assignments,
    });

  } catch (error) {
    console.error('Get assignments error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Use standardized admin authentication
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { salesmanId, productId, quantity, sellingPricePerUnit } = await request.json();

    // Validate input
    if (!salesmanId || !productId || !quantity || !sellingPricePerUnit) {
      return NextResponse.json(
        { success: false, error: 'All fields are required: salesmanId, productId, quantity, sellingPricePerUnit' },
        { status: 400 }
      );
    }

    // Find the product and verify stock availability
    const ProductModel = Product as Model<IProduct>;
    const product = await ProductModel.findById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    if (product.totalStock < quantity) {
      return NextResponse.json(
        { success: false, error: `Insufficient stock. Available: ${product.totalStock}, Requested: ${quantity}` },
        { status: 400 }
      );
    }

    // Create assignment
    const AssignmentModel = Assignment as Model<IAssignment>;
    const assignment = await AssignmentModel.create({
      salesman_id: salesmanId,
      productId,
      quantity: parseInt(quantity),
      sellingPricePerUnit: parseFloat(sellingPricePerUnit),
    });

    // Decrement the product's total stock
    product.totalStock -= parseInt(quantity);
    await product.save();

    // Populate the assignment for response
    const populatedAssignment = await AssignmentModel.findById(assignment._id)
      .populate('salesman_id', 'name email')
      .populate('productId', 'name manufacturingCost hsn_code');

    return NextResponse.json({
      success: true,
      assignment: populatedAssignment,
    });

  } catch (error) {
    console.error('Create assignment error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
