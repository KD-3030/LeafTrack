import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/authMiddleware';
import { withId, withIds } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;

    const { searchParams } = new URL(request.url);
    const refund_status = searchParams.get('refund_status');
    const approval_status = searchParams.get('approval_status');
    const return_type = searchParams.get('return_type');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const search = searchParams.get('search');

    let query = supabaseAdmin.from('purchase_returns').select('*');
    if (refund_status) query = query.eq('refund_status', refund_status);
    if (approval_status) query = query.eq('approval_status', approval_status);
    if (return_type) query = query.eq('return_type', return_type);
    if (from_date) query = query.gte('return_date', new Date(from_date).toISOString());
    if (to_date) query = query.lte('return_date', new Date(to_date).toISOString());

    const { data: rawReturns, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    let returns = withIds(rawReturns || []);

    // Text search filter
    if (search) {
      const s = search.toLowerCase();
      returns = returns.filter(r => {
        const ret = r as Record<string, unknown>;
        return (
          String(ret.return_number || '').toLowerCase().includes(s) ||
          String(ret.supplier_name || '').toLowerCase().includes(s) ||
          String(ret.product_name || '').toLowerCase().includes(s) ||
          String(ret.debit_note_number || '').toLowerCase().includes(s)
        );
      });
    }

    const summary = {
      total_returns: returns.length,
      total_return_amount: returns.reduce((sum, r) => sum + Number((r as Record<string, unknown>).final_return_amount || 0), 0),
      total_refunded: returns.reduce((sum, r) => sum + Number((r as Record<string, unknown>).refunded_amount || 0), 0),
      pending_refund: returns.reduce((sum, r) => sum + Number((r as Record<string, unknown>).pending_refund_amount || 0), 0),
      pending_approval: returns.filter(r => (r as Record<string, unknown>).approval_status === 'Pending').length,
      approved: returns.filter(r => (r as Record<string, unknown>).approval_status === 'Approved').length,
    };

    return NextResponse.json({ success: true, purchaseReturns: returns, summary });
  } catch (error) {
    console.error('Error fetching purchase returns:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase returns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;

    const body = await request.json();

    const requiredFields = ['product_name', 'returned_quantity', 'unit_price', 'return_reason'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    // Calculate amounts
    body.total_return_amount = (body.returned_quantity || 0) * (body.unit_price || 0);
    body.tax_amount = body.tax_amount || 0;
    body.tax_percentage = body.tax_percentage || 0;
    body.discount_amount = body.discount_amount || 0;
    body.final_return_amount = body.total_return_amount + body.tax_amount - body.discount_amount;
    body.pending_refund_amount = body.final_return_amount - (body.refunded_amount || 0);
    body.created_by = decoded.userId;
    if (!body.return_date) body.return_date = new Date().toISOString();
    if (!body.refund_status) body.refund_status = 'Pending';
    if (!body.approval_status) body.approval_status = 'Pending';

    // Remove _id if sent from frontend
    delete body._id;

    const { data: purchaseReturn, error } = await supabaseAdmin.from('purchase_returns').insert(body).select().single();
    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Purchase return created successfully',
      purchaseReturn: withId(purchaseReturn),
    });
  } catch (error) {
    console.error('Error creating purchase return:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create purchase return' }, { status: 500 });
  }
}