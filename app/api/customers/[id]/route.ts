import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Customer, { ICustomer } from '@/models/Customer';
import { requireUserAuth } from '@/lib/authMiddleware';
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
    
    // Use the proper authentication middleware
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
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
    
    // Use the proper authentication middleware
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const updateData = await request.json();
    const CustomerModel = Customer as Model<ICustomer>;

    // Check if customer exists
    const existingCustomer = await CustomerModel.findById(params.id);
    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // If phone is being updated, check for conflicts
    if (updateData.phone && updateData.phone !== existingCustomer.phone) {
      const phoneConflict = await CustomerModel.findOne({ 
        phone: updateData.phone,
        _id: { $ne: params.id }
      });
      
      if (phoneConflict) {
        return NextResponse.json({ 
          error: 'Phone number already exists' 
        }, { status: 409 });
      }
    }

    // If email is being updated, check for conflicts (email is now optional)
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
    
    if (error instanceof Error && error.name === 'ValidationError') {
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
    
    // Use the proper authentication middleware (Admin only for deletion)
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Check if user has admin role for deletion
    if (authResult.role !== 'Admin') {
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

export const dynamic = 'force-dynamic';
