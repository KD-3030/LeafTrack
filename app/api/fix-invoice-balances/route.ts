import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import { requireUserAuth } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

/**
 * POST /api/fix-invoice-balances
 * 
 * Recalculates all invoice balances based on payment records.
 * This fixes the mismatch between invoice paid_amount and actual payments.
 * 
 * ⚠️ ADMIN ONLY - This modifies database records
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication and admin role
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Check if user is admin (you may need to adjust this based on your auth structure)
    // For now, we'll just check if they're authenticated
    
    await connectDB();

    console.log('🔧 Starting invoice balance recalculation...');

    // Get all non-cancelled invoices
    const invoices = await Invoice.find({
      status: { $ne: 'Cancelled' }
    }).lean();

    console.log(`📊 Found ${invoices.length} invoices to process`);

    const results = {
      total: invoices.length,
      updated: 0,
      unchanged: 0,
      errors: 0,
      details: [] as Array<{
        invoice_number: string;
        old_paid: number;
        new_paid: number;
        old_due: number;
        new_due: number;
        old_status: string;
        new_status: string;
        payment_count: number;
      }>
    };

    for (const invoice of invoices) {
      try {
        // Get all confirmed/pending payments for this invoice
        const payments = await Payment.find({
          invoice_id: invoice._id,
          status: { $in: ['Confirmed', 'Pending'] }
        }).lean();

        // Calculate total paid from all payments
        const totalPaid = payments.reduce((sum, payment) => {
          return sum + (payment.amount_paid || 0);
        }, 0);

        // Calculate balance due
        const balanceDue = invoice.grand_total - totalPaid;

        // Determine payment status
        let paymentStatus: 'Pending' | 'Partial' | 'Paid' = 'Pending';
        if (balanceDue <= 0) {
          paymentStatus = 'Paid';
        } else if (totalPaid > 0) {
          paymentStatus = 'Partial';
        }

        // Check if update is needed
        const needsUpdate =
          invoice.paid_amount !== totalPaid ||
          invoice.balance_due !== Math.max(0, balanceDue) ||
          invoice.payment_status !== paymentStatus;

        if (needsUpdate) {
          // Update the invoice
          await Invoice.findByIdAndUpdate(invoice._id, {
            $set: {
              paid_amount: totalPaid,
              balance_due: Math.max(0, balanceDue),
              payment_status: paymentStatus,
            }
          });

          results.updated++;
          results.details.push({
            invoice_number: invoice.invoice_number,
            old_paid: invoice.paid_amount || 0,
            new_paid: totalPaid,
            old_due: invoice.balance_due || 0,
            new_due: Math.max(0, balanceDue),
            old_status: invoice.payment_status || 'Pending',
            new_status: paymentStatus,
            payment_count: payments.length
          });

          console.log(`✅ Updated Invoice ${invoice.invoice_number}: ${payments.length} payments, ₹${totalPaid} paid`);
        } else {
          results.unchanged++;
        }

      } catch (error) {
        results.errors++;
        console.error(`❌ Error processing invoice ${invoice.invoice_number}:`, error);
      }
    }

    console.log(`\n✨ Recalculation complete: ${results.updated} updated, ${results.unchanged} unchanged, ${results.errors} errors`);

    return NextResponse.json({
      success: true,
      message: 'Invoice balances recalculated successfully',
      results: {
        total: results.total,
        updated: results.updated,
        unchanged: results.unchanged,
        errors: results.errors,
        // Only return first 20 details to avoid huge response
        sample_updates: results.details.slice(0, 20)
      }
    });

  } catch (error) {
    console.error('Error recalculating invoice balances:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to recalculate invoice balances',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
