import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Invoice from '@/models/Invoice';

export const dynamic = 'force-dynamic';

// GET - Preview next invoice number based on date
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const invoiceDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const customSequence = searchParams.get('sequence');
    
    // Find the highest sequence number from existing invoices
    const allInvoices = await Invoice.find({}).select('invoice_number');
    let maxSequence = 0;
    allInvoices.forEach(inv => {
      const match = inv.invoice_number.match(/(\d{4})$/);
      if (match) {
        const seq = parseInt(match[1]);
        if (seq > maxSequence) {
          maxSequence = seq;
        }
      }
    });
    
    // Use custom sequence if provided, otherwise use next available
    const nextSequence = customSequence ? parseInt(customSequence) : (maxSequence + 1);
    
    // Generate preview invoice number in format: INV-YYYYMMDD-XXXX
    const dateStr = invoiceDate.replace(/-/g, ''); // YYYYMMDD
    const nextNumber = nextSequence.toString().padStart(4, '0');
    const previewInvoiceNumber = `INV-${dateStr}-${nextNumber}`;
    
    return NextResponse.json({
      success: true,
      invoice_number: previewInvoiceNumber,
      next_sequence: nextSequence,
      max_sequence: maxSequence,
      date: invoiceDate,
    });
  } catch (error) {
    console.error('Error generating preview invoice number:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview invoice number' },
      { status: 500 }
    );
  }
}
