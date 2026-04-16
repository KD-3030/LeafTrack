import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ section: string }>;
}

// GET — public, no auth
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { section } = await params;

    const { data, error } = await supabaseAdmin
      .from('landing_content')
      .select('*')
      .eq('section_key', section)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, content: data.content });
  } catch (error) {
    console.error('Error fetching CMS section:', error);
    return NextResponse.json({ error: 'Failed to fetch section' }, { status: 500 });
  }
}

// PUT — admin-only
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { section } = await params;

    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('landing_content')
      .select('id')
      .eq('section_key', section)
      .single();

    let result;
    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('landing_content')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('section_key', section)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('landing_content')
        .insert({ section_key: section, content })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, section: result });
  } catch (error) {
    console.error('Error updating CMS section:', error);
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
  }
}
