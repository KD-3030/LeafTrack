import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, requireAdminAuth } from '@/lib/authMiddleware';
import { withId, withIds } from '@/lib/supabase-helpers';
import { normalizeRoleId } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;

    const { data: currentUser } = await supabaseAdmin.from('users').select('id, role, manager_id').eq('id', decoded.userId).single();
    if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const roleId = normalizeRoleId(currentUser.role);

    let query = supabaseAdmin.from('assignments').select('*');

    // Role-based filtering
    if (roleId === 'secondary_executive') {
      // SE sees assignments from their manager (PE's stock pool)
      if (currentUser.manager_id) {
        const { data: managerAssignments } = await supabaseAdmin
          .from('assignments')
          .select('*')
          .eq('salesman_id', currentUser.manager_id);
        const assignments = withIds(managerAssignments || []);
        return await enrichAndReturn(assignments);
      }
      query = query.eq('salesman_id', decoded.userId);
    } else if (roleId === 'primary_executive') {
      query = query.eq('salesman_id', decoded.userId);
    }

    const { data: rawAssignments, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    const assignments = withIds(rawAssignments || []);
    return await enrichAndReturn(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

async function enrichAndReturn(assignments: Record<string, unknown>[]) {
  const salesmanIds = [...new Set(assignments.map(a => a.salesman_id).filter(Boolean))] as string[];
  const productIds = [...new Set(assignments.map(a => a.product_id).filter(Boolean))] as string[];

  const [salesmenRes, productsRes] = await Promise.all([
    salesmanIds.length ? supabaseAdmin.from('users').select('id, name, email, phone').in('id', salesmanIds) : { data: [] },
    productIds.length ? supabaseAdmin.from('products').select('id, name, manufacturing_cost, hsn_code, gst_rate, total_stock').in('id', productIds) : { data: [] },
  ]);

  const salesmenMap = new Map((salesmenRes.data || []).map(s => [s.id, s]));
  const productsMap = new Map((productsRes.data || []).map(p => [p.id, p]));

  const enriched = assignments.map(a => ({
    ...a,
    salesman_id: a.salesman_id && salesmenMap.has(a.salesman_id as string)
      ? { _id: a.salesman_id, ...salesmenMap.get(a.salesman_id as string) }
      : a.salesman_id,
    productId: a.product_id && productsMap.has(a.product_id as string)
      ? { _id: a.product_id, ...productsMap.get(a.product_id as string) }
      : a.product_id,
    product_id: a.product_id,
    sellingPricePerUnit: a.selling_price_per_unit,
  }));

  return NextResponse.json({ success: true, assignments: enriched });
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;

    const body = await request.json();
    const { salesman_id, product_id, quantity, selling_price_per_unit, sellingPricePerUnit } = body;

    if (!salesman_id || !product_id || !quantity) {
      return NextResponse.json({ error: 'salesman_id, product_id, and quantity are required' }, { status: 400 });
    }

    // Check product stock
    const { data: product } = await supabaseAdmin.from('products').select('id, total_stock, name').eq('id', product_id).single();
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    if (product.total_stock < quantity) {
      return NextResponse.json({ error: `Insufficient stock. Available: ${product.total_stock}` }, { status: 400 });
    }

    // Create assignment
    const { data: assignment, error } = await supabaseAdmin
      .from('assignments')
      .insert({
        salesman_id,
        product_id,
        quantity,
        selling_price_per_unit: selling_price_per_unit || sellingPricePerUnit || 0,
      })
      .select()
      .single();
    if (error) throw error;

    // Decrement product stock
    await supabaseAdmin
      .from('products')
      .update({ total_stock: product.total_stock - quantity, updated_at: new Date().toISOString() })
      .eq('id', product_id);

    return NextResponse.json({
      success: true,
      message: 'Assignment created successfully',
      assignment: withId(assignment),
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create assignment' }, { status: 500 });
  }
}