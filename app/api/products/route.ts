import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product, { IProduct } from '@/models/Product';
import { verifyToken } from '@/lib/auth';
import { Model } from 'mongoose';

export async function GET(request: NextRequest) {
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

    const { name, price, stock_quantity } = await request.json();

    // Validate input
    if (!name || price === undefined || stock_quantity === undefined) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Create product
    const ProductModel = Product as Model<IProduct>;
    const product = await ProductModel.create({
      name,
      price: parseFloat(price),
      stock_quantity: parseInt(stock_quantity),
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