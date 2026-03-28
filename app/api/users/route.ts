import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/authMiddleware';
import { withIds } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { data, error } = await supabaseAdmin
      .from('users').select('id, name, email, role, manager_id, approval_status, phone, state, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Resolve manager names
    const managerIds = [...new Set((data || []).map(u => u.manager_id).filter(Boolean))];
    let managerMap: Record<string, { name: string; email: string; role: string }> = {};
    if (managerIds.length > 0) {
      const { data: managers } = await supabaseAdmin
        .from('users').select('id, name, email, role').in('id', managerIds);
      if (managers) {
        for (const m of managers) { managerMap[m.id] = { name: m.name, email: m.email, role: m.role }; }
      }
    }

    const users = withIds(data || []).map(u => ({
      ...u,
      managerId: u.manager_id ? { _id: u.manager_id, ...managerMap[u.manager_id] } : null,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}