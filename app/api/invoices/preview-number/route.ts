import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const customSequence = searchParams.get('sequence');

    const { data: allInvoices } = await supabaseAdmin.from('invoices').select('invoice_number');
    let maxSequence = 0;
    (allInvoices || []).forEach(inv => {
      const match = inv.invoice_number.match(/(\d{4})$/);
      if (match) { const seq = parseInt(match[1]); if (seq > maxSequence) maxSequence = seq; }
    });

    const nextSequence = customSequence ? parseInt(customSequence) : (maxSequence + 1);
    const dateStr = invoiceDate.replace(/-/g, '');
    const previewInvoiceNumber = `INV-${dateStr}-${nextSequence.toString().padStart(4, '0')}`;

    return NextResponse.json({
      success: true,
      invoice_number: previewInvoiceNumber,
      next_sequence: nextSequence,
      max_sequence: maxSequence,
      date: invoiceDate,
    });
  } catch (error) {
    console.error('Error generating preview invoice number:', error);
    return NextResponse.json({ error: 'Failed to generate preview invoice number' }, { status: 500 });
  }
}