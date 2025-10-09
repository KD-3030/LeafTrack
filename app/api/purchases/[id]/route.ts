import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Purchase from '@/models/Purchase';
import { verifyToken } from '@/lib/auth';

// GET /api/purchases/[id] - Get a single purchase
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

    const purchase = await Purchase.findById(params.id).lean();

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      purchase,
    });
  } catch (error) {
    console.error('Error fetching purchase:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase' },
      { status: 500 }
    );
  }
}

// PUT /api/purchases/[id] - Update a purchase
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

    // Find existing purchase
    const existingPurchase = await Purchase.findById(params.id);
    if (!existingPurchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    // Recalculate total_amount if quantity or unit_price changed
    if (body.quantity || body.unit_price) {
      const quantity = body.quantity || existingPurchase.quantity;
      const unit_price = body.unit_price || existingPurchase.unit_price;
      body.total_amount = quantity * unit_price;
    }

    // Recalculate final_amount if related fields changed
    if (body.total_amount || body.tax_amount !== undefined || body.discount_amount !== undefined) {
      const total = body.total_amount || existingPurchase.total_amount;
      const tax = body.tax_amount !== undefined ? body.tax_amount : existingPurchase.tax_amount;
      const discount = body.discount_amount !== undefined ? body.discount_amount : existingPurchase.discount_amount;
      body.final_amount = total + tax - discount;
    }

    // Update the purchase
    const updatedPurchase = await Purchase.findByIdAndUpdate(
      params.id,
      { ...body, updated_at: new Date() },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Purchase updated successfully',
      purchase: updatedPurchase,
    });
  } catch (error) {
    console.error('Error updating purchase:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update purchase' },
      { status: 500 }
    );
  }
}

// DELETE /api/purchases/[id] - Delete a purchase
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

    const purchase = await Purchase.findByIdAndDelete(params.id);

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting purchase:', error);
    return NextResponse.json(
      { error: 'Failed to delete purchase' },
      { status: 500 }
    );
  }
}
