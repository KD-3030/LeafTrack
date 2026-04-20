import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET — public, no auth (landing page product showcase)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('id, name, description, image_url, hsn_code, display_order')
      .eq('is_featured', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, products: data || [] });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
