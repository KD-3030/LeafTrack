import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/authMiddleware';
import { withId } from '@/lib/supabase-helpers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/purchase-returns/[id] - Get a single purchase return
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { id } = await params;

    const { data: purchaseReturn, error } = await supabaseAdmin
      .from('purchase_returns')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !purchaseReturn) {
      return NextResponse.json({ error: 'Purchase return not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      return: withId(purchaseReturn),
    });
  } catch (error) {
    console.error('Error fetching purchase return:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase return' },
      { status: 500 }
    );
  }
}

// PUT /api/purchase-returns/[id] - Update a purchase return
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { id } = await params;

    const body = await request.json();

    // Find existing purchase return
    const { data: existingReturn, error: fetchError } = await supabaseAdmin
      .from('purchase_returns')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingReturn) {
      return NextResponse.json({ error: 'Purchase return not found' }, { status: 404 });
    }

    // Recalculate total_return_amount if quantity or unit_price changed
    if (body.returned_quantity || body.unit_price) {
      const quantity = body.returned_quantity || existingReturn.returned_quantity;
      const unit_price = body.unit_price || existingReturn.unit_price;
      body.total_return_amount = quantity * unit_price;
    }

    // Recalculate final_return_amount if related fields changed
    if (body.total_return_amount || body.tax_amount !== undefined || body.discount_amount !== undefined) {
      const total = body.total_return_amount || existingReturn.total_return_amount;
      const tax = body.tax_amount !== undefined ? body.tax_amount : existingReturn.tax_amount;
      const discount = body.discount_amount !== undefined ? body.discount_amount : existingReturn.discount_amount;
      body.final_return_amount = total + tax - discount;
    }

    // Remove fields that shouldn't be directly updated
    const { id: _, _id: __, ...updateFields } = body;

    const { data: updatedReturn, error: updateError } = await supabaseAdmin
      .from('purchase_returns')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Purchase return update error:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update purchase return' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase return updated successfully',
      return: withId(updatedReturn),
    });
  } catch (error) {
    console.error('Error updating purchase return:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update purchase return' },
      { status: 500 }
    );
  }
}

// DELETE /api/purchase-returns/[id] - Delete a purchase return
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('purchase_returns')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Purchase return not found or could not be deleted' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase return deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting purchase return:', error);
    return NextResponse.json(
      { error: 'Failed to delete purchase return' },
      { status: 500 }
    );
  }
}
