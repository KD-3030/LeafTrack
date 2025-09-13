import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product, { IProduct } from '@/models/Product';
import { verifyToken } from '@/lib/auth';
import { Model } from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    
    const ProductModel = Product as Model<IProduct>;
    const products = await ProductModel.find({}).sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      products,
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
    
    // Verify admin token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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