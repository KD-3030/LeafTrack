import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, requireAdminAuth } from '@/lib/authMiddleware';
import { withId } from '@/lib/supabase-helpers';

// GET /api/sellers/[id] - Get a single seller
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { data, error } = await supabaseAdmin.from('sellers').select('*').eq('id', id).single();
    if (error || !data) return NextResponse.json({ error: 'Seller not found' }, { status: 404 });

    return NextResponse.json({ success: true, seller: withId(data) });
  } catch (error) {
    console.error('Error fetching seller:', error);
    return NextResponse.json({ error: 'Failed to fetch seller' }, { status: 500 });
  }
}

// PUT /api/sellers/[id] - Update a seller
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const body = await request.json();

    // Check if seller exists
    const { data: existing } = await supabaseAdmin.from('sellers').select('id,gstin').eq('id', id).single();
    if (!existing) return NextResponse.json({ error: 'Seller not found' }, { status: 404 });

    // Check for duplicate GSTIN if changed
    if (body.gstin && body.gstin.toUpperCase() !== existing.gstin) {
      const { data: dup } = await supabaseAdmin
        .from('sellers').select('id').eq('gstin', body.gstin.toUpperCase()).neq('id', id).maybeSingle();
      if (dup) return NextResponse.json({ error: 'A seller with this GSTIN already exists' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.gstin !== undefined) updateData.gstin = body.gstin?.trim().toUpperCase() || '';
    if (body.contact_person !== undefined) updateData.contact_person = body.contact_person?.trim() || '';
    if (body.phone !== undefined) updateData.phone = body.phone?.trim() || '';
    if (body.email !== undefined) updateData.email = body.email?.trim().toLowerCase() || '';
    if (body.address !== undefined) updateData.address = body.address?.trim() || '';
    if (body.city !== undefined) updateData.city = body.city?.trim() || '';
    if (body.state !== undefined) updateData.state = body.state?.trim() || '';
    if (body.pincode !== undefined) updateData.pincode = body.pincode?.trim() || '';
    if (body.bank_name !== undefined) updateData.bank_name = body.bank_name?.trim() || '';
    if (body.account_number !== undefined) updateData.account_number = body.account_number?.trim() || '';
    if (body.ifsc_code !== undefined) updateData.ifsc_code = body.ifsc_code?.trim().toUpperCase() || '';
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || '';
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data, error } = await supabaseAdmin
      .from('sellers').update(updateData).eq('id', id).select().single();
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Seller updated successfully', seller: withId(data) });
  } catch (error) {
    console.error('Error updating seller:', error);
    return NextResponse.json({ error: 'Failed to update seller' }, { status: 500 });
  }
}

// DELETE /api/sellers/[id] - Delete a seller
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { error } = await supabaseAdmin.from('sellers').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Seller deleted successfully' });
  } catch (error) {
    console.error('Error deleting seller:', error);
    return NextResponse.json({ error: 'Failed to delete seller' }, { status: 500 });
  }
}
