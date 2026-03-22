import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Assignment, { IAssignment } from '@/models/Assignment';
import Product from '@/models/Product';
import User from '@/models/User';
import { requireAdminAuth, requireUserAuth, DecodedToken } from '@/lib/authMiddleware';
import mongoose from 'mongoose';
import { normalizeRoleId } from '@/lib/roles';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

// DELETE /api/assignments/[id] - Delete an assignment and return stock to product
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    await connectDB();

    // Use standardized admin authentication
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = params;

    // Validate assignment ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid assignment ID' },
        { status: 400 }
      );
    }

    // Start a transaction to ensure data consistency
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // First, find the assignment to get the productId and quantity
        const assignment = await Assignment.findById(id)
          .populate('productId')
          .session(session);

        if (!assignment) {
          throw new Error('Assignment not found');
        }

        const assignmentData = assignment as IAssignment;
        const productId = assignmentData.productId;
        const quantityToReturn = assignmentData.quantity;

        // Find the product and return the stock
        const product = await Product.findById(productId).session(session);
        
        if (!product) {
          throw new Error('Associated product not found');
        }

        // Return the assigned quantity back to product stock
        const updatedProduct = await Product.findByIdAndUpdate(
          productId,
          { 
            $inc: { totalStock: quantityToReturn },
            updatedAt: new Date()
          },
          { 
            new: true,
            session: session
          }
        );

        if (!updatedProduct) {
          throw new Error('Failed to update product stock');
        }

        // Delete the assignment
        const deletedAssignment = await Assignment.findByIdAndDelete(id, { session });
        
        if (!deletedAssignment) {
          throw new Error('Failed to delete assignment');
        }

        console.log(`✅ Assignment deleted: ${id}`);
        console.log(`📦 Stock returned: ${quantityToReturn} units to product ${product.name}`);
        console.log(`📊 Updated product stock: ${updatedProduct.totalStock}`);
      });

      await session.endSession();

      return NextResponse.json({
        success: true,
        message: 'Assignment deleted successfully and stock returned to inventory'
      });

    } catch (transactionError) {
      await session.endSession();
      console.error('Transaction failed:', transactionError);
      
      return NextResponse.json(
        { 
          success: false, 
          error: transactionError instanceof Error ? transactionError.message : 'Failed to delete assignment'
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in DELETE /api/assignments/[id]:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// GET /api/assignments/[id] - Get a specific assignment
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    await connectDB();

    // Use standardized authentication
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const decoded = authResult as DecodedToken;
    const currentUser = await User.findById(decoded.userId).select('role managerId');
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    const { id } = params;

    // Validate assignment ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid assignment ID' },
        { status: 400 }
      );
    }

    const query: Record<string, string> = { _id: id };
    const roleId = normalizeRoleId(currentUser.role);

    if (roleId === 'secondary_executive') {
      if (!currentUser.managerId) {
        return NextResponse.json(
          { success: false, error: 'Secondary executive is not assigned to a primary executive' },
          { status: 400 }
        );
      }
      Object.assign(query, { salesman_id: currentUser.managerId.toString() });
    } else if (roleId === 'primary_executive') {
      Object.assign(query, { salesman_id: decoded.userId });
    }

    const assignment = await Assignment.findOne(query)
      .populate('salesman_id', 'name email')
      .populate('productId', 'name manufacturingCost totalStock hsn_code gst_rate');

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      assignment
    });

  } catch (error) {
    console.error('Error in GET /api/assignments/[id]:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}