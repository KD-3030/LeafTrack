import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Seller from '@/models/Seller';
import { verifyToken } from '@/lib/auth';

// GET /api/sellers/[id] - Get a single seller
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const seller = await Seller.findById(id).lean();

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      seller,
    });
  } catch (error) {
    console.error('Error fetching seller:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seller' },
      { status: 500 }
    );
  }
}

// PUT /api/sellers/[id] - Update a seller
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Check if admin
    if (decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if seller exists
    const existingSeller = await Seller.findById(id);
    if (!existingSeller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    // Check for duplicate GSTIN if changed
    if (body.gstin && body.gstin.toUpperCase() !== existingSeller.gstin) {
      const duplicateGstin = await Seller.findOne({ 
        gstin: body.gstin.toUpperCase(), 
        _id: { $ne: id } 
      });
      if (duplicateGstin) {
        return NextResponse.json(
          { error: 'A seller with this GSTIN already exists' },
          { status: 400 }
        );
      }
    }

    // Update fields
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.gstin !== undefined) updateData.gstin = body.gstin?.trim().toUpperCase() || '';
    if (body.contact_person !== undefined) updateData.contact_person = body.contact_person?.trim() || '';
    if (body.phone !== undefined) updateData.phone = body.phone?.trim() || '';
    if (body.email !== undefined) updateData.email = body.email?.trim().toLowerCase() || '';
    if (body.address !== undefined) updateData.address = body.address?.trim() || '';
    if (body.city !== undefined) updateData.city = body.city?.trim() || '';
    if (body.state !== undefined) updateData.state = body.state?.trim() || '';
    if (body.pincode !== undefined) updateData.pincode = body.pincode?.trim() || '';
    if (body.bank_name !== undefined) updateData.bank_name = body.bank_name?.trim() || '';
    if (body.account_number !== undefined) updateData.account_number = body.account_number?.trim() || '';
    if (body.ifsc_code !== undefined) updateData.ifsc_code = body.ifsc_code?.trim().toUpperCase() || '';
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || '';
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const seller = await Seller.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Seller updated successfully',
      seller,
    });
  } catch (error) {
    console.error('Error updating seller:', error);
    return NextResponse.json(
      { error: 'Failed to update seller' },
      { status: 500 }
    );
  }
}

// DELETE /api/sellers/[id] - Delete a seller
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Check if admin
    if (decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const seller = await Seller.findByIdAndDelete(id);

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Seller deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting seller:', error);
    return NextResponse.json(
      { error: 'Failed to delete seller' },
      { status: 500 }
    );
  }
}
