import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/authMiddleware';
import { withId } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

// GET /api/purchases/[id] - Get a single purchase
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { data: purchase, error } = await supabaseAdmin
      .from('purchases')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    // Fetch purchase items
    const { data: items } = await supabaseAdmin
      .from('purchase_items')
      .select('*')
      .eq('purchase_id', params.id);

    return NextResponse.json({
      success: true,
      purchase: withId({ ...purchase, items: items || [] }),
    });
  } catch (error) {
    console.error('Error fetching purchase:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase' },
      { status: 500 }
    );
  }
}

// PUT /api/purchases/[id] - Update a purchase
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();

    // Find existing purchase
    const { data: existingPurchase, error: fetchError } = await supabaseAdmin
      .from('purchases')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingPurchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    // Recalculate total_amount if quantity or unit_price changed
    if (body.quantity || body.unit_price) {
      const quantity = body.quantity || existingPurchase.quantity;
      const unit_price = body.unit_price || existingPurchase.unit_price;
      body.total_amount = quantity * unit_price;
    }

    // Recalculate final_amount if related fields changed
    if (body.total_amount || body.tax_amount !== undefined || body.discount_amount !== undefined) {
      const total = body.total_amount || existingPurchase.total_amount;
      const tax = body.tax_amount !== undefined ? body.tax_amount : existingPurchase.tax_amount;
      const discount = body.discount_amount !== undefined ? body.discount_amount : existingPurchase.discount_amount;
      body.final_amount = total + tax - discount;
    }

    // Remove fields that shouldn't be directly updated
    const { id: _, _id: __, items, ...updateFields } = body;

    const { data: updatedPurchase, error: updateError } = await supabaseAdmin
      .from('purchases')
      .update(updateFields)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Purchase update error:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update purchase' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase updated successfully',
      purchase: withId(updatedPurchase),
    });
  } catch (error) {
    console.error('Error updating purchase:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update purchase' },
      { status: 500 }
    );
  }
}

// DELETE /api/purchases/[id] - Delete a purchase
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    // Delete purchase items first (cascade should handle this, but be explicit)
    await supabaseAdmin
      .from('purchase_items')
      .delete()
      .eq('purchase_id', params.id);

    const { error } = await supabaseAdmin
      .from('purchases')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: 'Purchase not found or could not be deleted' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting purchase:', error);
    return NextResponse.json(
      { error: 'Failed to delete purchase' },
      { status: 500 }
    );
  }
}
