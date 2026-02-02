import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Seller from '@/models/Seller';
import { verifyToken } from '@/lib/auth';

// GET /api/sellers - Get all sellers
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const is_active = searchParams.get('is_active');

    // Build query
    interface QueryType {
      is_active?: boolean;
      $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
    }
    const query: QueryType = {};

    if (is_active !== null && is_active !== undefined && is_active !== '') {
      query.is_active = is_active === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } },
        { contact_person: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    const sellers = await Seller.find(query)
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      sellers,
      count: sellers.length,
    });
  } catch (error) {
    console.error('Error fetching sellers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sellers' },
      { status: 500 }
    );
  }
}

// POST /api/sellers - Create a new seller
export async function POST(request: NextRequest) {
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

    // Check if admin
    if (decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();

    // Validate required field
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Seller name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate GSTIN if provided
    if (body.gstin) {
      const existingGstin = await Seller.findOne({ gstin: body.gstin.toUpperCase() });
      if (existingGstin) {
        return NextResponse.json(
          { error: 'A seller with this GSTIN already exists' },
          { status: 400 }
        );
      }
    }

    const seller = new Seller({
      name: body.name.trim(),
      gstin: body.gstin?.trim().toUpperCase(),
      contact_person: body.contact_person?.trim(),
      phone: body.phone?.trim(),
      email: body.email?.trim().toLowerCase(),
      address: body.address?.trim(),
      city: body.city?.trim(),
      state: body.state?.trim(),
      pincode: body.pincode?.trim(),
      bank_name: body.bank_name?.trim(),
      account_number: body.account_number?.trim(),
      ifsc_code: body.ifsc_code?.trim().toUpperCase(),
      notes: body.notes?.trim(),
      is_active: body.is_active !== false,
    });

    await seller.save();

    return NextResponse.json({
      success: true,
      message: 'Seller created successfully',
      seller,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating seller:', error);
    return NextResponse.json(
      { error: 'Failed to create seller' },
      { status: 500 }
    );
  }
}
