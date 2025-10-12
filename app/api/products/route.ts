import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product, { IProduct } from '@/models/Product';
import { requireAdminAuth } from '@/lib/authMiddleware';
import { Model } from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get pagination parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    
    // Build filter
    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { hsn_code: { $regex: search, $options: 'i' } },
      ];
    }
    
    const ProductModel = Product as Model<IProduct>;
    
    // Get total count
    const total = await ProductModel.countDocuments(filter);
    
    // Get paginated products
    const products = await ProductModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    return NextResponse.json({
      success: true,
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCount: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });

  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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

    const { name, manufacturingCost, totalStock, hsn_code, gst_rate } = await request.json();

    // Validate input
    if (!name || manufacturingCost === undefined || totalStock === undefined || !hsn_code || gst_rate === undefined) {
      return NextResponse.json(
        { error: 'All fields are required: name, manufacturingCost, totalStock, hsn_code, gst_rate' },
        { status: 400 }
      );
    }

    // Create product
    const ProductModel = Product as Model<IProduct>;
    const product = await ProductModel.create({
      name,
      manufacturingCost: parseFloat(manufacturingCost),
      totalStock: parseInt(totalStock),
      hsn_code,
      gst_rate: parseFloat(gst_rate),
    });

    return NextResponse.json({
      success: true,
      product,
    });

  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}