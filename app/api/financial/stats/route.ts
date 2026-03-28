import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    // Fetch all invoices and payments in parallel
    const [invoicesRes, paymentsRes] = await Promise.all([
      supabaseAdmin.from('invoices').select('id, grand_total, balance_due, payment_status, due_date, created_at'),
      supabaseAdmin.from('payments').select('id, amount, status, payment_date, created_at'),
    ]);

    const invoices = invoicesRes.data || [];
    const payments = (paymentsRes.data || []).filter(p => p.status === 'confirmed');

    // Invoice stats
    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0);
    const totalOutstanding = invoices
      .filter(inv => inv.payment_status !== 'paid')
      .reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);
    const totalOverdue = invoices
      .filter(inv => inv.payment_status !== 'paid' && inv.due_date && new Date(inv.due_date) < now)
      .reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);
    const overdueCount = invoices
      .filter(inv => inv.payment_status !== 'paid' && inv.due_date && new Date(inv.due_date) < now).length;

    // Payment stats
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const paymentsToday = payments
      .filter(p => p.payment_date && p.payment_date >= todayStart && p.payment_date <= todayEnd)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const paymentsThisMonth = payments
      .filter(p => p.payment_date && p.payment_date >= monthStart)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const paymentsTodayCount = payments
      .filter(p => p.payment_date && p.payment_date >= todayStart && p.payment_date <= todayEnd).length;

    // Collection rate
    const collectionRate = totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0;

    // Average payment time (days between invoice creation and payment)
    let avgPaymentDays = 0;
    const paidInvoices = invoices.filter(inv => inv.payment_status === 'paid');
    if (paidInvoices.length > 0) {
      const totalDays = paidInvoices.reduce((sum, inv) => {
        const relatedPayments = payments.filter(p => p.created_at >= inv.created_at);
        if (relatedPayments.length > 0) {
          const lastPayment = relatedPayments.sort((a, b) => new Date(b.payment_date || b.created_at).getTime() - new Date(a.payment_date || a.created_at).getTime())[0];
          const days = Math.ceil((new Date(lastPayment.payment_date || lastPayment.created_at).getTime() - new Date(inv.created_at).getTime()) / (1000 * 60 * 60 * 24));
          return sum + Math.max(0, days);
        }
        return sum;
      }, 0);
      avgPaymentDays = Math.round(totalDays / paidInvoices.length);
    }

    // Invoice status breakdown
    const statusBreakdown = {
      paid: invoices.filter(i => i.payment_status === 'paid').length,
      partial: invoices.filter(i => i.payment_status === 'partial').length,
      unpaid: invoices.filter(i => i.payment_status === 'unpaid').length,
      overdue: overdueCount,
    };

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue,
        totalPaid,
        totalOutstanding,
        totalOverdue,
        overdueCount,
        paymentsToday,
        paymentsTodayCount,
        paymentsThisMonth,
        collectionRate,
        avgPaymentDays,
        totalInvoices: invoices.length,
        totalPayments: payments.length,
        statusBreakdown,
      },
    });
  } catch (error) {
    console.error('Error fetching financial stats:', error);
    return NextResponse.json({ error: 'Failed to fetch financial stats' }, { status: 500 });
  }
}