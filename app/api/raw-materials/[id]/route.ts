import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/authMiddleware';
import { withId } from '@/lib/supabase-helpers';

// GET /api/raw-materials/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { id } = await params;

    const { data, error } = await supabaseAdmin.from('raw_materials').select('*').eq('id', id).single();
    if (error || !data) return NextResponse.json({ error: 'Raw material not found' }, { status: 404 });

    return NextResponse.json({ success: true, material: withId(data) });
  } catch (error) {
    console.error('Error fetching raw material:', error);
    return NextResponse.json({ error: 'Failed to fetch raw material' }, { status: 500 });
  }
}

// PUT /api/raw-materials/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { id } = await params;

    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.base_cost_per_unit !== undefined) updateData.base_cost_per_unit = body.base_cost_per_unit;
    if (body.current_stock !== undefined) updateData.current_stock = body.current_stock;
    if (body.min_stock_level !== undefined) updateData.min_stock_level = body.min_stock_level;
    if (body.supplier !== undefined) updateData.supplier = body.supplier;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data, error } = await supabaseAdmin
      .from('raw_materials').update(updateData).eq('id', id).select().single();
    if (error || !data) return NextResponse.json({ error: 'Raw material not found' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'Raw material updated successfully', material: withId(data) });
  } catch (error) {
    console.error('Error updating raw material:', error);
    return NextResponse.json({ error: 'Failed to update raw material' }, { status: 500 });
  }
}

// DELETE /api/raw-materials/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { id } = await params;

    const { error } = await supabaseAdmin.from('raw_materials').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Raw material deleted successfully' });
  } catch (error) {
    console.error('Error deleting raw material:', error);
    return NextResponse.json({ error: 'Failed to delete raw material' }, { status: 500 });
  }
}
