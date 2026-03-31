import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireUserAuth } from '@/lib/authMiddleware';
import { normalizeRoleId } from '@/lib/roles';
import { withId } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { data: retailer, error } = await supabaseAdmin
      .from('retailers').select('*').eq('id', params.id).single();
    if (error || !retailer) {
      return NextResponse.json({ error: 'Retailer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, retailer: withId(retailer) });
  } catch (error) {
    console.error('Error fetching retailer:', error);
    return NextResponse.json({ error: 'Failed to fetch retailer' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    delete body._id;
    delete body.id;
    delete body.created_at;

    const { data, error } = await supabaseAdmin
      .from('retailers').update(body).eq('id', params.id).select().single();
    if (error) throw error;

    return NextResponse.json({ success: true, retailer: withId(data) });
  } catch (error) {
    console.error('Error updating retailer:', error);
    return NextResponse.json({ error: 'Failed to update retailer' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    if (normalizeRoleId(authResult.role) !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await supabaseAdmin.from('retailers').update({ status: 'Inactive' }).eq('id', params.id);

    return NextResponse.json({ success: true, message: 'Retailer deactivated' });
  } catch (error) {
    console.error('Error deleting retailer:', error);
    return NextResponse.json({ error: 'Failed to delete retailer' }, { status: 500 });
  }
}
