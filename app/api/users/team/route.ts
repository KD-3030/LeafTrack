import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireUserAuth } from '@/lib/authMiddleware';
import { normalizeRoleId } from '@/lib/roles';
import { withIds } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const roleId = normalizeRoleId(authResult.role);

    if (roleId === 'primary_executive') {
      const { data, error } = await supabaseAdmin
        .from('users').select('id, name, email, role, approval_status, manager_id')
        .eq('role', 'SecondaryExecutive').eq('manager_id', authResult.userId).eq('approval_status', 'approved')
        .order('name');
      if (error) throw error;
      return NextResponse.json({ success: true, team: withIds(data || []) });
    }

    if (roleId === 'admin') {
      const managerId = request.nextUrl.searchParams.get('managerId');
      if (!managerId) return NextResponse.json({ success: false, error: 'managerId is required for admin queries' }, { status: 400 });

      const { data, error } = await supabaseAdmin
        .from('users').select('id, name, email, role, approval_status, manager_id')
        .eq('role', 'SecondaryExecutive').eq('manager_id', managerId)
        .order('name');
      if (error) throw error;
      return NextResponse.json({ success: true, team: withIds(data || []) });
    }

    return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
  } catch (error) {
    console.error('Get team users error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}