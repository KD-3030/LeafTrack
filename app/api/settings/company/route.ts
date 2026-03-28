import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/authMiddleware';
import { withId } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS = {
  company_name: 'Sohagtea Trading Company',
  address: 'Tea Estate Road, Bagdogra',
  city: 'Siliguri',
  state: 'West Bengal',
  pincode: '734421',
  phone: '+91 98765 43210',
  email: 'info@sohagtea.com',
  gstin: '19ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
};

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { data: settings } = await supabaseAdmin.from('company_settings').select('*').limit(1).single();

    if (settings) {
      return NextResponse.json({ success: true, settings: withId(settings) });
    }

    // Create default settings if none exist
    const { data: created, error } = await supabaseAdmin.from('company_settings').insert(DEFAULT_SETTINGS).select().single();
    if (error) throw error;

    return NextResponse.json({ success: true, settings: withId(created) });
  } catch (error) {
    console.error('Error fetching company settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    if (authResult.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const updates = await request.json();

    const { data: existing } = await supabaseAdmin.from('company_settings').select('id').limit(1).single();

    let settings;
    if (existing) {
      const { data, error } = await supabaseAdmin.from('company_settings').update(updates).eq('id', existing.id).select().single();
      if (error) throw error;
      settings = data;
    } else {
      const { data, error } = await supabaseAdmin.from('company_settings').insert(updates).select().single();
      if (error) throw error;
      settings = data;
    }

    return NextResponse.json({ success: true, message: 'Company settings updated successfully', settings: withId(settings) });
  } catch (error) {
    console.error('Error updating company settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}