import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/authMiddleware';
import { withId } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const customer_id = searchParams.get('customer_id');
    const sort_by = searchParams.get('sort_by') || 'balance_due';
    const sort_order = searchParams.get('sort_order') || 'desc';
    const overdue_only = searchParams.get('overdue_only') === 'true';

    const now = new Date();

    // Fetch invoices with outstanding balances
    let query = supabaseAdmin.from('invoices').select('*', { count: 'exact' });
    query = query.gt('balance_due', 0);
    if (status) query = query.eq('payment_status', status);
    if (customer_id) query = query.eq('customer_id', customer_id);
    if (overdue_only) query = query.lt('due_date', now.toISOString());

    // Sorting
    const ascending = sort_order === 'asc';
    if (sort_by === 'balance_due' || sort_by === 'grand_total' || sort_by === 'due_date' || sort_by === 'created_at') {
      query = query.order(sort_by, { ascending });
    } else {
      query = query.order('balance_due', { ascending: false });
    }

    const offset = (page - 1) * limit;
    const { data: rawInvoices, count, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;
    const invoices = rawInvoices || [];
    const total = count || 0;

    // Enrich with customer data
    const customerIds = [...new Set(invoices.map(i => i.customer_id).filter(Boolean))];
    let customerMap = new Map<string, Record<string, unknown>>();
    if (customerIds.length) {
      const { data: customers } = await supabaseAdmin.from('customers').select('id, name, email, phone, gstin').in('id', customerIds);
      customerMap = new Map((customers || []).map(c => [c.id, c]));
    }

    // Calculate days overdue for each invoice
    const enrichedInvoices = invoices.map(inv => {
      const customer = inv.customer_id ? customerMap.get(inv.customer_id) : null;
      const dueDate = inv.due_date ? new Date(inv.due_date) : null;
      const daysOverdue = dueDate && dueDate < now
        ? Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        ...withId(inv),
        customer_id: customer ? { _id: inv.customer_id, ...customer } : inv.customer_id,
        days_overdue: daysOverdue,
        is_overdue: daysOverdue > 0,
      };
    });

    // Fetch all outstanding invoices for summary stats (unfiltered by pagination)
    const { data: allOutstanding } = await supabaseAdmin
      .from('invoices')
      .select('balance_due, due_date, payment_status')
      .gt('balance_due', 0);

    const allInvs = allOutstanding || [];
    const summary = {
      total_outstanding_amount: allInvs.reduce((sum, i) => sum + Number(i.balance_due || 0), 0),
      total_outstanding_invoices: allInvs.length,
      overdue_amount: allInvs
        .filter(i => i.due_date && new Date(i.due_date) < now)
        .reduce((sum, i) => sum + Number(i.balance_due || 0), 0),
      overdue_count: allInvs.filter(i => i.due_date && new Date(i.due_date) < now).length,
      current_amount: allInvs
        .filter(i => !i.due_date || new Date(i.due_date) >= now)
        .reduce((sum, i) => sum + Number(i.balance_due || 0), 0),
      current_count: allInvs.filter(i => !i.due_date || new Date(i.due_date) >= now).length,
    };

    // Aging breakdown
    const aging = {
      current: { count: 0, amount: 0 },
      '1_30': { count: 0, amount: 0 },
      '31_60': { count: 0, amount: 0 },
      '61_90': { count: 0, amount: 0 },
      '90_plus': { count: 0, amount: 0 },
    };

    for (const inv of allInvs) {
      const dueDate = inv.due_date ? new Date(inv.due_date) : null;
      const daysOverdue = dueDate && dueDate < now
        ? Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const amount = Number(inv.balance_due || 0);

      if (daysOverdue <= 0) { aging.current.count++; aging.current.amount += amount; }
      else if (daysOverdue <= 30) { aging['1_30'].count++; aging['1_30'].amount += amount; }
      else if (daysOverdue <= 60) { aging['31_60'].count++; aging['31_60'].amount += amount; }
      else if (daysOverdue <= 90) { aging['61_90'].count++; aging['61_90'].amount += amount; }
      else { aging['90_plus'].count++; aging['90_plus'].amount += amount; }
    }

    return NextResponse.json({
      success: true,
      invoices: enrichedInvoices,
      summary,
      aging,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCount: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching outstanding invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch outstanding data' }, { status: 500 });
  }
}