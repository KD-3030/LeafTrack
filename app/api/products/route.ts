import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/authMiddleware';
import { mapProductToFrontend } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    let query = supabaseAdmin.from('products').select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,hsn_code.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    const total = count || 0;
    const products = (data || []).map(mapProductToFrontend);

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCount: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { name, manufacturingCost, totalStock, hsn_code, gst_rate } = await request.json();

    if (!name || manufacturingCost === undefined || totalStock === undefined || !hsn_code || gst_rate === undefined) {
      return NextResponse.json(
        { error: 'All fields are required: name, manufacturingCost, totalStock, hsn_code, gst_rate' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        name,
        manufacturing_cost: parseFloat(manufacturingCost),
        total_stock: parseInt(totalStock),
        hsn_code,
        gst_rate: parseFloat(gst_rate),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      product: mapProductToFrontend(data),
    });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}