import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/authMiddleware';
import { withIds, withId } from '@/lib/supabase-helpers';

// GET /api/raw-materials - Get all raw materials
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const is_active = searchParams.get('is_active');

    let query = supabaseAdmin.from('raw_materials').select('*');

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,supplier.ilike.%${search}%`);
    }

    if (is_active !== null && is_active !== undefined && is_active !== 'all') {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw error;

    return NextResponse.json({
      success: true,
      materials: withIds(data || []),
      count: (data || []).length,
    });
  } catch (error) {
    console.error('Error fetching raw materials:', error);
    return NextResponse.json({ error: 'Failed to fetch raw materials' }, { status: 500 });
  }
}

// POST /api/raw-materials - Create new raw material
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;

    const body = await request.json();

    const requiredFields = ['name', 'unit', 'base_cost_per_unit'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Check if material with same name already exists
    const { data: existing } = await supabaseAdmin
      .from('raw_materials').select('id').eq('name', body.name).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'A raw material with this name already exists' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('raw_materials')
      .insert({
        name: body.name,
        description: body.description || null,
        unit: body.unit,
        base_cost_per_unit: body.base_cost_per_unit,
        current_stock: body.current_stock || 0,
        min_stock_level: body.min_stock_level || 0,
        supplier: body.supplier || null,
        is_active: body.is_active !== false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Raw material created successfully',
      material: withId(data),
    });
  } catch (error) {
    console.error('Error creating raw material:', error);
    return NextResponse.json({ error: 'Failed to create raw material' }, { status: 500 });
  }
}
