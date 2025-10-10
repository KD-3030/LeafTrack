import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import BOM from '@/models/BOM';
import Product from '@/models/Product';
import { verifyToken } from '@/lib/auth';

// GET /api/boms - Get all BOMs
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
    const product_id = searchParams.get('product_id');
    const status = searchParams.get('status');
    const is_current = searchParams.get('is_current');
    const search = searchParams.get('search');

    interface QueryType {
      product_id?: string;
      status?: string;
      is_current?: boolean;
      $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
    }
    const query: QueryType = {};

    if (product_id) {
      query.product_id = product_id;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (is_current !== null && is_current !== undefined && is_current !== 'all') {
      query.is_current = is_current === 'true';
    }

    if (search) {
      query.$or = [
        { product_name: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { created_by_name: { $regex: search, $options: 'i' } },
      ];
    }

    const boms = await BOM.find(query)
      .sort({ created_at: -1 })
      .lean();

    // Get summary statistics
    const summary = {
      total_boms: boms.length,
      active_boms: boms.filter(b => b.status === 'active').length,
      draft_boms: boms.filter(b => b.status === 'draft').length,
      archived_boms: boms.filter(b => b.status === 'archived').length,
      current_boms: boms.filter(b => b.is_current).length,
    };

    return NextResponse.json({
      success: true,
      boms,
      summary,
    });
  } catch (error) {
    console.error('Error fetching BOMs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch BOMs' },
      { status: 500 }
    );
  }
}

// POST /api/boms - Create new BOM
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
    const requiredFields = ['product_id', 'materials'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate materials array
    if (!Array.isArray(body.materials) || body.materials.length === 0) {
      return NextResponse.json(
        { error: 'BOM must have at least one material' },
        { status: 400 }
      );
    }

    // Get product details
    const product = await Product.findById(body.product_id);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get the next version number for this product
    const lastBOM = await BOM.findOne({ product_id: body.product_id })
      .sort({ version: -1 })
      .lean();
    
    const nextVersion = lastBOM ? lastBOM.version + 1 : 1;

    // If this is being set as current, unset other current BOMs for this product
    if (body.is_current || body.status === 'active') {
      await BOM.updateMany(
        { product_id: body.product_id, is_current: true },
        { is_current: false }
      );
    }

    // Calculate costs from materials
    const total_manufacturing_cost = body.materials.reduce((sum: number, material: { total_cost?: number }) => {
      return sum + (material.total_cost || 0);
    }, 0);

    const overhead_percentage = body.overhead_percentage || 0;
    const overhead_amount = (total_manufacturing_cost * overhead_percentage) / 100;
    const final_cost = total_manufacturing_cost + overhead_amount;

    // Create BOM
    const bom = new BOM({
      ...body,
      product_name: product.name,
      version: nextVersion,
      total_manufacturing_cost,
      final_cost,
      overhead_percentage,
      created_by: decoded.userId,
      created_by_name: decoded.name || 'Admin',
      is_current: body.is_current || body.status === 'active',
    });

    await bom.save();

    // Update product manufacturing cost if this is the current BOM
    if (bom.is_current) {
      product.manufacturingCost = bom.final_cost;
      await product.save();
      
      console.log(`✅ Updated product ${product.name} manufacturing cost to ₹${bom.final_cost}`);
    }

    return NextResponse.json({
      success: true,
      message: 'BOM created successfully' + (bom.is_current ? ' and product cost updated' : ''),
      bom,
    });
  } catch (error) {
    console.error('Error creating BOM:', error);
    return NextResponse.json(
      { error: 'Failed to create BOM', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
