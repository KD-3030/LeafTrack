import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RawMaterial from '@/models/RawMaterial';
import { verifyToken } from '@/lib/auth';

// GET /api/raw-materials - Get all raw materials
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const is_active = searchParams.get('is_active');

    interface QueryType {
      is_active?: boolean;
      $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
    }
    const query: QueryType = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } },
      ];
    }

    if (is_active !== null && is_active !== undefined && is_active !== 'all') {
      query.is_active = is_active === 'true';
    }

    const materials = await RawMaterial.find(query).sort({ name: 1 }).lean();

    return NextResponse.json({
      success: true,
      materials,
      count: materials.length,
    });
  } catch (error) {
    console.error('Error fetching raw materials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch raw materials' },
      { status: 500 }
    );
  }
}

// POST /api/raw-materials - Create new raw material
export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'unit', 'base_cost_per_unit'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Check if material with same name already exists
    const existing = await RawMaterial.findOne({ name: body.name });
    if (existing) {
      return NextResponse.json(
        { error: 'A raw material with this name already exists' },
        { status: 400 }
      );
    }

    const material = new RawMaterial(body);
    await material.save();

    return NextResponse.json({
      success: true,
      message: 'Raw material created successfully',
      material,
    });
  } catch (error) {
    console.error('Error creating raw material:', error);
    return NextResponse.json(
      { error: 'Failed to create raw material' },
      { status: 500 }
    );
  }
}
