import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Customer, { ICustomer } from '@/models/Customer';
import { verifyToken } from '@/lib/auth';
import { Model } from 'mongoose';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET - Get single customer
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const CustomerModel = Customer as Model<ICustomer>;
    const customer = await CustomerModel.findById(params.id);

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

// PUT - Update customer
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || (decoded.role !== 'Admin' && decoded.role !== 'Salesman')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const updateData = await request.json();
    const CustomerModel = Customer as Model<ICustomer>;

    // Check if customer exists
    const existingCustomer = await CustomerModel.findById(params.id);
    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // If email is being updated, check for conflicts
    if (updateData.email && updateData.email !== existingCustomer.email) {
      const emailConflict = await CustomerModel.findOne({ 
        email: updateData.email,
        _id: { $ne: params.id }
      });
      
      if (emailConflict) {
        return NextResponse.json(
          { error: 'Customer with this email already exists' },
          { status: 400 }
        );
      }
    }

    // Update customer
    const updatedCustomer = await CustomerModel.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Customer updated successfully',
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.message 
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

// DELETE - Delete customer
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const CustomerModel = Customer as Model<ICustomer>;
    
    // Check if customer exists
    const customer = await CustomerModel.findById(params.id);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // TODO: Check if customer has any active invoices/transactions before deleting
    // For now, we'll just set status to Inactive instead of deleting
    await CustomerModel.findByIdAndUpdate(params.id, { status: 'Inactive' });

    return NextResponse.json({
      success: true,
      message: 'Customer deactivated successfully',
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
