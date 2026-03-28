import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/authMiddleware';
import { withIds } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { data: purchases, error } = await supabaseAdmin
      .from('purchases')
      .select('id, purchase_number, purchase_date, final_amount, payment_status')
      .order('purchase_date', { ascending: false });
    if (error) throw error;

    return NextResponse.json({ success: true, purchases: withIds(purchases || []) });
  } catch (error) {
    console.error('Error fetching purchases for dropdown:', error);
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
  }
}