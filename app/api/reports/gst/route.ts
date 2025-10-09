import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice, { IInvoice } from '@/models/Invoice';
import Customer from '@/models/Customer'; // Import for populate
import User from '@/models/User'; // Import for populate  
import { verifyToken } from '@/lib/auth';
import { Model } from 'mongoose';

export const dynamic = 'force-dynamic';

// GET - Generate GST reports (GSTR-1 data)
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Ensure models are registered for populate
    if (!Customer || !User) {
      throw new Error('Required models not loaded');
    }
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const reportType = searchParams.get('type') || 'gstr1'; // gstr1, summary, detailed

    if (!fromDate || !toDate) {
      return NextResponse.json({ 
        error: 'From date and to date are required' 
      }, { status: 400 });
    }

    // Build date filter
    const dateFilter = {
      invoice_date: {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      },
      status: { $ne: 'Cancelled' }, // Exclude cancelled invoices
    };

    const InvoiceModel = Invoice as Model<IInvoice>;

    if (reportType === 'gstr1') {
      // GSTR-1 format data
      const invoices = await InvoiceModel.find(dateFilter)
        .populate('customer_id', 'name gstin state')
        .sort({ invoice_date: 1 })
        .lean();

      const gstr1Data = invoices.map(invoice => ({
        invoice_number: invoice.invoice_number || '',
        invoice_date: invoice.invoice_date,
        customer_name: invoice.customer_details?.name || '',
        customer_gstin: invoice.customer_details?.gstin || 'Unregistered',
        customer_state: invoice.customer_details?.state || '',
        place_of_supply: invoice.customer_details?.state || '',
        reverse_charge: 'N',
        invoice_type: invoice.customer_details?.gstin ? 'B2B' : 'B2C',
        ecommerce_gstin: '',
        items: (invoice.items || []).map(item => ({
          item_description: item.product_name || '',
          hsn_code: item.hsn_code || '',
          quantity: item.quantity || 0,
          unit_price: item.unit_price || 0,
          discount: item.discount_percentage || 0,
          taxable_amount: item.taxable_amount || 0,
          gst_rate: item.gst_rate || 0,
          cgst_amount: item.cgst_amount || 0,
          sgst_amount: item.sgst_amount || 0,
          igst_amount: item.igst_amount || 0,
          cess_amount: 0,
          total_amount: item.total_amount || 0,
        })),
        total_taxable_amount: invoice.taxable_amount || 0,
        total_cgst: invoice.total_cgst || 0,
        total_sgst: invoice.total_sgst || 0,
        total_igst: invoice.total_igst || 0,
        total_cess: 0,
        invoice_value: invoice.grand_total || 0,
      }));

      console.log(`GST GSTR-1 Report: Found ${gstr1Data.length} invoices for period ${fromDate} to ${toDate}`);
      
      return NextResponse.json({
        success: true,
        report_type: 'GSTR-1',
        period: { from: fromDate, to: toDate },
        data: gstr1Data,
        summary: {
          total_invoices: gstr1Data.length,
          total_taxable_amount: gstr1Data.reduce((sum, inv) => sum + (inv.total_taxable_amount || 0), 0),
          total_tax_amount: gstr1Data.reduce((sum, inv) => sum + (inv.total_cgst || 0) + (inv.total_sgst || 0) + (inv.total_igst || 0), 0),
          total_invoice_value: gstr1Data.reduce((sum, inv) => sum + (inv.invoice_value || 0), 0),
        },
      });
    }

    if (reportType === 'summary') {
      // Summary report
      const pipeline: any[] = [
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            total_invoices: { $sum: 1 },
            total_taxable_amount: { $sum: '$taxable_amount' },
            total_cgst: { $sum: '$total_cgst' },
            total_sgst: { $sum: '$total_sgst' },
            total_igst: { $sum: '$total_igst' },
            total_tax: { $sum: '$total_tax' },
            total_invoice_value: { $sum: '$grand_total' },
          }
        }
      ];

      const summaryResult = await InvoiceModel.aggregate(pipeline);
      const summary = summaryResult[0] || {
        total_invoices: 0,
        total_taxable_amount: 0,
        total_cgst: 0,
        total_sgst: 0,
        total_igst: 0,
        total_tax: 0,
        total_invoice_value: 0,
      };

      // GST rate wise summary
      const gstRateWisePipeline: any[] = [
        { $match: dateFilter },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.gst_rate',
            count: { $sum: 1 },
            taxable_amount: { $sum: '$items.taxable_amount' },
            cgst_amount: { $sum: '$items.cgst_amount' },
            sgst_amount: { $sum: '$items.sgst_amount' },
            igst_amount: { $sum: '$items.igst_amount' },
            total_amount: { $sum: '$items.total_amount' },
          }
        },
        { $sort: { _id: 1 } }
      ];

      const gstRateWise = await InvoiceModel.aggregate(gstRateWisePipeline);

      console.log(`GST Summary Report: ${summary.total_invoices} invoices, ${gstRateWise.length} GST rates for period ${fromDate} to ${toDate}`);

      return NextResponse.json({
        success: true,
        report_type: 'Summary',
        period: { from: fromDate, to: toDate },
        summary,
        gst_rate_wise: gstRateWise,
      });
    }

    if (reportType === 'detailed') {
      // Detailed report
      const invoices = await InvoiceModel.find(dateFilter)
        .populate('customer_id', 'name email gstin state')
        .populate('salesman_id', 'name email')
        .sort({ invoice_date: 1 })
        .lean();

      return NextResponse.json({
        success: true,
        report_type: 'Detailed',
        period: { from: fromDate, to: toDate },
        invoices,
        summary: {
          total_invoices: invoices.length,
          total_amount: invoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0),
          total_tax: invoices.reduce((sum, inv) => sum + (inv.total_tax || 0), 0),
          paid_invoices: invoices.filter(inv => inv.payment_status === 'Paid').length,
          pending_invoices: invoices.filter(inv => inv.payment_status === 'Pending').length,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    console.error('Error generating GST report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate report';
    return NextResponse.json({ 
      error: 'Failed to generate GST report',
      details: errorMessage,
      success: false
    }, { status: 500 });
  }
}
