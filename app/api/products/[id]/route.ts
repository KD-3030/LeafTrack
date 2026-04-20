import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/authMiddleware';
import { mapProductToFrontend } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { id } = await params;

    const body = await request.json();
    const { name, manufacturingCost, totalStock, hsn_code, gst_rate, description, image_url, is_featured, display_order } = body;

    // Build update object — only include fields that were actually sent
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (manufacturingCost !== undefined) updateData.manufacturing_cost = parseFloat(manufacturingCost);
    if (totalStock !== undefined) updateData.total_stock = parseInt(totalStock);
    if (hsn_code !== undefined) updateData.hsn_code = hsn_code;
    if (gst_rate !== undefined) updateData.gst_rate = parseFloat(gst_rate);
    if (description !== undefined) updateData.description = description;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (is_featured !== undefined) updateData.is_featured = is_featured;
    if (display_order !== undefined) updateData.display_order = parseInt(display_order);

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      product: mapProductToFrontend(data),
    });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}