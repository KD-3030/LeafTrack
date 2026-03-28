import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/authMiddleware';
import { withId, withIds } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const product_id = searchParams.get('product_id');
    const status = searchParams.get('status');
    const is_current = searchParams.get('is_current');
    const search = searchParams.get('search');

    let query = supabaseAdmin.from('boms').select('*');
    if (product_id) query = query.eq('product_id', product_id);
    if (status && status !== 'all') query = query.eq('status', status);
    if (is_current !== null && is_current !== undefined && is_current !== 'all') query = query.eq('is_current', is_current === 'true');
    if (search) query = query.or(`product_name.ilike.%${search}%,notes.ilike.%${search}%,created_by_name.ilike.%${search}%`);

    const { data: boms, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    // Fetch materials for each BOM
    const bomIds = (boms || []).map(b => b.id);
    let materialsMap: Record<string, unknown[]> = {};
    if (bomIds.length > 0) {
      const { data: allMaterials } = await supabaseAdmin.from('bom_materials').select('*').in('bom_id', bomIds);
      if (allMaterials) {
        for (const m of allMaterials) {
          if (!materialsMap[m.bom_id]) materialsMap[m.bom_id] = [];
          materialsMap[m.bom_id].push({ ...withId(m), createdAt: m.bom_id });
        }
      }
    }

    const bomsWithMaterials = withIds(boms || []).map(b => ({
      ...b, materials: materialsMap[b.id] || [], createdAt: b.created_at, updatedAt: b.updated_at,
    }));

    const summary = {
      total_boms: bomsWithMaterials.length,
      active_boms: bomsWithMaterials.filter(b => b.status === 'active').length,
      draft_boms: bomsWithMaterials.filter(b => b.status === 'draft').length,
      archived_boms: bomsWithMaterials.filter(b => b.status === 'archived').length,
      current_boms: bomsWithMaterials.filter(b => b.is_current).length,
    };

    return NextResponse.json({ success: true, boms: bomsWithMaterials, summary });
  } catch (error) {
    console.error('Error fetching BOMs:', error);
    return NextResponse.json({ error: 'Failed to fetch BOMs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    if (!body.product_id || !body.materials || !Array.isArray(body.materials) || body.materials.length === 0) {
      return NextResponse.json({ error: 'product_id and materials array are required' }, { status: 400 });
    }

    const { data: product } = await supabaseAdmin.from('products').select('id, name').eq('id', body.product_id).single();
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    // Get next version
    const { data: lastBom } = await supabaseAdmin.from('boms').select('version')
      .eq('product_id', body.product_id).order('version', { ascending: false }).limit(1).maybeSingle();
    const nextVersion = lastBom ? lastBom.version + 1 : 1;

    const shouldBeCurrent = body.is_current || body.status === 'active';
    if (shouldBeCurrent) {
      await supabaseAdmin.from('boms').update({ is_current: false }).eq('product_id', body.product_id).eq('is_current', true);
    }

    const total_manufacturing_cost = body.materials.reduce((s: number, m: { total_cost?: number }) => s + (m.total_cost || 0), 0);
    const overhead_percentage = body.overhead_percentage || 0;
    const final_cost = total_manufacturing_cost + (total_manufacturing_cost * overhead_percentage / 100);

    const { data: bom, error } = await supabaseAdmin.from('boms').insert({
      product_id: body.product_id, product_name: product.name, version: nextVersion,
      total_manufacturing_cost, overhead_percentage, final_cost,
      notes: body.notes || null, status: body.status || 'draft',
      created_by: authResult.userId, created_by_name: authResult.name || 'Admin',
      is_current: shouldBeCurrent,
    }).select().single();
    if (error) throw error;

    // Insert materials
    const materialRows = body.materials.map((m: Record<string, unknown>) => ({
      bom_id: bom.id, material_id: m.material_id, material_name: m.material_name,
      quantity: m.quantity, unit: m.unit, cost_per_unit: m.cost_per_unit, total_cost: m.total_cost,
    }));
    const { data: materials } = await supabaseAdmin.from('bom_materials').insert(materialRows).select();

    if (shouldBeCurrent) {
      await supabaseAdmin.from('products').update({ manufacturing_cost: final_cost }).eq('id', body.product_id);
    }

    return NextResponse.json({
      success: true,
      message: 'BOM created successfully' + (shouldBeCurrent ? ' and product cost updated' : ''),
      bom: { ...withId(bom), materials: materials || [], createdAt: bom.created_at, updatedAt: bom.updated_at },
    });
  } catch (error) {
    console.error('Error creating BOM:', error);
    return NextResponse.json({ error: 'Failed to create BOM' }, { status: 500 });
  }
}