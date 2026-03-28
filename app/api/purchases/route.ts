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
    const seller_id = searchParams.get('seller_id');
    const payment_status = searchParams.get('payment_status');
    const quality_check = searchParams.get('quality_check');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const search = searchParams.get('search');

    let query = supabaseAdmin.from('purchases').select('*');
    if (seller_id) query = query.eq('seller_id', seller_id);
    if (payment_status) query = query.eq('payment_status', payment_status);
    if (quality_check) query = query.eq('quality_check', quality_check);
    if (from_date) query = query.gte('purchase_date', new Date(from_date).toISOString());
    if (to_date) query = query.lte('purchase_date', new Date(to_date).toISOString());

    const { data: rawPurchases, error } = await query.order('serial_number', { ascending: false });
    if (error) throw error;
    let purchases = withIds(rawPurchases || []);

    // Enrich with seller data
    const sellerIds = [...new Set(purchases.map(p => (p as Record<string, unknown>).seller_id).filter(Boolean))] as string[];
    let sellerMap = new Map<string, Record<string, unknown>>();
    if (sellerIds.length) {
      const { data: sellers } = await supabaseAdmin.from('sellers').select('id, name, gstin, phone, city').in('id', sellerIds);
      sellerMap = new Map((sellers || []).map(s => [s.id, s]));
    }

    // Enrich with purchase items
    const purchaseIds = purchases.map(p => (p as Record<string, unknown>).id) as string[];
    let itemsMap = new Map<string, Record<string, unknown>[]>();
    if (purchaseIds.length) {
      const { data: items } = await supabaseAdmin.from('purchase_items').select('*').in('purchase_id', purchaseIds);
      for (const item of (items || [])) {
        const list = itemsMap.get(item.purchase_id) || [];
        list.push(item);
        itemsMap.set(item.purchase_id, list);
      }
    }

    purchases = purchases.map(p => {
      const pr = p as Record<string, unknown>;
      const seller = pr.seller_id ? sellerMap.get(pr.seller_id as string) : null;
      return {
        ...pr,
        seller_id: seller ? { _id: pr.seller_id, ...seller } : pr.seller_id,
        purchase_items: itemsMap.get(pr.id as string) || [],
      };
    });

    // Text search filter (after enrichment so we can search seller/item names)
    if (search) {
      const s = search.toLowerCase();
      purchases = purchases.filter(p => {
        const pr = p as Record<string, unknown>;
        const sellerObj = pr.seller_id as Record<string, unknown> | null;
        const items = (pr.purchase_items as Record<string, unknown>[]) || [];
        return (
          String(pr.purchase_number || '').toLowerCase().includes(s) ||
          String(pr.invoice_number || '').toLowerCase().includes(s) ||
          (sellerObj && String(sellerObj.name || '').toLowerCase().includes(s)) ||
          items.some(i => String(i.product_name || '').toLowerCase().includes(s) || String(i.batch_number || '').toLowerCase().includes(s))
        );
      });
    }

    const summary = {
      total_purchases: purchases.length,
      total_amount: purchases.reduce((sum, p) => sum + Number((p as Record<string, unknown>).final_amount || 0), 0),
      total_paid: purchases.reduce((sum, p) => sum + Number((p as Record<string, unknown>).paid_amount || 0), 0),
      total_due: purchases.reduce((sum, p) => sum + Number((p as Record<string, unknown>).due_amount || 0), 0),
      pending_count: purchases.filter(p => (p as Record<string, unknown>).payment_status === 'Pending').length,
      partial_count: purchases.filter(p => (p as Record<string, unknown>).payment_status === 'Partial').length,
      paid_count: purchases.filter(p => (p as Record<string, unknown>).payment_status === 'Paid').length,
    };

    return NextResponse.json({ success: true, purchases, summary });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;

    const body = await request.json();

    // Auto-fill from seller if provided
    if (body.seller_id) {
      const { data: seller } = await supabaseAdmin.from('sellers').select('*').eq('id', body.seller_id).single();
      if (seller) {
        if (!body.supplier_name) body.supplier_name = seller.name;
      }
    }

    // Calculate amounts
    if (!body.total_amount && body.quantity && body.unit_price) {
      body.total_amount = body.quantity * body.unit_price;
    }
    if (!body.final_amount) {
      body.final_amount = (body.total_amount || 0) + (body.tax_amount || 0) - (body.discount_amount || 0);
    }
    if (body.paid_amount === undefined) body.paid_amount = 0;
    body.due_amount = Math.max(0, (body.final_amount || 0) - (body.paid_amount || 0));
    body.created_by = decoded.userId;
    if (!body.purchase_date) body.purchase_date = new Date().toISOString();

    // Extract purchase_items from body
    const purchaseItems = body.purchase_items || body.items || [];
    delete body.purchase_items;
    delete body.items;
    delete body.supplier_name;
    delete body.supplier_contact;
    delete body.supplier_address;
    delete body.supplier_gstin;
    delete body.supplier_email;
    delete body.product_name;
    delete body.quantity;
    delete body.unit;
    delete body.unit_price;
    delete body.batch_number;

    const { data: purchase, error } = await supabaseAdmin.from('purchases').insert(body).select().single();
    if (error) throw error;

    // Insert purchase items if any
    if (purchaseItems.length > 0) {
      const itemsToInsert = purchaseItems.map((item: Record<string, unknown>) => ({
        purchase_id: purchase.id,
        product_name: item.product_name || '',
        hsn_code: item.hsn_code || '',
        quantity: item.quantity || 0,
        unit: item.unit || 'kg',
        rate: item.rate || item.unit_price || 0,
        taxable_value: item.taxable_value || 0,
        batch_number: item.batch_number || null,
        manufacturing_date: item.manufacturing_date || null,
        expiry_date: item.expiry_date || null,
      }));
      await supabaseAdmin.from('purchase_items').insert(itemsToInsert);
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase created successfully',
      purchase: withId(purchase),
      serial_number: purchase.serial_number,
    });
  } catch (error) {
    console.error('Error creating purchase:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create purchase' }, { status: 500 });
  }
}