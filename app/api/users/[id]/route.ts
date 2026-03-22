import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
import Customer from '@/models/Customer';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { normalizeRoleId, roleIdToDbRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // Verify admin token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const UserModel = User as Model<IUser>;
    const adminUser = await UserModel.findById(decoded.userId);
    if (!adminUser || normalizeRoleId(adminUser.role) !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { name, email, role, password, managerId } = body;

    // Find the user to update
    const existingUser = await UserModel.findById(id);
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if email is already taken by another user
    if (email && email !== existingUser.email) {
      const emailExists = await UserModel.findOne({ 
        email, 
        _id: { $ne: id } 
      });
      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare update object
    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) {
      const roleId = normalizeRoleId(role);
      if (!roleId) {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 400 }
        );
      }
      updateData.role = roleIdToDbRole(roleId);

      if (roleId === 'secondary_executive') {
        if (!managerId) {
          return NextResponse.json(
            { error: 'Secondary Executive requires managerId' },
            { status: 400 }
          );
        }

        const manager = await UserModel.findById(managerId);
        if (!manager || manager.role !== 'PrimaryExecutive') {
          return NextResponse.json(
            { error: 'managerId must belong to a Primary Executive' },
            { status: 400 }
          );
        }
        updateData.managerId = managerId;
      } else {
        updateData.managerId = undefined;
      }
    } else if (managerId) {
      const manager = await UserModel.findById(managerId);
      if (!manager || manager.role !== 'PrimaryExecutive') {
        return NextResponse.json(
          { error: 'managerId must belong to a Primary Executive' },
          { status: 400 }
        );
      }
      updateData.managerId = managerId;
    }
    
    // Hash new password if provided
    if (password) {
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(password, saltRounds);
    }

    updateData.updatedAt = new Date();

    // Update user
    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, select: '-password' }
    );

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // Verify admin token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const UserModel = User as Model<IUser>;
    const adminUser = await UserModel.findById(decoded.userId);
    if (!adminUser || normalizeRoleId(adminUser.role) !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = params;

    const targetUser = await UserModel.findById(id).select('role');
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (decoded.userId === id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    const targetRoleId = normalizeRoleId(targetUser.role);

    if (targetRoleId === 'primary_executive') {
      const secondaryCount = await UserModel.countDocuments({
        role: 'SecondaryExecutive',
        managerId: id,
      });

      if (secondaryCount > 0) {
        return NextResponse.json(
          { error: 'Reassign or remove secondary executives before deleting this primary executive' },
          { status: 400 }
        );
      }
    }

    // Remove secondary mapping from customers owned by this secondary.
    if (targetRoleId === 'secondary_executive') {
      await Customer.updateMany(
        { secondary_executive_id: id },
        { $unset: { secondary_executive_id: '' } }
      );
    }

    // Find and delete the user
    await UserModel.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
