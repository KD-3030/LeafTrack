import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, requireAdminAuth } from '@/lib/authMiddleware';
import { normalizeRoleId } from '@/lib/roles';
import { withId, withIds } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

// GET - Retrieve locations (admin can get all, salesman can get own)
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;

    const { searchParams } = new URL(request.url);
    const salesmanId = searchParams.get('salesman_id');
    const hours = searchParams.get('hours') || '24';
    const limit = parseInt(searchParams.get('limit') || '100');

    const timeFilter = new Date();
    timeFilter.setHours(timeFilter.getHours() - parseInt(hours));

    let query = supabaseAdmin
      .from('locations')
      .select('*')
      .gte('timestamp', timeFilter.toISOString())
      .order('timestamp', { ascending: false })
      .limit(limit);

    const roleId = normalizeRoleId(decoded.role);

    if (roleId === 'secondary_executive') {
      query = query.eq('salesman_id', decoded.userId);
    } else if (roleId === 'primary_executive') {
      const { data: secondaries } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('manager_id', decoded.userId)
        .eq('role', 'secondary_executive')
        .eq('approval_status', 'approved');

      const teamIds = [decoded.userId, ...(secondaries || []).map(s => s.id)];
      if (salesmanId) {
        if (!teamIds.includes(salesmanId)) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        query = query.eq('salesman_id', salesmanId);
      } else {
        query = query.in('salesman_id', teamIds);
      }
    } else if (salesmanId) {
      query = query.eq('salesman_id', salesmanId);
    }

    const { data: locations, error } = await query;

    if (error) {
      console.error('Locations query error:', error);
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }

    // Enrich with salesman data
    const salesmanIds = [...new Set((locations || []).map(l => l.salesman_id).filter(Boolean))];
    const { data: salesmen } = salesmanIds.length > 0
      ? await supabaseAdmin.from('users').select('id, name, email').in('id', salesmanIds)
      : { data: [] };

    const salesmanMap = new Map((salesmen || []).map(s => [s.id, { _id: s.id, name: s.name, email: s.email }]));

    const enriched = (locations || []).map(loc => ({
      ...withId(loc),
      salesman_id: salesmanMap.get(loc.salesman_id) || loc.salesman_id,
    }));

    return NextResponse.json({ success: true, locations: enriched });
  } catch (error) {
    console.error('Get locations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new location (executives only)
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;

    const roleId = normalizeRoleId(decoded.role);
    if (roleId !== 'secondary_executive' && roleId !== 'primary_executive') {
      return NextResponse.json({ error: 'Only executives can submit locations' }, { status: 403 });
    }

    const { latitude, longitude, accuracy, address } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }
    if (latitude < -90 || latitude > 90) {
      return NextResponse.json({ error: 'Invalid latitude' }, { status: 400 });
    }
    if (longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Invalid longitude' }, { status: 400 });
    }

    const { data: location, error } = await supabaseAdmin
      .from('locations')
      .insert({
        salesman_id: decoded.userId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : null,
        address,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !location) {
      console.error('Create location error:', error);
      return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
    }

    // Fetch salesman info
    const { data: salesman } = await supabaseAdmin
      .from('users')
      .select('id, name, email')
      .eq('id', decoded.userId)
      .single();

    return NextResponse.json({
      success: true,
      location: {
        ...withId(location),
        salesman_id: salesman ? { _id: salesman.id, name: salesman.name, email: salesman.email } : decoded.userId,
      },
    });
  } catch (error) {
    console.error('Create location error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Cleanup old locations (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count, error } = await supabaseAdmin
      .from('locations')
      .delete({ count: 'exact' })
      .lt('timestamp', sevenDaysAgo.toISOString());

    if (error) {
      console.error('Delete locations error:', error);
      return NextResponse.json({ error: 'Failed to delete old locations' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: count || 0,
      message: `Deleted ${count || 0} old location records`,
    });
  } catch (error) {
    console.error('Delete old locations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
