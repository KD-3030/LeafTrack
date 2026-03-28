import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, requireAdminAuth } from '@/lib/authMiddleware';
import { withIds, withId } from '@/lib/supabase-helpers';

// GET /api/sellers - Get all sellers
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const is_active = searchParams.get('is_active');

    let query = supabaseAdmin.from('sellers').select('*');

    if (is_active !== null && is_active !== undefined && is_active !== '') {
      query = query.eq('is_active', is_active === 'true');
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,gstin.ilike.%${search}%,contact_person.ilike.%${search}%,phone.ilike.%${search}%,city.ilike.%${search}%`);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      sellers: withIds(data || []),
      count: (data || []).length,
    });
  } catch (error) {
    console.error('Error fetching sellers:', error);
    return NextResponse.json({ error: 'Failed to fetch sellers' }, { status: 500 });
  }
}

// POST /api/sellers - Create a new seller
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'Seller name is required' }, { status: 400 });
    }

    // Check for duplicate GSTIN if provided
    if (body.gstin) {
      const { data: existing } = await supabaseAdmin
        .from('sellers')
        .select('id')
        .eq('gstin', body.gstin.toUpperCase())
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: 'A seller with this GSTIN already exists' }, { status: 400 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('sellers')
      .insert({
        name: body.name.trim(),
        gstin: body.gstin?.trim().toUpperCase() || null,
        contact_person: body.contact_person?.trim() || null,
        phone: body.phone?.trim() || null,
        email: body.email?.trim().toLowerCase() || null,
        address: body.address?.trim() || null,
        city: body.city?.trim() || null,
        state: body.state?.trim() || null,
        pincode: body.pincode?.trim() || null,
        bank_name: body.bank_name?.trim() || null,
        account_number: body.account_number?.trim() || null,
        ifsc_code: body.ifsc_code?.trim().toUpperCase() || null,
        upi_id: body.upi_id?.trim() || null,
        notes: body.notes?.trim() || null,
        is_active: body.is_active !== false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Seller created successfully',
      seller: withId(data),
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating seller:', error);
    return NextResponse.json({ error: 'Failed to create seller' }, { status: 500 });
  }
}
