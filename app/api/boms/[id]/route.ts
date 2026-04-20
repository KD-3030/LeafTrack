import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/authMiddleware';
import { withId } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

// GET /api/boms/[id] - Get single BOM
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { id } = await params;

    const { data: bom, error } = await supabaseAdmin
      .from('boms')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !bom) {
      return NextResponse.json({ error: 'BOM not found' }, { status: 404 });
    }

    // Fetch materials
    const { data: materials } = await supabaseAdmin
      .from('bom_materials')
      .select('*')
      .eq('bom_id', id);

    return NextResponse.json({
      success: true,
      bom: withId({ ...bom, materials: materials || [] }),
    });
  } catch (error) {
    console.error('Error fetching BOM:', error);
    return NextResponse.json(
      { error: 'Failed to fetch BOM' },
      { status: 500 }
    );
  }
}

// PUT /api/boms/[id] - Update BOM
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { id } = await params;

    // Fetch existing BOM
    const { data: bom, error: fetchError } = await supabaseAdmin
      .from('boms')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !bom) {
      return NextResponse.json({ error: 'BOM not found' }, { status: 404 });
    }

    const body = await request.json();

    // Prepare update fields for BOM
    const bomUpdate: Record<string, unknown> = {};
    if (body.overhead_percentage !== undefined) bomUpdate.overhead_percentage = body.overhead_percentage;
    if (body.notes !== undefined) bomUpdate.notes = body.notes;
    if (body.status !== undefined) bomUpdate.status = body.status;
    if (body.total_manufacturing_cost !== undefined) bomUpdate.total_manufacturing_cost = body.total_manufacturing_cost;
    if (body.final_cost !== undefined) bomUpdate.final_cost = body.final_cost;

    // Handle is_current flag
    const shouldBeCurrent = body.is_current || body.status === 'active';
    if (shouldBeCurrent && !bom.is_current) {
      // Unset other current BOMs for this product
      await supabaseAdmin
        .from('boms')
        .update({ is_current: false })
        .eq('product_id', bom.product_id)
        .eq('is_current', true)
        .neq('id', id);

      bomUpdate.is_current = true;
    } else if (body.is_current === false) {
      bomUpdate.is_current = false;
    }

    // Update BOM
    const { data: updatedBom, error: updateError } = await supabaseAdmin
      .from('boms')
      .update(bomUpdate)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('BOM update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update BOM' },
        { status: 500 }
      );
    }

    // Handle materials update if provided
    if (body.materials !== undefined && Array.isArray(body.materials)) {
      // Delete existing materials
      await supabaseAdmin
        .from('bom_materials')
        .delete()
        .eq('bom_id', id);

      // Insert new materials
      if (body.materials.length > 0) {
        const materialsToInsert = body.materials.map((m: Record<string, unknown>) => ({
          bom_id: id,
          material_id: m.material_id,
          material_name: m.material_name,
          quantity: m.quantity,
          unit: m.unit,
          cost_per_unit: m.cost_per_unit,
          total_cost: m.total_cost,
        }));

        await supabaseAdmin
          .from('bom_materials')
          .insert(materialsToInsert);
      }
    }

    // Update product manufacturing cost if this is the current BOM
    if (updatedBom.is_current && updatedBom.final_cost) {
      await supabaseAdmin
        .from('products')
        .update({ manufacturing_cost: updatedBom.final_cost })
        .eq('id', updatedBom.product_id);

      console.log(`Updated product manufacturing cost to ₹${updatedBom.final_cost}`);
    }

    // Fetch updated materials for response
    const { data: materials } = await supabaseAdmin
      .from('bom_materials')
      .select('*')
      .eq('bom_id', id);

    return NextResponse.json({
      success: true,
      message: 'BOM updated successfully' + (updatedBom.is_current ? ' and product cost updated' : ''),
      bom: withId({ ...updatedBom, materials: materials || [] }),
    });
  } catch (error) {
    console.error('Error updating BOM:', error);
    return NextResponse.json(
      { error: 'Failed to update BOM', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/boms/[id] - Delete BOM
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { id } = await params;

    const { data: bom, error: fetchError } = await supabaseAdmin
      .from('boms')
      .select('id, is_current, status')
      .eq('id', id)
      .single();

    if (fetchError || !bom) {
      return NextResponse.json({ error: 'BOM not found' }, { status: 404 });
    }

    // Don't allow deleting the current active BOM
    if (bom.is_current && bom.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot delete the current active BOM. Please set another BOM as current first.' },
        { status: 400 }
      );
    }

    // Delete BOM (bom_materials cascade via ON DELETE CASCADE)
    const { error } = await supabaseAdmin
      .from('boms')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('BOM delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete BOM' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'BOM deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting BOM:', error);
    return NextResponse.json(
      { error: 'Failed to delete BOM' },
      { status: 500 }
    );
  }
}
