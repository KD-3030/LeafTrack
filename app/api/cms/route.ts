import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

// GET — public, no auth required (landing page needs this)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('landing_content')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    // Transform array into keyed object for easy access
    const sections: Record<string, unknown> = {};
    (data || []).forEach((row: { section_key: string; content: unknown; is_active: boolean; display_order: number }) => {
      sections[row.section_key] = row.content;
    });

    return NextResponse.json({ success: true, sections });
  } catch (error) {
    console.error('Error fetching CMS content:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}

// PUT — admin-only, bulk upsert sections
export async function PUT(request: NextRequest) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { section_key, content } = await request.json();

    if (!section_key || !content) {
      return NextResponse.json({ error: 'section_key and content are required' }, { status: 400 });
    }

    // Upsert: update if exists, insert if not
    const { data: existing } = await supabaseAdmin
      .from('landing_content')
      .select('id')
      .eq('section_key', section_key)
      .single();

    let result;
    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('landing_content')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('section_key', section_key)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('landing_content')
        .insert({ section_key, content })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, section: result });
  } catch (error) {
    console.error('Error updating CMS content:', error);
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
  }
}
