import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/authMiddleware';
import { withId } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

// DELETE - Delete a sale return
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = params;

    // Fetch before delete for response
    const { data: existing } = await supabaseAdmin
      .from('sale_returns')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Sale return not found' },
        { status: 404 }
      );
    }

    // Delete items first (cascade should handle, but be explicit)
    await supabaseAdmin
      .from('sale_return_items')
      .delete()
      .eq('sale_return_id', id);

    const { error } = await supabaseAdmin
      .from('sale_returns')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete sale return error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete sale return' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Sale return deleted successfully',
    });

  } catch (error) {
    console.error('Delete sale return error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get a single sale return by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = params;

    // Fetch sale return with items
    const { data: saleReturn, error } = await supabaseAdmin
      .from('sale_returns')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !saleReturn) {
      return NextResponse.json(
        { success: false, error: 'Sale return not found' },
        { status: 404 }
      );
    }

    // Fetch related data
    const [
      { data: items },
      { data: customer },
      { data: salesman },
      { data: invoice },
      { data: approver },
    ] = await Promise.all([
      supabaseAdmin.from('sale_return_items').select('*').eq('sale_return_id', id),
      saleReturn.customer_id
        ? supabaseAdmin.from('customers').select('id, name, email, phone').eq('id', saleReturn.customer_id).single()
        : Promise.resolve({ data: null }),
      saleReturn.salesman_id
        ? supabaseAdmin.from('users').select('id, name, email').eq('id', saleReturn.salesman_id).single()
        : Promise.resolve({ data: null }),
      saleReturn.original_invoice_id
        ? supabaseAdmin.from('invoices').select('id, invoice_number, invoice_date').eq('id', saleReturn.original_invoice_id).single()
        : Promise.resolve({ data: null }),
      saleReturn.approved_by
        ? supabaseAdmin.from('users').select('id, name').eq('id', saleReturn.approved_by).single()
        : Promise.resolve({ data: null }),
    ]);

    return NextResponse.json({
      success: true,
      saleReturn: withId({
        ...saleReturn,
        items: items || [],
        customer,
        salesman,
        original_invoice: invoice,
        approver,
      }),
    });

  } catch (error) {
    console.error('Get sale return error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update a sale return
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = params;
    const updates = await request.json();

    // Fields that can be updated
    const allowedUpdates = ['status', 'refund_status', 'notes', 'refund_method'];
    const updateData: Record<string, unknown> = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        updateData[key] = updates[key];
      }
    }

    const { data: updatedReturn, error } = await supabaseAdmin
      .from('sale_returns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedReturn) {
      return NextResponse.json(
        { success: false, error: 'Sale return not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Sale return updated successfully',
      saleReturn: withId(updatedReturn),
    });

  } catch (error) {
    console.error('Update sale return error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
