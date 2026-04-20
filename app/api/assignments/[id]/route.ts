import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdminAuth, requireAuth, DecodedToken } from '@/lib/authMiddleware';
import { normalizeRoleId } from '@/lib/roles';
import { withId } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// DELETE /api/assignments/[id] - Delete an assignment and return stock to product
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;

    // Find the assignment to get the product_id and quantity
    const { data: assignment, error: fetchErr } = await supabaseAdmin
      .from('assignments')
      .select('id, product_id, quantity')
      .eq('id', id)
      .single();

    if (fetchErr || !assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Find the product to verify it exists and get current stock
    const { data: product, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('id, name, total_stock')
      .eq('id', assignment.product_id)
      .single();

    if (prodErr || !product) {
      return NextResponse.json(
        { success: false, error: 'Associated product not found' },
        { status: 400 }
      );
    }

    // Return stock to product
    const { error: stockErr } = await supabaseAdmin
      .from('products')
      .update({
        total_stock: product.total_stock + assignment.quantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignment.product_id);

    if (stockErr) {
      return NextResponse.json(
        { success: false, error: 'Failed to update product stock' },
        { status: 500 }
      );
    }

    // Delete the assignment
    const { error: delErr } = await supabaseAdmin
      .from('assignments')
      .delete()
      .eq('id', id);

    if (delErr) {
      // Try to revert stock if delete fails
      await supabaseAdmin
        .from('products')
        .update({ total_stock: product.total_stock })
        .eq('id', assignment.product_id);

      return NextResponse.json(
        { success: false, error: 'Failed to delete assignment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Assignment deleted successfully and stock returned to inventory',
    });
  } catch (error) {
    console.error('Error in DELETE /api/assignments/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/assignments/[id] - Get a specific assignment
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult as DecodedToken;

    const { id } = params;

    // Fetch current user role
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('role, manager_id')
      .eq('id', decoded.userId)
      .single();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const roleId = normalizeRoleId(currentUser.role);

    // Build query filter based on role
    let query = supabaseAdmin
      .from('assignments')
      .select('*')
      .eq('id', id);

    if (roleId === 'secondary_executive') {
      if (!currentUser.manager_id) {
        return NextResponse.json(
          { success: false, error: 'Secondary executive is not assigned to a primary executive' },
          { status: 400 }
        );
      }
      query = query.eq('salesman_id', currentUser.manager_id);
    } else if (roleId === 'primary_executive') {
      query = query.eq('salesman_id', decoded.userId);
    }

    const { data: assignment, error } = await query.single();

    if (error || !assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Fetch related salesman and product data
    const [salesmanRes, productRes] = await Promise.all([
      assignment.salesman_id
        ? supabaseAdmin.from('users').select('id, name, email').eq('id', assignment.salesman_id).single()
        : Promise.resolve({ data: null }),
      assignment.product_id
        ? supabaseAdmin.from('products').select('id, name, manufacturing_cost, total_stock, hsn_code, gst_rate').eq('id', assignment.product_id).single()
        : Promise.resolve({ data: null }),
    ]);

    const enriched = {
      ...withId(assignment),
      salesman_id: salesmanRes.data ? withId(salesmanRes.data) : assignment.salesman_id,
      productId: productRes.data ? withId(productRes.data) : assignment.product_id,
    };

    return NextResponse.json({
      success: true,
      assignment: enriched,
    });
  } catch (error) {
    console.error('Error in GET /api/assignments/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}