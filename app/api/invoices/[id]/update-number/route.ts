import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import { requireAdminAuth } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

// PATCH - Update invoice number
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // Require admin authentication
    const authResult = requireAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = params;
    const { new_invoice_number } = await request.json();

    if (!new_invoice_number || !new_invoice_number.trim()) {
      return NextResponse.json(
        { success: false, error: 'New invoice number is required' },
        { status: 400 }
      );
    }

    // Check if the invoice exists
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if the new invoice number is already used by another invoice
    const existingInvoice = await Invoice.findOne({
      invoice_number: new_invoice_number.trim(),
      _id: { $ne: id } // Exclude current invoice
    });

    if (existingInvoice) {
      return NextResponse.json(
        { success: false, error: `Invoice number ${new_invoice_number} is already in use` },
        { status: 400 }
      );
    }

    // Update the invoice number
    const oldInvoiceNumber = invoice.invoice_number;
    invoice.invoice_number = new_invoice_number.trim();
    await invoice.save();

    return NextResponse.json({
      success: true,
      message: 'Invoice number updated successfully',
      old_invoice_number: oldInvoiceNumber,
      new_invoice_number: invoice.invoice_number,
      invoice: invoice
    });

  } catch (error) {
    console.error('Error updating invoice number:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update invoice number' },
      { status: 500 }
    );
  }
}
