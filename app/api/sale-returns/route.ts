import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, requireAdminAuth } from '@/lib/authMiddleware';
import { withId, withIds } from '@/lib/supabase-helpers';
import { normalizeRoleId } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;

    const { data: currentUser } = await supabaseAdmin.from('users').select('id, role, manager_id').eq('id', decoded.userId).single();
    if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const roleId = normalizeRoleId(currentUser.role);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const customer_id = searchParams.get('customer_id');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');

    let query = supabaseAdmin.from('sale_returns').select('*, sale_return_items(*)', { count: 'exact' });

    // Role-based filtering
    if (roleId === 'secondary_executive') {
      query = query.eq('salesman_id', decoded.userId);
    } else if (roleId === 'primary_executive') {
      const { data: teamMembers } = await supabaseAdmin.from('users').select('id').eq('manager_id', decoded.userId);
      const teamIds = [decoded.userId, ...(teamMembers || []).map(m => m.id)];
      query = query.in('salesman_id', teamIds);
    }

    if (status) query = query.eq('status', status);
    if (customer_id) query = query.eq('distributor_id', customer_id);
    if (from_date) query = query.gte('return_date', new Date(from_date).toISOString());
    if (to_date) query = query.lte('return_date', new Date(to_date).toISOString());

    const offset = (page - 1) * limit;
    const { data: rawReturns, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    const returns = rawReturns || [];
    const total = count || 0;

    // Enrich with customer, salesman, and invoice data
    const customerIds = [...new Set(returns.map(r => r.distributor_id).filter(Boolean))];
    const salesmanIds = [...new Set(returns.map(r => r.salesman_id).filter(Boolean))];
    const invoiceIds = [...new Set(returns.map(r => r.original_invoice_id).filter(Boolean))];

    const [customersRes, salesmenRes, invoicesRes] = await Promise.all([
      customerIds.length ? supabaseAdmin.from('distributors').select('id, name, email, phone').in('id', customerIds) : { data: [] },
      salesmanIds.length ? supabaseAdmin.from('users').select('id, name, email').in('id', salesmanIds) : { data: [] },
      invoiceIds.length ? supabaseAdmin.from('invoices').select('id, invoice_number, grand_total').in('id', invoiceIds) : { data: [] },
    ]);

    const customersMap = new Map((customersRes.data || []).map(c => [c.id, c]));
    const salesmenMap = new Map((salesmenRes.data || []).map(s => [s.id, s]));
    const invoicesMap = new Map((invoicesRes.data || []).map(i => [i.id, i]));

    const enriched = returns.map(r => ({
      ...withId(r),
      customer_id: r.distributor_id && customersMap.has(r.distributor_id)
        ? { _id: r.distributor_id, ...customersMap.get(r.distributor_id) }
        : r.distributor_id,
      salesman_id: r.salesman_id && salesmenMap.has(r.salesman_id)
        ? { _id: r.salesman_id, ...salesmenMap.get(r.salesman_id) }
        : r.salesman_id,
      original_invoice_id: r.original_invoice_id && invoicesMap.has(r.original_invoice_id)
        ? { _id: r.original_invoice_id, ...invoicesMap.get(r.original_invoice_id) }
        : r.original_invoice_id,
      items: (r.sale_return_items || []).map((item: Record<string, unknown>) => withId(item)),
    }));

    // Summary
    const { data: allReturns } = await supabaseAdmin.from('sale_returns').select('status, total_refund_amount');
    const summary = {
      total_returns: total,
      total_refund_amount: (allReturns || []).reduce((sum, r) => sum + Number(r.total_refund_amount || 0), 0),
      pending: (allReturns || []).filter(r => r.status === 'pending').length,
      approved: (allReturns || []).filter(r => r.status === 'approved').length,
      rejected: (allReturns || []).filter(r => r.status === 'rejected').length,
      completed: (allReturns || []).filter(r => r.status === 'completed').length,
    };

    return NextResponse.json({
      success: true,
      saleReturns: enriched,
      summary,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCount: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching sale returns:', error);
    return NextResponse.json({ error: 'Failed to fetch sale returns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;

    const body = await request.json();

    // Validate
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'At least one return item is required' }, { status: 400 });
    }
    if (!body.return_reason) {
      return NextResponse.json({ error: 'Return reason is required' }, { status: 400 });
    }

    // Calculate totals from items
    let subtotal = 0;
    const processedItems = body.items.map((item: Record<string, unknown>) => {
      const qty = Number(item.return_quantity || item.quantity_returned || 0);
      const price = Number(item.unit_price || 0);
      const itemTotal = qty * price;
      subtotal += itemTotal;
      return {
        product_id: item.product_id || null,
        product_name: item.product_name || '',
        original_quantity: Number(item.original_quantity || 0),
        return_quantity: qty,
        quantity_returned: qty,
        return_reason: item.return_reason || item.reason || body.return_reason,
        reason: item.return_reason || item.reason || body.return_reason,
        condition: item.condition || 'used',
        unit_price: price,
        total_refund: itemTotal,
        total_amount: itemTotal,
      };
    });

    const taxAmount = Number(body.tax_amount || 0);
    const totalRefundAmount = subtotal + taxAmount;

    // Build sale return record
    const saleReturnData: Record<string, unknown> = {
      original_invoice_id: body.original_invoice_id || body.invoice_id || null,
      original_sale_id: body.original_sale_id || null,
      distributor_id: body.customer_id || null,
      salesman_id: body.salesman_id || decoded.userId,
      is_manual_entry: body.is_manual_entry || !body.original_invoice_id,
      customer_name: body.customer_name || '',
      customer_email: body.customer_email || '',
      customer_phone: body.customer_phone || '',
      created_by: decoded.userId,
      return_reason: body.return_reason,
      return_date: body.return_date || new Date().toISOString(),
      subtotal,
      tax_amount: taxAmount,
      total_refund: totalRefundAmount,
      total_refund_amount: totalRefundAmount,
      status: 'pending',
      refund_method: body.refund_method || null,
      refund_status: 'pending',
      notes: body.notes || '',
      admin_approval: 'pending',
    };

    // If invoice-based, validate invoice exists
    if (saleReturnData.original_invoice_id) {
      const { data: invoice } = await supabaseAdmin
        .from('invoices')
        .select('id, distributor_id, salesman_id')
        .eq('id', saleReturnData.original_invoice_id)
        .single();
      if (!invoice) {
        return NextResponse.json({ error: 'Original invoice not found' }, { status: 404 });
      }
      if (!saleReturnData.distributor_id) saleReturnData.distributor_id = invoice.distributor_id;
      if (!saleReturnData.salesman_id) saleReturnData.salesman_id = invoice.salesman_id;
    }

    // Enrich customer info if distributor_id provided but no name
    if (saleReturnData.distributor_id && !saleReturnData.customer_name) {
      const { data: customer } = await supabaseAdmin.from('distributors').select('name, email, phone').eq('id', saleReturnData.distributor_id).single();
      if (customer) {
        saleReturnData.customer_name = customer.name;
        saleReturnData.customer_email = customer.email || '';
        saleReturnData.customer_phone = customer.phone || '';
      }
    }

    // Create sale return (return_number auto-generated by DB trigger)
    const { data: saleReturn, error: srError } = await supabaseAdmin
      .from('sale_returns')
      .insert(saleReturnData)
      .select()
      .single();
    if (srError) throw srError;

    // Insert sale return items
    if (processedItems.length > 0) {
      const itemsToInsert = processedItems.map((item: Record<string, unknown>) => ({
        ...item,
        sale_return_id: saleReturn.id,
      }));
      const { error: itemsError } = await supabaseAdmin.from('sale_return_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;
    }

    return NextResponse.json({
      success: true,
      message: 'Sale return created successfully',
      saleReturn: withId(saleReturn),
    });
  } catch (error) {
    console.error('Error creating sale return:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create sale return' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;

    const body = await request.json();
    const { id, status: newStatus, refund_status: newRefundStatus } = body;
    if (!id) return NextResponse.json({ error: 'Sale return ID is required' }, { status: 400 });

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (newStatus) {
      updateData.status = newStatus;
      updateData.admin_approval = newStatus === 'approved' ? 'approved' : newStatus === 'rejected' ? 'rejected' : 'pending';
      if (newStatus === 'approved' || newStatus === 'rejected') {
        updateData.approved_by = decoded.userId;
        updateData.approval_date = new Date().toISOString();
      }
    }
    if (newRefundStatus) updateData.refund_status = newRefundStatus;

    const { data: updated, error } = await supabaseAdmin.from('sale_returns').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    if (!updated) return NextResponse.json({ error: 'Sale return not found' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'Sale return updated', saleReturn: withId(updated) });
  } catch (error) {
    console.error('Error updating sale return status:', error);
    return NextResponse.json({ error: 'Failed to update sale return' }, { status: 500 });
  }
}