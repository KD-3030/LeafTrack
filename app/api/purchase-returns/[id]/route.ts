import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PurchaseReturn from '@/models/PurchaseReturn';
import { verifyToken } from '@/lib/auth';

// GET /api/purchase-returns/[id] - Get a single purchase return
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const purchaseReturn = await PurchaseReturn.findById(params.id).lean();

    if (!purchaseReturn) {
      return NextResponse.json({ error: 'Purchase return not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      return: purchaseReturn,
    });
  } catch (error) {
    console.error('Error fetching purchase return:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase return' },
      { status: 500 }
    );
  }
}

// PUT /api/purchase-returns/[id] - Update a purchase return
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();

    // Find existing purchase return
    const existingReturn = await PurchaseReturn.findById(params.id);
    if (!existingReturn) {
      return NextResponse.json({ error: 'Purchase return not found' }, { status: 404 });
    }

    // Recalculate total_return_amount if quantity or unit_price changed
    if (body.returned_quantity || body.unit_price) {
      const quantity = body.returned_quantity || existingReturn.returned_quantity;
      const unit_price = body.unit_price || existingReturn.unit_price;
      body.total_return_amount = quantity * unit_price;
    }

    // Recalculate final_return_amount if related fields changed
    if (body.total_return_amount || body.tax_amount !== undefined || body.discount_amount !== undefined) {
      const total = body.total_return_amount || existingReturn.total_return_amount;
      const tax = body.tax_amount !== undefined ? body.tax_amount : existingReturn.tax_amount;
      const discount = body.discount_amount !== undefined ? body.discount_amount : existingReturn.discount_amount;
      body.final_return_amount = total + tax - discount;
    }

    // Update the purchase return
    const updatedReturn = await PurchaseReturn.findByIdAndUpdate(
      params.id,
      { ...body, updated_at: new Date() },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Purchase return updated successfully',
      return: updatedReturn,
    });
  } catch (error) {
    console.error('Error updating purchase return:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update purchase return' },
      { status: 500 }
    );
  }
}

// DELETE /api/purchase-returns/[id] - Delete a purchase return
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const purchaseReturn = await PurchaseReturn.findByIdAndDelete(params.id);

    if (!purchaseReturn) {
      return NextResponse.json({ error: 'Purchase return not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase return deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting purchase return:', error);
    return NextResponse.json(
      { error: 'Failed to delete purchase return' },
      { status: 500 }
    );
  }
}
