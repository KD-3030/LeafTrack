import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice, { IInvoice } from '@/models/Invoice';
import Sale from '@/models/Sale';
import Product from '@/models/Product';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { Model } from 'mongoose';

// GET - Generate business reports and analytics
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'overview';
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const period = searchParams.get('period') || 'month'; // day, week, month, year

    // Default date range (last 30 days if not specified)
    const endDate = toDate ? new Date(toDate) : new Date();
    const startDate = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const dateFilter = {
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      }
    };

    const InvoiceModel = Invoice as Model<IInvoice>;

    if (reportType === 'overview') {
      // Dashboard overview
      const totalSales = await InvoiceModel.aggregate([
        { 
          $match: { 
            ...dateFilter,
            status: { $ne: 'Cancelled' }
          }
        },
        {
          $group: {
            _id: null,
            total_revenue: { $sum: '$grand_total' },
            total_invoices: { $sum: 1 },
            paid_amount: { 
              $sum: { 
                $cond: [
                  { $eq: ['$payment_status', 'Paid'] },
                  '$grand_total',
                  '$paid_amount'
                ]
              }
            },
            pending_amount: {
              $sum: {
                $cond: [
                  { $ne: ['$payment_status', 'Paid'] },
                  '$balance_due',
                  0
                ]
              }
            }
          }
        }
      ]);

      const salesStats = totalSales[0] || {
        total_revenue: 0,
        total_invoices: 0,
        paid_amount: 0,
        pending_amount: 0,
      };

      // Top selling products
      const topProducts = await InvoiceModel.aggregate([
        { 
          $match: { 
            ...dateFilter,
            status: { $ne: 'Cancelled' }
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product_name',
            quantity_sold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.total_amount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 }
      ]);

      // Top performing salesmen
      const topSalesmen = await InvoiceModel.aggregate([
        { 
          $match: { 
            ...dateFilter,
            status: { $ne: 'Cancelled' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'salesman_id',
            foreignField: '_id',
            as: 'salesman'
          }
        },
        { $unwind: '$salesman' },
        {
          $group: {
            _id: '$salesman_id',
            salesman_name: { $first: '$salesman.name' },
            total_sales: { $sum: '$grand_total' },
            total_invoices: { $sum: 1 }
          }
        },
        { $sort: { total_sales: -1 } },
        { $limit: 5 }
      ]);

      // Monthly trend (last 12 months)
      const monthlyTrend = await InvoiceModel.aggregate([
        {
          $match: {
            invoice_date: {
              $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
            },
            status: { $ne: 'Cancelled' }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$invoice_date' },
              month: { $month: '$invoice_date' }
            },
            revenue: { $sum: '$grand_total' },
            invoices: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ]);

      return NextResponse.json({
        success: true,
        report_type: 'Overview',
        period: { from: startDate, to: endDate },
        stats: salesStats,
        top_products: topProducts,
        top_salesmen: topSalesmen,
        monthly_trend: monthlyTrend,
      });
    }

    if (reportType === 'profit_loss') {
      // Profit & Loss Report
      const salesData = await InvoiceModel.aggregate([
        { 
          $match: { 
            ...dateFilter,
            status: { $ne: 'Cancelled' }
          }
        },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $group: {
            _id: null,
            total_revenue: { $sum: '$items.total_amount' },
            total_cost: { 
              $sum: { 
                $multiply: ['$items.quantity', '$product.cost_price'] 
              }
            },
            total_tax: { 
              $sum: { 
                $add: [
                  '$items.cgst_amount',
                  '$items.sgst_amount',
                  '$items.igst_amount'
                ]
              }
            }
          }
        }
      ]);

      const profitLoss = salesData[0] || {
        total_revenue: 0,
        total_cost: 0,
        total_tax: 0,
      };

      profitLoss.gross_profit = profitLoss.total_revenue - profitLoss.total_cost;
      profitLoss.net_profit = profitLoss.gross_profit - profitLoss.total_tax;
      profitLoss.profit_margin = profitLoss.total_revenue ? 
        ((profitLoss.gross_profit / profitLoss.total_revenue) * 100) : 0;

      return NextResponse.json({
        success: true,
        report_type: 'Profit & Loss',
        period: { from: startDate, to: endDate },
        profit_loss: profitLoss,
      });
    }

    if (reportType === 'sales_performance') {
      // Sales Performance Analytics
      const salesPerformance = await InvoiceModel.aggregate([
        { 
          $match: { 
            ...dateFilter,
            status: { $ne: 'Cancelled' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'salesman_id',
            foreignField: '_id',
            as: 'salesman'
          }
        },
        { $unwind: '$salesman' },
        {
          $group: {
            _id: '$salesman_id',
            salesman_name: { $first: '$salesman.name' },
            salesman_email: { $first: '$salesman.email' },
            total_sales: { $sum: '$grand_total' },
            total_invoices: { $sum: 1 },
            avg_invoice_value: { $avg: '$grand_total' },
            total_customers: { $addToSet: '$customer_id' }
          }
        },
        {
          $addFields: {
            total_customers: { $size: '$total_customers' }
          }
        },
        { $sort: { total_sales: -1 } }
      ]);

      // Product wise sales
      const productWiseSales = await InvoiceModel.aggregate([
        { 
          $match: { 
            ...dateFilter,
            status: { $ne: 'Cancelled' }
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product_name',
            quantity_sold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.total_amount' },
            avg_price: { $avg: '$items.unit_price' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { revenue: -1 } }
      ]);

      return NextResponse.json({
        success: true,
        report_type: 'Sales Performance',
        period: { from: startDate, to: endDate },
        salesman_performance: salesPerformance,
        product_performance: productWiseSales,
      });
    }

    if (reportType === 'customer_ledger') {
      // Customer ledger
      const customerId = searchParams.get('customer_id');
      
      if (!customerId) {
        return NextResponse.json({ 
          error: 'Customer ID is required for ledger report' 
        }, { status: 400 });
      }

      const customerInvoices = await InvoiceModel.find({
        customer_id: customerId,
        status: { $ne: 'Cancelled' }
      })
      .sort({ invoice_date: 1 })
      .populate('customer_id', 'name email phone');

      const ledgerSummary = {
        total_invoices: customerInvoices.length,
        total_amount: customerInvoices.reduce((sum, inv) => sum + inv.grand_total, 0),
        total_paid: customerInvoices.reduce((sum, inv) => sum + inv.paid_amount, 0),
        total_outstanding: customerInvoices.reduce((sum, inv) => sum + inv.balance_due, 0),
      };

      return NextResponse.json({
        success: true,
        report_type: 'Customer Ledger',
        customer: customerInvoices[0]?.customer_id || null,
        summary: ledgerSummary,
        transactions: customerInvoices,
      });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    console.error('Error generating business report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
