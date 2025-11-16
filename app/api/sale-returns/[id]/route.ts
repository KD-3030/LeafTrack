import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import SaleReturn from '@/models/SaleReturn';
import { requireAdminAuth } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

// DELETE - Delete a sale return
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // Use standardized admin authentication
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = params;

    // Find and delete the sale return
    const deletedReturn = await SaleReturn.findByIdAndDelete(id);

    if (!deletedReturn) {
      return NextResponse.json(
        { success: false, error: 'Sale return not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Sale return deleted successfully',
      deletedReturn,
    });

  } catch (error) {
    console.error('Delete sale return error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get a single sale return by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // Use standardized authentication
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = params;

    const saleReturn = await SaleReturn.findById(id)
      .populate('customer_id', 'name email phone')
      .populate('salesman_id', 'name email')
      .populate('original_invoice_id', 'invoice_number invoice_date')
      .populate('approved_by', 'name');

    if (!saleReturn) {
      return NextResponse.json(
        { success: false, error: 'Sale return not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      saleReturn,
    });

  } catch (error) {
    console.error('Get sale return error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update a sale return
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // Use standardized admin authentication
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = params;
    const updates = await request.json();

    // Fields that can be updated
    const allowedUpdates = ['status', 'refund_status', 'notes', 'refund_method'];
    const updateData: Record<string, unknown> = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        updateData[key] = updates[key];
      }
    }

    const updatedReturn = await SaleReturn.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedReturn) {
      return NextResponse.json(
        { success: false, error: 'Sale return not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Sale return updated successfully',
      saleReturn: updatedReturn,
    });

  } catch (error) {
    console.error('Update sale return error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
