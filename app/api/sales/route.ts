import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/authMiddleware';
import { normalizeRoleId } from '@/lib/roles';
import { withId } from '@/lib/supabase-helpers';

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
    const salesmanId = searchParams.get('salesman_id');
    const customerId = searchParams.get('customer_id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const invoiceGenerated = searchParams.get('invoice_generated');

    let query = supabaseAdmin.from('sales').select('*', { count: 'exact' });

    if (salesmanId) query = query.eq('salesman_id', salesmanId);
    if (customerId) query = query.eq('customer_id', customerId);
    if (invoiceGenerated !== null && invoiceGenerated !== undefined && invoiceGenerated !== '') {
      query = query.eq('invoice_generated', invoiceGenerated === 'true');
    }
    if (fromDate) query = query.gte('sale_date', new Date(fromDate).toISOString());
    if (toDate) query = query.lte('sale_date', new Date(toDate).toISOString());

    if (roleId === 'secondary_executive') {
      query = query.eq('salesman_id', decoded.userId);
    } else if (roleId === 'primary_executive') {
      const { data: team } = await supabaseAdmin.from('users').select('id').eq('manager_id', decoded.userId);
      const teamIds = [decoded.userId, ...(team || []).map(m => m.id)];
      query = query.in('salesman_id', teamIds);
    }

    const offset = (page - 1) * limit;
    const { data: rawSales, count, error } = await query
      .order('sale_date', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    const sales = rawSales || [];
    const total = count || 0;

    // Enrich with related data
    const uIds = [...new Set(sales.map(s => s.salesman_id).filter(Boolean))];
    const pIds = [...new Set(sales.map(s => s.product_id).filter(Boolean))];
    const cIds = [...new Set(sales.map(s => s.customer_id).filter(Boolean))];
    const aIds = [...new Set(sales.map(s => s.assignment_id).filter(Boolean))];

    const [uRes, pRes, cRes, aRes] = await Promise.all([
      uIds.length ? supabaseAdmin.from('users').select('id, name, email').in('id', uIds) : { data: [] },
      pIds.length ? supabaseAdmin.from('products').select('id, name, manufacturing_cost, hsn_code, gst_rate').in('id', pIds) : { data: [] },
      cIds.length ? supabaseAdmin.from('distributors').select('id, name, email, phone').in('id', cIds) : { data: [] },
      aIds.length ? supabaseAdmin.from('assignments').select('*').in('id', aIds) : { data: [] },
    ]);

    const uMap = new Map((uRes.data || []).map(u => [u.id, u]));
    const pMap = new Map((pRes.data || []).map(p => [p.id, p]));
    const cMap = new Map((cRes.data || []).map(c => [c.id, c]));
    const aMap = new Map((aRes.data || []).map(a => [a.id, a]));

    const enriched = sales.map(s => ({
      ...withId(s),
      salesman_id: s.salesman_id && uMap.has(s.salesman_id) ? { _id: s.salesman_id, ...uMap.get(s.salesman_id) } : s.salesman_id,
      product_id: s.product_id && pMap.has(s.product_id) ? { _id: s.product_id, ...pMap.get(s.product_id) } : s.product_id,
      customer_id: s.customer_id && cMap.has(s.customer_id) ? { _id: s.customer_id, ...cMap.get(s.customer_id) } : s.customer_id,
      assignment_id: s.assignment_id && aMap.has(s.assignment_id) ? { _id: s.assignment_id, ...aMap.get(s.assignment_id) } : s.assignment_id,
    }));

    return NextResponse.json({
      success: true,
      sales: enriched,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCount: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;

    const { data: currentUser } = await supabaseAdmin.from('users').select('id, role, manager_id').eq('id', decoded.userId).single();
    if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const roleId = normalizeRoleId(currentUser.role);

    const saleData = await request.json();

    if (!saleData.assignment_id || !saleData.quantity_sold || !saleData.unit_price) {
      return NextResponse.json({ error: 'Assignment ID, quantity sold, and unit price are required' }, { status: 400 });
    }

    // Verify assignment
    const { data: assignment } = await supabaseAdmin.from('assignments').select('*').eq('id', saleData.assignment_id).single();
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

    const { data: product } = await supabaseAdmin.from('products').select('id, name, manufacturing_cost, hsn_code, gst_rate').eq('id', assignment.product_id).single();

    // Check role-based authorization
    if (roleId === 'secondary_executive') {
      if (!currentUser.manager_id || assignment.salesman_id !== currentUser.manager_id) {
        return NextResponse.json({ error: 'Unauthorized to consume stock outside your primary executive pool' }, { status: 403 });
      }
    } else if (roleId === 'primary_executive') {
      if (assignment.salesman_id !== decoded.userId) {
        return NextResponse.json({ error: 'Unauthorized to consume stock outside your pool' }, { status: 403 });
      }
    }

    if (saleData.quantity_sold > assignment.quantity) {
      return NextResponse.json({ error: `Insufficient stock. Available: ${assignment.quantity} units` }, { status: 400 });
    }

    // Handle customer creation/selection
    let customerId = saleData.customer_id;
    if (!customerId && saleData.customer_details) {
      const peId = roleId === 'primary_executive' ? decoded.userId : (roleId === 'secondary_executive' ? currentUser.manager_id : undefined);
      const { data: newCust, error: custErr } = await supabaseAdmin.from('distributors').insert({
        name: saleData.customer_details.name,
        email: saleData.customer_details.email || `customer_${Date.now()}@leaftrack.com`,
        phone: saleData.customer_details.phone,
        address: saleData.customer_details.address,
        state: saleData.customer_details.state,
        gstin: saleData.customer_details.gstin,
        business_type: 'Individual',
        status: 'Active',
        pe_id: peId,
        created_by: decoded.userId,
      }).select('id').single();
      if (custErr) throw custErr;
      customerId = newCust.id;
    }

    const quantity = saleData.quantity_sold;
    const unitPrice = saleData.unit_price;
    const discountPercentage = saleData.discount_percentage || 0;
    const totalAmount = unitPrice * quantity * (1 - discountPercentage / 100);

    // Create sale
    const { data: sale, error: saleErr } = await supabaseAdmin.from('sales').insert({
      assignment_id: saleData.assignment_id,
      salesman_id: currentUser.id,
      product_id: assignment.product_id,
      customer_id: customerId,
      quantity_sold: quantity,
      unit_price: unitPrice,
      price_at_sale: assignment.selling_price_per_unit,
      discount_percentage: discountPercentage,
      total_amount: totalAmount,
      payment_method: saleData.payment_method || 'Cash',
      notes: saleData.notes,
    }).select().single();
    if (saleErr) throw saleErr;

    // Update assignment quantity
    await supabaseAdmin.from('assignments').update({ quantity: assignment.quantity - quantity }).eq('id', saleData.assignment_id);

    const enrichedSale = {
      ...withId(sale),
      assignment_id: { _id: assignment.id, ...assignment },
      salesman_id: { _id: currentUser.id, name: currentUser.name, email: (currentUser as Record<string, unknown>).email },
      product_id: product ? { _id: product.id, ...product } : sale.product_id,
      customer_id: customerId,
    };

    return NextResponse.json({ success: true, message: 'Sale created successfully', sale: enrichedSale });
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
  }
}