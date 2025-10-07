import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice, { IInvoice } from '@/models/Invoice';
import Payment, { IPayment } from '@/models/Payment';
import { requireUserAuth } from '@/lib/authMiddleware';
import { Model } from 'mongoose';

export const dynamic = 'force-dynamic';

// GET - Fetch customer transactions (invoices and payments)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // Use the proper authentication middleware
    const authResult = requireUserAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const customerId = params.id;
    
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const InvoiceModel = Invoice as Model<IInvoice>;
    const PaymentModel = Payment as Model<IPayment>;

    // Fetch all invoices for this customer
    const invoices = await InvoiceModel.find({ 
      customer_id: customerId,
      status: { $ne: 'Cancelled' }
    })
      .sort({ invoice_date: -1 })
      .select('invoice_number invoice_date grand_total paid_amount balance_due payment_status status items taxable_amount total_tax')
      .lean();

    // Fetch all payments for this customer
    const rawPayments = await PaymentModel.find({ customer_id: customerId })
      .populate('invoice_id', 'invoice_number')
      .sort({ payment_date: -1 })
      .lean();

    // Map payment fields to match frontend interface (amount_paid -> amount)
    const payments = rawPayments.map(payment => ({
      ...payment,
      amount: payment.amount_paid, // Map amount_paid to amount for frontend compatibility
      reference_number: payment.transaction_id || payment.bank_reference || payment.cheque_number, // Combine reference fields
    }));

    // Calculate summary statistics from invoices
    const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
    const totalPaidAmount = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    const totalDueAmount = invoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
    
    // Calculate actual payment total from payment records (for verification)
    const totalPaymentAmount = rawPayments
      .filter(p => p.status === 'Confirmed' || p.status === 'Pending')
      .reduce((sum, payment) => sum + (payment.amount_paid || 0), 0);
    
    const paidInvoices = invoices.filter(inv => inv.payment_status === 'Paid').length;
    const pendingInvoices = invoices.filter(inv => inv.payment_status === 'Pending').length;
    const partialInvoices = invoices.filter(inv => inv.payment_status === 'Partial').length;

    // Get overdue invoices (invoices with outstanding balance)
    const overdueInvoices = invoices.filter(inv => {
      // Check if invoice is not fully paid and has outstanding balance
      return inv.payment_status !== 'Paid' && inv.balance_due > 0;
    }).length;

    // Log for debugging if there's a mismatch
    if (Math.abs(totalPaidAmount - totalPaymentAmount) > 0.01) {
      console.warn('Payment amount mismatch detected:', {
        customerId,
        totalPaidFromInvoices: totalPaidAmount,
        totalPaidFromPayments: totalPaymentAmount,
        difference: totalPaidAmount - totalPaymentAmount
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        total_invoices: invoices.length,
        total_invoice_amount: totalInvoiceAmount,
        total_paid_amount: totalPaidAmount, // From invoices (should match payment records)
        total_payment_records: totalPaymentAmount, // From actual payment records
        total_due_amount: totalDueAmount,
        paid_invoices: paidInvoices,
        pending_invoices: pendingInvoices,
        partial_invoices: partialInvoices,
        overdue_invoices: overdueInvoices,
        payment_count: payments.length, // Number of payment records
      },
      transactions: {
        invoices,
        payments,
      },
    });
  } catch (error) {
    console.error('Error fetching customer transactions:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch customer transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
