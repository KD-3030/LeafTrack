import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/authMiddleware';
import { normalizeRoleId } from '@/lib/roles';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value?: string | Date): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN');
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toWordsIndian(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const twoDigits = (n: number): string => {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ''}`.trim();
  };

  const threeDigits = (n: number): string => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    const parts: string[] = [];
    if (hundred) parts.push(`${ones[hundred]} Hundred`);
    if (rest) parts.push(twoDigits(rest));
    return parts.join(' ');
  };

  const integer = Math.floor(Math.max(0, num));
  if (integer === 0) return 'Zero';

  const crore = Math.floor(integer / 10000000);
  const lakh = Math.floor((integer % 10000000) / 100000);
  const thousand = Math.floor((integer % 100000) / 1000);
  const hundred = integer % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  return parts.join(' ').trim();
}

function toAbsoluteAssetUrl(url: string | undefined, origin: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (url.startsWith('/')) return `${origin}${url}`;
  return `${origin}/${url}`;
}

function getBrowserExecutablePath(): string | undefined {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (fs.existsSync(candidate)) return candidate;
  }

  return undefined;
}

type LaunchConfig = {
  executablePath?: string;
  args?: string[];
  headless?: boolean | 'shell';
};

async function resolveLaunchConfig(): Promise<LaunchConfig> {
  // @sparticuz/chromium is only compatible with Vercel/Lambda serverless environments.
  // On bare-metal (Ubuntu + PM2), PUPPETEER_EXECUTABLE_PATH points to system chromium.
  if (process.env.VERCEL) {
    try {
      const chromium = await import('@sparticuz/chromium');
      const chromiumBinCandidates = [
        path.join(process.cwd(), '.next', 'server', 'bin'),
        '/var/task/.next/server/bin',
        path.join(process.cwd(), 'node_modules', '@sparticuz', 'chromium', 'bin'),
        '/var/task/node_modules/@sparticuz/chromium/bin',
      ];

      let executablePath: string | null = null;
      for (const binPath of chromiumBinCandidates) {
        if (!fs.existsSync(binPath)) continue;
        executablePath = await chromium.default.executablePath(binPath);
        break;
      }

      if (!executablePath) {
        executablePath = await chromium.default.executablePath();
      }

      return {
        executablePath,
        args: chromium.default.args,
        headless: true,
      };
    } catch (error) {
      console.warn('Falling back to local browser detection for PDF generation:', error);
    }
  }

  const executablePath = getBrowserExecutablePath();
  if (!executablePath) {
    throw new Error('No browser executable found. Configure @sparticuz/chromium for Vercel or set PUPPETEER_EXECUTABLE_PATH.');
  }

  return {
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const decoded = authResult;
    const { id } = await params;

    const { data: invoice, error: invErr } = await supabaseAdmin
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('id', id)
      .single();

    if (invErr || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Normalize customer details from flat columns
    const customerDetails = {
      name: invoice.customer_name || '-',
      email: invoice.customer_email || '',
      phone: invoice.customer_phone || '-',
      address: invoice.customer_address || '-',
      state: invoice.customer_state || '-',
      gstin: invoice.customer_gstin || '-',
    };

    const roleId = normalizeRoleId(decoded.role);
    if (roleId === 'secondary_executive') {
      if (invoice.salesman_id !== decoded.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else if (roleId === 'primary_executive') {
      const { data: secondaries } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('manager_id', decoded.userId)
        .eq('role', 'secondary_executive')
        .eq('approval_status', 'approved');

      const teamIds = new Set([decoded.userId, ...(secondaries || []).map(s => s.id)]);
      if (!teamIds.has(invoice.salesman_id)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const [customerRes, settingsRes, prevInvoicesRes] = await Promise.all([
      supabaseAdmin.from('distributors').select('outstanding_balance').eq('id', invoice.distributor_id).single(),
      supabaseAdmin.from('company_settings').select('*').limit(1).single(),
      // Fetch all earlier invoices for this distributor to compute previous balance
      supabaseAdmin.from('invoices')
        .select('grand_total, paid_amount, balance_due')
        .eq('distributor_id', invoice.distributor_id)
        .lt('created_at', invoice.created_at)
    ]);

    const customer = customerRes.data;
    const settings = settingsRes.data as Record<string, unknown> | null;

    const origin = request.nextUrl.origin;
    const companyName = (settings?.company_name as string | undefined) || invoice.company_name || 'Company Name';
    const companyAddress = [
      settings?.address as string | undefined,
      settings?.city as string | undefined,
      settings?.state as string | undefined,
      settings?.pincode as string | undefined,
    ].filter(Boolean).join(', ') || invoice.company_address || '-';
    const companyPhone = (settings?.phone as string | undefined) || invoice.company_phone || '-';
    const companyEmail = (settings?.email as string | undefined) || invoice.company_email || '-';
    const companyGstin = (settings?.gstin as string | undefined) || invoice.company_gstin || '-';

    const logoUrl = toAbsoluteAssetUrl(settings?.logo_url as string | undefined, origin);
    const signatureUrl = toAbsoluteAssetUrl(settings?.signature_url as string | undefined, origin);

    const customQrUrl = toAbsoluteAssetUrl(settings?.qr_code_url as string | undefined, origin);
    const upiId = settings?.upi_id as string | undefined;
    let qrDataUrl = customQrUrl || '';
    if (!qrDataUrl && upiId) {
      const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(companyName)}&cu=INR`;
      qrDataUrl = await QRCode.toDataURL(upiUri, { width: 120, margin: 1 });
    }

    type InvoiceItemRaw = { quantity?: number | string | null; unit_price?: number | string | null; taxable_amount?: number | string | null; cgst_amount?: number | string | null; sgst_amount?: number | string | null; igst_amount?: number | string | null; gst_rate?: number | string | null; discount_percentage?: number | string | null; discount_amount?: number | string | null; product_name?: string | null; hsn_code?: string | null; total_amount?: number | string | null; };
    type ProcessedItem = { productName: string; hsnCode: string; qty: number; price: number; discount: number; gstRate: number; cgstAmount: number; sgstAmount: number; gstAmount: number; amount: number; taxableAmount: number; };
    const rawItems = (invoice.invoice_items || []) as InvoiceItemRaw[];

    // Invoice-level discount info for proportional distribution
    const invoiceTotalDiscount = Number(invoice.total_discount || 0);
    const invoiceDiscountPct = Number(invoice.discount_value || 0);
    const invoiceDiscountMode = invoice.discount_mode as string | undefined;
    const grossSubtotal = rawItems.reduce((s, it) => s + (Number(it.quantity || 0) * Number(it.unit_price || 0)), 0);

    const items = rawItems.map((item): ProcessedItem => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unit_price || 0);
      const grossAmount = quantity * unitPrice;

      // 1. If stored taxable_amount is already discounted, derive from it
      const storedTaxable = Number(item.taxable_amount || 0);
      let discountAmount: number;
      if (storedTaxable > 0 && storedTaxable < grossAmount) {
        discountAmount = Math.round((grossAmount - storedTaxable) * 100) / 100;
      }
      // 2. Distribute invoice-level discount proportionally across items
      else if (invoiceTotalDiscount > 0 && grossSubtotal > 0) {
        discountAmount = Math.round((grossAmount / grossSubtotal) * invoiceTotalDiscount * 100) / 100;
      }
      // 3. Use per-item percentage if available
      else if (invoiceDiscountMode === 'percentage' && invoiceDiscountPct > 0) {
        discountAmount = Math.round((grossAmount * invoiceDiscountPct / 100) * 100) / 100;
      }
      // 4. Fallback: item-level fields
      else {
        discountAmount = Number(item.discount_amount || 0) || Math.round((grossAmount * Number(item.discount_percentage || 0)) / 100 * 100) / 100;
      }

      const taxableAmount = grossAmount - discountAmount;
      const gstRate = Number(item.gst_rate || 0);
      const computedTax = (taxableAmount * gstRate) / 100;
      const cgstAmount = Math.round((computedTax / 2) * 100) / 100;
      const sgstAmount = Math.round((computedTax - cgstAmount) * 100) / 100;
      const gstAmount = cgstAmount + sgstAmount;
      return {
        productName: item.product_name || '-',
        hsnCode: item.hsn_code || '-',
        qty: quantity,
        price: unitPrice,
        discount: discountAmount,
        gstRate,
        cgstAmount,
        sgstAmount,
        gstAmount,
        amount: Math.round((taxableAmount + gstAmount) * 100) / 100,
        taxableAmount,
      };
    });

    const groupedByHsn = new Map<string, { taxable: number; tax: number; rate: number }>();
    items.forEach((item) => {
      const key = item.hsnCode || '-';
      const current = groupedByHsn.get(key) || { taxable: 0, tax: 0, rate: item.gstRate };
      current.taxable += item.taxableAmount;
      current.tax += item.gstAmount;
      current.rate = item.gstRate || current.rate;
      groupedByHsn.set(key, current);
    });

    const taxSummaryRows = Array.from(groupedByHsn.entries()).map(([hsn, row]) => {
      const halfRate = row.rate / 2;
      const halfTax = row.tax / 2;
      return {
        hsn,
        taxable: row.taxable,
        cgstRate: halfRate,
        cgstAmt: halfTax,
        sgstRate: halfRate,
        sgstAmt: halfTax,
        totalTax: row.tax,
      };
    });

    const totalTaxable = taxSummaryRows.reduce((sum, row) => sum + row.taxable, 0);
    const totalTax = taxSummaryRows.reduce((sum, row) => sum + row.totalTax, 0);
    const avgRate = totalTaxable > 0 ? (totalTax * 100) / totalTaxable : 0;

    const itemLevelDiscount = items.reduce((s, it) => s + it.discount, 0);
    const totalDiscount = itemLevelDiscount > 0 ? itemLevelDiscount : Number(invoice.total_discount || 0);
    const showDiscount = totalDiscount > 0;
    const grandTotal = Number(invoice.grand_total || 0);
    const rounded = Math.round(grandTotal);
    const roundOff = Number((rounded - grandTotal).toFixed(2));

    const paidAmount = Number(invoice.paid_amount || 0);
    const balanceDue = Math.max(0, rounded - paidAmount);

    // Previous balance = sum of unpaid balances from all invoices created before this one
    const previousInvoices = prevInvoicesRes.data || [];
    const previousBalance = previousInvoices.reduce((sum, inv) => {
      const invTotal = Math.round(Number(inv.grand_total || 0));
      const invPaid = Number(inv.paid_amount || 0);
      return sum + Math.max(0, invTotal - invPaid);
    }, 0);
    const currentBalance = previousBalance + balanceDue;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #111; line-height: 1.35; }
    .invoice-document { width: 100%; padding: 12px; border: 1px solid #555; }
    h1 { font-size: 20px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.4px; }
    h2 { font-size: 18px; font-weight: 900; margin-bottom: 3px; letter-spacing: 0.5px; }
    h3 { font-size: 13px; font-weight: 700; border-bottom: 1px solid #555; padding-bottom: 3px; margin-bottom: 6px; }
    .text-bold { font-weight: 700; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .uppercase { text-transform: uppercase; }
    .header-grid { display: grid; grid-template-columns: 2fr 1fr; border: 1px solid #555; padding: 8px; margin-bottom: 8px; }
    .company-row { display: grid; grid-template-columns: 76px 1fr; gap: 8px; }
    .logo-box { width: 72px; height: 72px; border: 1px solid #777; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .logo-box img { max-width: 70px; max-height: 70px; }
    .header-meta { text-align: right; }
    .header-meta p { font-size: 11px; color: #444; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #555; border-top: none; }
    .info-col { padding: 6px; }
    .info-col.left { border-right: 1px solid #555; }
    .detail-grid { display: grid; grid-template-columns: 95px 1fr; row-gap: 3px; font-size: 12px; }
    .detail-grid span:first-child { font-weight: 700; }
    .eway-note { font-size: 9px; color: #666; margin-top: 4px; font-style: italic; }
    .ship-box { border: 1px solid #555; border-top: none; padding: 6px; margin-bottom: 8px; }
    .data-table, .tax-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .data-table th, .data-table td, .tax-table th, .tax-table td { border: 1px solid #555; padding: 5px; vertical-align: top; }
    .data-table th, .tax-table th { background: #f4f4f4; font-weight: 700; }
    .summary-grid { display: grid; grid-template-columns: 2.1fr 1.2fr; border: 1px solid #555; border-top: none; margin-bottom: 8px; }
    .summary-left { border-right: 1px solid #555; padding: 6px; }
    .summary-right { padding: 6px; }
    .totals-calc-grid { display: grid; grid-template-columns: 1fr 110px; row-gap: 5px; font-size: 12px; }
    .totals-calc-grid .calc-label { text-align: left; }
    .totals-calc-grid .calc-value { text-align: right; }
    .totals-calc-grid .grand-total { font-weight: 700; font-size: 14px; border-top: 1px solid #555; padding-top: 4px; }
    .terms-box { border: 1px solid #555; border-top: none; padding: 6px; margin-bottom: 0; }
    .footer-grid { display: grid; grid-template-columns: 1.8fr 1fr; border: 1px solid #555; border-top: none; }
    .bank-box { padding: 6px; border-right: 1px solid #555; }
    .signature-area { padding: 6px; display: flex; flex-direction: column; justify-content: space-between; min-height: 120px; }
    .signature-line { border-top: 1px solid #555; width: 170px; padding-top: 4px; margin-top: 30px; }
    .bank-grid { display: grid; grid-template-columns: 1fr 60px; gap: 8px; }
    .qr-box { border: 1px solid #777; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .qr-box img { width: 54px; height: 54px; }
  </style>
</head>
<body>
  <div class="invoice-document">
    <div class="header-grid">
      <div class="company-row">
        <div class="logo-box">${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="logo" />` : ''}</div>
        <div>
          <h2>${escapeHtml(companyName)}</h2>
          <p>${escapeHtml(companyAddress)}</p>
          <p>Phone: ${escapeHtml(companyPhone)}${companyEmail ? ` | Email: ${escapeHtml(companyEmail)}` : ''}</p>
          <p>GSTIN: ${escapeHtml(companyGstin)}</p>
        </div>
      </div>
      <div class="header-meta">
        <h1>Tax Invoice</h1>
        <p class="uppercase">Original for Recipient</p>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-col left">
        <h3>Bill To:</h3>
        <p class="text-bold">${escapeHtml(customerDetails.name)}</p>
        <p>${escapeHtml(customerDetails.address)}</p>
        <div class="detail-grid" style="margin-top: 6px;">
          <span>Contact No:</span><span>${escapeHtml(customerDetails.phone)}</span>
          <span>GSTIN:</span><span>${escapeHtml((!customerDetails.gstin || customerDetails.gstin === '-' || customerDetails.gstin.trim() === '') ? 'URP' : customerDetails.gstin)}</span>
          <span>State:</span><span>${escapeHtml((!customerDetails.state || customerDetails.state === '-' || customerDetails.state.trim() === '') ? 'WEST BENGAL' : customerDetails.state)}</span>
        </div>
      </div>
      <div class="info-col">
        <h3>Invoice Details:</h3>
        <div class="detail-grid">
          <span>Invoice No:</span><span>${escapeHtml(invoice.invoice_number || '-')}</span>
          <span>Date:</span><span>${escapeHtml(formatDate(invoice.invoice_date))}</span>
          <span>Place Of Supply:</span><span>19 - West Bengal</span>
        </div>
        <p class="eway-note">Ewaybill # &mdash; only applicable for invoice amount &#8377;1,00,000 or above</p>
      </div>
    </div>

    <div class="ship-box">
      <h3>Ship To:</h3>
      <p>${escapeHtml(customerDetails.address)}</p>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width:4%">#</th>
          <th style="width:22%; text-align:left;">Item name</th>
          <th style="width:9%">HSN/ SAC</th>
          <th style="width:7%">Qty in Pcs.</th>
          <th style="width:10%; text-align:right;">Price / Unit(₹)</th>
          <th style="width:8%; text-align:right;">Discount(₹)</th>
          <th style="width:11%; text-align:right;">Taxable Amt.(₹)</th>
          <th style="width:10%; text-align:right;">CGST(₹)</th>
          <th style="width:10%; text-align:right;">SGST(₹)</th>
          <th style="width:11%; text-align:right;">Amount(₹)</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, i) => `
          <tr>
            <td class="text-center">${i + 1}</td>
            <td>${escapeHtml(item.productName)}</td>
            <td class="text-center">${escapeHtml(item.hsnCode)}</td>
            <td class="text-center">${item.qty}</td>
            <td class="text-right">${formatCurrency(item.price)}</td>
            <td class="text-right">${formatCurrency(item.discount)}</td>
            <td class="text-right">${formatCurrency(item.taxableAmount)}</td>
            <td class="text-right">${formatCurrency(item.cgstAmount)}<br/><span style="font-size:9px;color:#555">(${(item.gstRate / 2).toFixed(1)}%)</span></td>
            <td class="text-right">${formatCurrency(item.sgstAmount)}<br/><span style="font-size:9px;color:#555">(${(item.gstRate / 2).toFixed(1)}%)</span></td>
            <td class="text-right">${formatCurrency(item.amount)}</td>
          </tr>
        `).join('')}
        <tr>
          <td></td>
          <td class="text-bold">Total</td>
          <td></td>
          <td class="text-center text-bold">${items.reduce((sum, item) => sum + item.qty, 0)}</td>
          <td></td>
          <td class="text-right text-bold">${formatCurrency(items.reduce((sum, item) => sum + item.discount, 0))}</td>
          <td class="text-right text-bold">${formatCurrency(items.reduce((sum, item) => sum + item.taxableAmount, 0))}</td>
          <td class="text-right text-bold">${formatCurrency(items.reduce((sum, item) => sum + item.cgstAmount, 0))}</td>
          <td class="text-right text-bold">${formatCurrency(items.reduce((sum, item) => sum + item.sgstAmount, 0))}</td>
          <td class="text-right text-bold">${formatCurrency(items.reduce((sum, item) => sum + item.amount, 0))}</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-grid">
      <div class="summary-left">
        <p class="text-bold" style="margin-bottom:4px;">Tax Summary:</p>
        <table class="tax-table" style="margin-bottom:8px;">
          <thead>
            <tr>
              <th>HSN/ SAC</th>
              <th>Taxable amount</th>
              <th>CGST Rate (%)</th>
              <th>CGST Amt (₹)</th>
              <th>SGST Rate (%)</th>
              <th>SGST Amt (₹)</th>
              <th>Total Tax (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${taxSummaryRows.map((row) => `
              <tr>
                <td class="text-center">${escapeHtml(row.hsn)}</td>
                <td class="text-right">${formatCurrency(row.taxable)}</td>
                <td class="text-center">${row.cgstRate.toFixed(1)}</td>
                <td class="text-right">${formatCurrency(row.cgstAmt)}</td>
                <td class="text-center">${row.sgstRate.toFixed(1)}</td>
                <td class="text-right">${formatCurrency(row.sgstAmt)}</td>
                <td class="text-right">${formatCurrency(row.totalTax)}</td>
              </tr>
            `).join('')}
            <tr>
              <td class="text-center text-bold">TOTAL</td>
              <td class="text-right text-bold">${formatCurrency(totalTaxable)}</td>
              <td class="text-center text-bold">${(avgRate / 2).toFixed(1)}</td>
              <td class="text-right text-bold">${formatCurrency(totalTax / 2)}</td>
              <td class="text-center text-bold">${(avgRate / 2).toFixed(1)}</td>
              <td class="text-right text-bold">${formatCurrency(totalTax / 2)}</td>
              <td class="text-right text-bold">${formatCurrency(totalTax)}</td>
            </tr>
          </tbody>
        </table>
        <p class="text-bold" style="margin-bottom:4px;">Invoice Amount in Words:</p>
        <p style="font-style: italic;">${escapeHtml(toWordsIndian(rounded))} Rupees only</p>
      </div>

      <div class="summary-right">
        <div class="totals-calc-grid">
          <div class="calc-label">Taxable Amount:</div><div class="calc-value">₹ ${formatCurrency(items.reduce((s, it) => s + it.taxableAmount, 0))}</div>
          <div class="calc-label">CGST:</div><div class="calc-value">₹ ${formatCurrency(items.reduce((s, it) => s + it.cgstAmount, 0))}</div>
          <div class="calc-label">SGST:</div><div class="calc-value">₹ ${formatCurrency(items.reduce((s, it) => s + it.sgstAmount, 0))}</div>
          ${showDiscount ? `<div class="calc-label">Discount${invoiceDiscountMode === 'percentage' && invoiceDiscountPct > 0 ? ` (${invoiceDiscountPct}%)` : ''}:</div><div class="calc-value">- ₹ ${formatCurrency(totalDiscount)}</div>` : ''}
          <div class="calc-label">Round Off:</div><div class="calc-value">${roundOff >= 0 ? '' : '- '}₹ ${formatCurrency(Math.abs(roundOff))}</div>
          <div class="calc-label grand-total">Total Invoice Amount:</div><div class="calc-value grand-total">₹ ${formatCurrency(rounded)}</div>
          <div class="calc-label">Received:</div><div class="calc-value">₹ ${formatCurrency(paidAmount)}</div>
          <div class="calc-label">Balance:</div><div class="calc-value">₹ ${formatCurrency(balanceDue)}</div>
          <div class="calc-label">Previous Bal:</div><div class="calc-value">₹ ${formatCurrency(previousBalance)}</div>
          <div class="calc-label text-bold">Current Bal:</div><div class="calc-value text-bold">₹ ${formatCurrency(currentBalance)}</div>
        </div>
      </div>
    </div>

    <div class="terms-box">
      <p class="text-bold">Terms & Conditions:</p>
      <p>${escapeHtml(invoice.terms_and_conditions || (settings?.invoice_terms as string | undefined) || 'Thanks for doing business with us!')}</p>
    </div>

    <div class="footer-grid">
      <div class="bank-box">
        <h3>Bank Details:</h3>
        <div class="bank-grid">
          <div>
            <p><span class="text-bold">Name:</span> ${escapeHtml((settings?.bank_name as string | undefined) || '-')}</p>
            <p><span class="text-bold">Account No:</span> ${escapeHtml((settings?.account_number as string | undefined) || '-')}</p>
            <p><span class="text-bold">IFSC code:</span> ${escapeHtml((settings?.ifsc_code as string | undefined) || '-')}</p>
            <p><span class="text-bold">Account holder's name:</span> ${escapeHtml((settings?.account_holder_name as string | undefined) || companyName)}</p>
          </div>
          <div>
            ${qrDataUrl ? `<div class="qr-box"><img src="${qrDataUrl}" alt="QR" /></div>` : ''}
          </div>
        </div>
      </div>
      <div class="signature-area">
        <div>
          <p class="text-bold">For ${escapeHtml(companyName)}:</p>
        </div>
        <div class="signature-line">
          ${signatureUrl ? `<img src="${escapeHtml(signatureUrl)}" alt="signature" style="height:30px; max-width:140px; object-fit:contain;" />` : ''}
          <p>Authorized Signatory</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    const launchConfig = await resolveLaunchConfig();
    const puppeteer = await import('puppeteer-core');
    const browser = await puppeteer.default.launch({
      headless: launchConfig.headless,
      executablePath: launchConfig.executablePath,
      args: launchConfig.args,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '8mm',
          right: '8mm',
          bottom: '8mm',
          left: '8mm',
        },
      });

      return new NextResponse(Buffer.from(pdf), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
          'Cache-Control': 'no-store',
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('Error generating invoice PDF via puppeteer:', error);
    return NextResponse.json({ error: 'Failed to generate invoice PDF' }, { status: 500 });
  }
}
