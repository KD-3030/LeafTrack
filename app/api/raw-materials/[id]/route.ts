import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RawMaterial from '@/models/RawMaterial';
import { verifyToken } from '@/lib/auth';

// GET /api/raw-materials/[id] - Get single raw material
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

    const material = await RawMaterial.findById(params.id).lean();

    if (!material) {
      return NextResponse.json({ error: 'Raw material not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      material,
    });
  } catch (error) {
    console.error('Error fetching raw material:', error);
    return NextResponse.json(
      { error: 'Failed to fetch raw material' },
      { status: 500 }
    );
  }
}

// PUT /api/raw-materials/[id] - Update raw material
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

    const material = await RawMaterial.findById(params.id);

    if (!material) {
      return NextResponse.json({ error: 'Raw material not found' }, { status: 404 });
    }

    const body = await request.json();

    // Update fields
    if (body.name !== undefined) material.name = body.name;
    if (body.description !== undefined) material.description = body.description;
    if (body.unit !== undefined) material.unit = body.unit;
    if (body.base_cost_per_unit !== undefined) material.base_cost_per_unit = body.base_cost_per_unit;
    if (body.current_stock !== undefined) material.current_stock = body.current_stock;
    if (body.min_stock_level !== undefined) material.min_stock_level = body.min_stock_level;
    if (body.supplier !== undefined) material.supplier = body.supplier;
    if (body.is_active !== undefined) material.is_active = body.is_active;

    await material.save();

    return NextResponse.json({
      success: true,
      message: 'Raw material updated successfully',
      material,
    });
  } catch (error) {
    console.error('Error updating raw material:', error);
    return NextResponse.json(
      { error: 'Failed to update raw material' },
      { status: 500 }
    );
  }
}

// DELETE /api/raw-materials/[id] - Delete raw material
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

    const material = await RawMaterial.findById(params.id);

    if (!material) {
      return NextResponse.json({ error: 'Raw material not found' }, { status: 404 });
    }

    await RawMaterial.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: 'Raw material deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting raw material:', error);
    return NextResponse.json(
      { error: 'Failed to delete raw material' },
      { status: 500 }
    );
  }
}
