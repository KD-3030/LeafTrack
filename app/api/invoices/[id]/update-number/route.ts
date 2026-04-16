import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/authMiddleware';
import { withId } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

// PATCH - Update invoice number
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin authentication
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const { new_invoice_number } = await request.json();

    if (!new_invoice_number || !new_invoice_number.trim()) {
      return NextResponse.json(
        { success: false, error: 'New invoice number is required' },
        { status: 400 }
      );
    }

    // Check if the invoice exists
    const { data: invoice, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('id, invoice_number')
      .eq('id', id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if the new invoice number is already used by another invoice
    const { data: existing } = await supabaseAdmin
      .from('invoices')
      .select('id')
      .eq('invoice_number', new_invoice_number.trim())
      .neq('id', id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Invoice number ${new_invoice_number} is already in use` },
        { status: 400 }
      );
    }

    // Update the invoice number
    const oldInvoiceNumber = invoice.invoice_number;
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('invoices')
      .update({ invoice_number: new_invoice_number.trim() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update invoice number error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update invoice number' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice number updated successfully',
      old_invoice_number: oldInvoiceNumber,
      new_invoice_number: updated.invoice_number,
      invoice: withId(updated),
    });

  } catch (error) {
    console.error('Error updating invoice number:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update invoice number' },
      { status: 500 }
    );
  }
}
