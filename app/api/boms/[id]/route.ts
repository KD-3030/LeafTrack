import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import BOM from '@/models/BOM';
import Product from '@/models/Product';
import { verifyToken } from '@/lib/auth';

// GET /api/boms/[id] - Get single BOM
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
    if (!decoded || decoded.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const bom = await BOM.findById(params.id).lean();

    if (!bom) {
      return NextResponse.json({ error: 'BOM not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      bom,
    });
  } catch (error) {
    console.error('Error fetching BOM:', error);
    return NextResponse.json(
      { error: 'Failed to fetch BOM' },
      { status: 500 }
    );
  }
}

// PUT /api/boms/[id] - Update BOM
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
    if (!decoded || decoded.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const bom = await BOM.findById(params.id);

    if (!bom) {
      return NextResponse.json({ error: 'BOM not found' }, { status: 404 });
    }

    const body = await request.json();

    // Update fields
    if (body.materials !== undefined) bom.materials = body.materials;
    if (body.overhead_percentage !== undefined) bom.overhead_percentage = body.overhead_percentage;
    if (body.notes !== undefined) bom.notes = body.notes;
    if (body.status !== undefined) bom.status = body.status;

    // Handle is_current flag
    if (body.is_current !== undefined || body.status === 'active') {
      const shouldBeCurrent = body.is_current || body.status === 'active';
      
      if (shouldBeCurrent && !bom.is_current) {
        // Unset other current BOMs for this product
        await BOM.updateMany(
          { product_id: bom.product_id, _id: { $ne: bom._id }, is_current: true },
          { is_current: false }
        );
        bom.is_current = true;
      } else if (!shouldBeCurrent) {
        bom.is_current = false;
      }
    }

    await bom.save();

    // Update product manufacturing cost if this is the current BOM
    if (bom.is_current) {
      const product = await Product.findById(bom.product_id);
      if (product) {
        product.manufacturingCost = bom.final_cost;
        await product.save();
        
        console.log(`✅ Updated product ${product.name} manufacturing cost to ₹${bom.final_cost}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'BOM updated successfully' + (bom.is_current ? ' and product cost updated' : ''),
      bom,
    });
  } catch (error) {
    console.error('Error updating BOM:', error);
    return NextResponse.json(
      { error: 'Failed to update BOM', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/boms/[id] - Delete BOM
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
    if (!decoded || decoded.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const bom = await BOM.findById(params.id);

    if (!bom) {
      return NextResponse.json({ error: 'BOM not found' }, { status: 404 });
    }

    // Don't allow deleting the current active BOM
    if (bom.is_current && bom.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot delete the current active BOM. Please set another BOM as current first.' },
        { status: 400 }
      );
    }

    await BOM.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: 'BOM deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting BOM:', error);
    return NextResponse.json(
      { error: 'Failed to delete BOM' },
      { status: 500 }
    );
  }
}
