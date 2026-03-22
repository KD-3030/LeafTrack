import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Customer, { ICustomer } from '@/models/Customer';
import { requireUserAuth } from '@/lib/authMiddleware';
import { Model } from 'mongoose';
import User from '@/models/User';
import { normalizeRoleId } from '@/lib/roles';

interface RouteParams {
  params: {
    id: string;
  };
}

function canAccessCustomer(customer: ICustomer, roleId: string | null, userId: string, managerId?: string): boolean {
  if (roleId === 'admin') return true;
  if (roleId === 'primary_executive') {
    return customer.primary_executive_id?.toString() === userId;
  }
  if (roleId === 'secondary_executive') {
    return customer.primary_executive_id?.toString() === managerId && customer.secondary_executive_id?.toString() === userId;
  }
  return false;
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

    const currentUser = await User.findById(authResult.userId).select('role managerId');
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const roleId = normalizeRoleId(currentUser.role);

    const CustomerModel = Customer as Model<ICustomer>;
    const customer = await CustomerModel.findById(params.id);

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (!canAccessCustomer(customer, roleId, authResult.userId, currentUser.managerId?.toString())) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Keep outstanding balance synchronized from invoices (source of truth)
    const Invoice = (await import('@/models/Invoice')).default;
    const invoices = await Invoice.find({
      customer_id: customer._id,
      status: { $ne: 'Cancelled' },
    }).select('balance_due').lean();

    const outstandingBalance = invoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

    if ((customer.outstanding_balance || 0) !== outstandingBalance) {
      customer.outstanding_balance = outstandingBalance;
      await customer.save();
    }

    return NextResponse.json({
      success: true,
      customer: {
        ...customer.toObject(),
        outstanding_balance: outstandingBalance,
      },
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

    const currentUser = await User.findById(authResult.userId).select('role managerId');
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const roleId = normalizeRoleId(currentUser.role);

    const updateData = await request.json();
    const CustomerModel = Customer as Model<ICustomer>;

    // Convert empty email to undefined to work with sparse index
    if (updateData.email === '' || updateData.email === null) {
      console.log('Converting empty email to undefined for customer:', params.id);
      updateData.email = undefined;
    }

    // Check if customer exists
    const existingCustomer = await CustomerModel.findById(params.id);
    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (!canAccessCustomer(existingCustomer, roleId, authResult.userId, currentUser.managerId?.toString())) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (roleId === 'secondary_executive') {
      delete updateData.primary_executive_id;
      delete updateData.secondary_executive_id;
      delete updateData.created_by;
    }

    if (roleId === 'primary_executive' && updateData.secondary_executive_id) {
      const subordinate = await User.findById(updateData.secondary_executive_id).select('role managerId');
      if (!subordinate || normalizeRoleId(subordinate.role) !== 'secondary_executive' || subordinate.managerId?.toString() !== authResult.userId) {
        return NextResponse.json({ error: 'secondary_executive_id must belong to your team' }, { status: 400 });
      }
      updateData.primary_executive_id = authResult.userId;
    }

    if (roleId === 'admin') {
      const requestedPrimaryId = updateData.primary_executive_id as string | undefined;
      const requestedSecondaryId = updateData.secondary_executive_id as string | undefined;

      if (requestedPrimaryId) {
        const primary = await User.findById(requestedPrimaryId).select('role');
        if (!primary || normalizeRoleId(primary.role) !== 'primary_executive') {
          return NextResponse.json({ error: 'primary_executive_id must belong to a primary executive' }, { status: 400 });
        }
      }

      if (requestedSecondaryId) {
        const secondary = await User.findById(requestedSecondaryId).select('role managerId');
        if (!secondary || normalizeRoleId(secondary.role) !== 'secondary_executive') {
          return NextResponse.json({ error: 'secondary_executive_id must belong to a secondary executive' }, { status: 400 });
        }

        const effectivePrimaryId = requestedPrimaryId || existingCustomer.primary_executive_id?.toString();
        if (effectivePrimaryId && secondary.managerId?.toString() !== effectivePrimaryId) {
          return NextResponse.json({ error: 'Secondary executive is not mapped to selected primary executive' }, { status: 400 });
        }
      }
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

    // Handle email update carefully due to sparse unique index
    // If email is being cleared (set to undefined), first unset it to avoid null conflicts
    if (updateData.email === undefined && existingCustomer.email) {
      // Remove the email field entirely from this customer first
      await CustomerModel.findByIdAndUpdate(
        params.id,
        { $unset: { email: '' } }
      );
    }
    
    // If email is being updated to a non-empty value, check for conflicts
    if (updateData.email && updateData.email !== undefined) {
      // Only check for conflicts if email is actually changing
      const existingEmail = existingCustomer.email || undefined;
      if (updateData.email !== existingEmail) {
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
    }

    // Update customer
    // Separate fields into $set and $unset operations
    const updateOperation: Record<string, unknown> = {};
    const unsetOperation: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(updateData)) {
      if (value === undefined) {
        unsetOperation[key] = '';
      } else {
        updateOperation[key] = value;
      }
    }
    
    const updateQuery: Record<string, unknown> = {};
    if (Object.keys(updateOperation).length > 0) {
      updateQuery.$set = updateOperation;
    }
    if (Object.keys(unsetOperation).length > 0) {
      updateQuery.$unset = unsetOperation;
    }
    
    // Only run the update if there's something to update
    let updatedCustomer;
    if (Object.keys(updateQuery).length > 0) {
      updatedCustomer = await CustomerModel.findByIdAndUpdate(
        params.id,
        updateQuery,
        { new: true, runValidators: true }
      );
    } else {
      // If nothing to update (email was already unset), just fetch the current customer
      updatedCustomer = await CustomerModel.findById(params.id);
    }

    console.log('Customer updated successfully:', params.id, 'Email:', updatedCustomer?.email);

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
    if (normalizeRoleId(authResult.role) !== 'admin') {
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
