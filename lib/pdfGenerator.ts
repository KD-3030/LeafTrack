import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';

interface OrderItem {
  product_id?: string;
  product_name: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  total_price: number;
}

interface Order {
  _id: string;
  order_number: string;
  order_date: string;
  salesman_id: string;
  salesman_name: string;
  customer_name: string;
  customer_contact: string;
  customer_address?: string;
  customer_gstin?: string;
  customer_email?: string;
  items: OrderItem[];
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: 'pending_primary' | 'pending' | 'approved' | 'dispatched' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewer_name?: string;
  delivery_date?: string;
  payment_terms?: string;
  notes?: string;
}

interface Invoice {
  _id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  customer_details: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    state?: string;
    gstin?: string;
  };
  company_details?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    gstin?: string;
  };
  items: Array<{
    product_id?: string;
    product_name: string;
    hsn_code?: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    gst_rate?: number;
    taxable_amount?: number;
    tax_amount?: number;
  }>;
  subtotal: number;
  total_discount?: number;
  discount_mode?: 'amount' | 'percentage';
  discount_value?: number;
  grand_total: number;
  paid_amount: number;
  balance_due: number;
  status: string;
  payment_status: string;
  customer_total_due?: number;
}

interface PurchaseBill {
  _id?: string;
  purchase_number?: string;
  invoice_number?: string;
  purchase_date?: string;
  place_of_supply?: string;
  supplier_name?: string;
  supplier_contact?: string;
  supplier_address?: string;
  supplier_gstin?: string;
  supplier_email?: string;
  product_name?: string;
  hsn_code?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  taxable_amount?: number;
  total_amount?: number;
  tax_amount?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  discount_amount?: number;
  final_amount?: number;
  paid_amount?: number;
  due_amount?: number;
  payment_method?: string;
  notes?: string;
  items?: Array<{
    product_name: string;
    hsn_code?: string;
    quantity: number;
    unit: string;
    rate: number;
    taxable_value: number;
  }>;
}

interface TemplateItem {
  itemName: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  discountAmount: number;
  gstRate: number;
  taxableAmount: number;
  taxAmount: number;
  amount: number;
}

interface TemplateDocument {
  title: string;
  numberLabel: string;
  documentNumber: string;
  documentDate: string;
  placeOfSupply?: string;
  billToName: string;
  billToAddress?: string;
  billToContact?: string;
  billToGstin?: string;
  billToState?: string;
  shipTo?: string;
  items: TemplateItem[];
  subtotal: number;
  roundOff: number;
  totalAmount: number;
  receivedAmount: number;
  balanceAmount: number;
  previousBalance: number;
  currentBalance: number;
  terms?: string;
  notes?: string;
}

type CompanySettings = {
  company_name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  logo_url?: string;
  upi_id?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  account_holder_name?: string;
} | null;

async function generateQRCode(data: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(data, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
}

async function fetchCompanySettings(): Promise<CompanySettings> {
  try {
    const response = await fetch('/api/settings/company', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('leaftrack_token')}`,
      },
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.settings || null;
  } catch (error) {
    console.error('Error fetching company settings:', error);
    return null;
  }
}


async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    return null;
  }
}

function formatDate(value?: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN');
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

function buildHsnSummary(items: TemplateItem[]) {
  const grouped = new Map<string, { hsnSac: string; taxable: number; totalTax: number; rate: number }>();
  items.forEach((item) => {
    const key = item.hsnSac || '-';
    const current = grouped.get(key) || { hsnSac: key, taxable: 0, totalTax: 0, rate: item.gstRate };
    current.taxable += item.taxableAmount;
    current.totalTax += item.taxAmount;
    current.rate = item.gstRate || current.rate;
    grouped.set(key, current);
  });
  return Array.from(grouped.values());
}

async function renderExactBillingTemplate(document: TemplateDocument, companySettings: CompanySettings, fileName: string) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;

  const left = 10;
  const right = pageWidth - 10;
  const width = right - left;
  const lineColor: [number, number, number] = [80, 80, 80];

  const companyName = companySettings?.company_name || 'Company Name';
  const companyAddress = `${companySettings?.address || ''} ${companySettings?.city || ''} ${companySettings?.state || ''} ${companySettings?.pincode || ''}`.trim();
  const companyPhone = companySettings?.phone || '-';
  const companyEmail = companySettings?.email || '-';
  const companyGstin = companySettings?.gstin || '-';
  const bankName = companySettings?.bank_name || '-';
  const accountNumber = companySettings?.account_number || '-';
  const ifscCode = companySettings?.ifsc_code || '-';
  const accountHolder = companySettings?.account_holder_name || companyName;

  pdf.setDrawColor(...lineColor);
  pdf.setLineWidth(0.5);
  pdf.rect(left, 8, width, pageHeight - 16);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(document.title, pageWidth / 2, 18, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text('ORIGINAL FOR RECIPIENT', right - 2, 18, { align: 'right' });

  const companyTop = 22;
  const companyHeight = 28;
  pdf.rect(left, companyTop, width, companyHeight);

  let textStartX = left + 2;
  if (companySettings?.logo_url) {
    const logo = await loadImageAsBase64(companySettings.logo_url);
    if (logo) {
      try {
        pdf.rect(left + 2, companyTop + 2, 16, 16);
        pdf.addImage(logo, 'PNG', left + 2.5, companyTop + 2.5, 15, 15);
        textStartX = left + 20;
      } catch {
        textStartX = left + 2;
      }
    }
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(companyName, textStartX, companyTop + 7);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.text(companyAddress || '-', textStartX, companyTop + 12);
  pdf.text(`Phone: ${companyPhone}`, textStartX, companyTop + 18);
  pdf.text(`Email: ${companyEmail}`, textStartX + 75, companyTop + 18);
  pdf.text(`GSTIN: ${companyGstin}`, textStartX, companyTop + 24);

  const detailsTop = companyTop + companyHeight;
  const detailsHeight = 26;
  const splitX = left + width * 0.5;
  pdf.rect(left, detailsTop, width, detailsHeight);
  pdf.line(splitX, detailsTop, splitX, detailsTop + detailsHeight);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Bill To:', left + 2, detailsTop + 5);
  pdf.text('Invoice Details:', splitX + 2, detailsTop + 5);
  pdf.line(left, detailsTop + 7, right, detailsTop + 7);

  const billAddressLines = pdf.splitTextToSize(document.billToAddress || '-', splitX - left - 4);

  pdf.setFont('helvetica', 'bold');
  pdf.text(document.billToName || '-', left + 2, detailsTop + 12);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text(billAddressLines, left + 2, detailsTop + 17);
  pdf.text(`Contact No: ${document.billToContact || '-'}`, left + 2, detailsTop + 22);
  pdf.text(`GSTIN: ${document.billToGstin || '-'}`, left + 42, detailsTop + 22);
  pdf.text(`State: ${document.billToState || '-'}`, left + 2, detailsTop + 26);

  pdf.text(`${document.numberLabel}: ${document.documentNumber}`, splitX + 2, detailsTop + 12);
  pdf.text(`Date: ${document.documentDate}`, splitX + 2, detailsTop + 17);
  pdf.text(`Place Of Supply: ${document.placeOfSupply || '-'}`, splitX + 2, detailsTop + 22);

  const shipTop = detailsTop + detailsHeight;
  pdf.rect(left, shipTop, width, 11);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Ship To:', left + 2, shipTop + 4.5);
  pdf.line(left, shipTop + 5.5, right, shipTop + 5.5);
  const shipAddressLines = pdf.splitTextToSize(document.shipTo || document.billToAddress || '-', width - 4);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text(shipAddressLines, left + 2, shipTop + 9.5);

  const tableTop = shipTop + 14;
  const headerHeight = 9;
  // Exact detailed billing columns: #, Item, HSN/SAC, Qty, Unit, Price, Discount, GST, Amount
  const cols = [8, 50, 18, 14, 12, 20, 20, 20, 28];
  const colX: number[] = [left];
  cols.forEach((w) => colX.push(colX[colX.length - 1] + w));
  colX[colX.length - 1] = right;

  pdf.rect(left, tableTop, width, headerHeight);
  for (let i = 1; i < colX.length - 1; i += 1) {
    pdf.line(colX[i], tableTop, colX[i], tableTop + headerHeight);
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  const headers = ['#', 'Item name', 'HSN/SAC', 'Quantity', 'Unit', 'Price / Unit(₹)', 'Discount(₹)', 'GST(₹)', 'Amount(₹)'];
  headers.forEach((text, index) => {
    if (index === 1) {
      pdf.text(text, colX[index] + 1.5, tableTop + 5.8, { align: 'left' });
      return;
    }
    const xCenter = (colX[index] + colX[index + 1]) / 2;
    pdf.text(text, xCenter, tableTop + 5.8, { align: 'center' });
  });

  let rowY = tableTop + headerHeight;
  const rows = document.items.slice(0, 12);
  rows.forEach((item, index) => {
    const itemLines = pdf.splitTextToSize(item.itemName, cols[1] - 3);
    const rowHeight = Math.max(9, itemLines.length * 4 + 3);

    pdf.rect(left, rowY, width, rowHeight);
    for (let i = 1; i < colX.length - 1; i += 1) {
      pdf.line(colX[i], rowY, colX[i], rowY + rowHeight);
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text((index + 1).toString(), (colX[0] + colX[1]) / 2, rowY + 5.8, { align: 'center' });
    pdf.text(itemLines, colX[1] + 1.5, rowY + 5.2);
    pdf.text(item.hsnSac || '-', (colX[2] + colX[3]) / 2, rowY + 5.8, { align: 'center' });
    pdf.text(item.quantity.toString(), (colX[3] + colX[4]) / 2, rowY + 5.8, { align: 'center' });
    pdf.text(item.unit || 'Pcs', (colX[4] + colX[5]) / 2, rowY + 5.8, { align: 'center' });
    pdf.text(item.pricePerUnit.toFixed(2), colX[6] - 1.5, rowY + 5.8, { align: 'right' });
    pdf.text(item.discountAmount.toFixed(2), colX[7] - 1.5, rowY + 5.8, { align: 'right' });

    const gstText = `${item.taxAmount.toFixed(2)} (${item.gstRate.toFixed(0)}%)`;
    const gstLines = pdf.splitTextToSize(gstText, cols[7] - 2);
    pdf.setFontSize(6.2);
    pdf.text(gstLines, colX[7] + 1, rowY + 4.4);
    pdf.setFontSize(7);

    pdf.text(item.amount.toFixed(2), colX[9] - 1.5, rowY + 5.8, { align: 'right' });

    rowY += rowHeight;
  });

  pdf.rect(left, rowY, width, 8);
  for (let i = 1; i < colX.length - 1; i += 1) {
    pdf.line(colX[i], rowY, colX[i], rowY + 8);
  }

  const totalQty = rows.reduce((sum, item) => sum + item.quantity, 0);
  const totalDiscount = rows.reduce((sum, item) => sum + item.discountAmount, 0);
  const totalTax = rows.reduce((sum, item) => sum + item.taxAmount, 0);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('Total', colX[1] + 1.5, rowY + 5.4);
  pdf.text(totalQty.toString(), (colX[3] + colX[4]) / 2, rowY + 5.4, { align: 'center' });
  pdf.text(totalDiscount.toFixed(2), colX[7] - 1.5, rowY + 5.4, { align: 'right' });
  pdf.text(totalTax.toFixed(2), colX[8] - 1.5, rowY + 5.4, { align: 'right' });
  pdf.text(document.totalAmount.toFixed(2), colX[9] - 1.5, rowY + 5.4, { align: 'right' });

  const sectionTop = rowY + 8;
  const sectionHeight = 48;
  const leftSectionWidth = width * 0.65;
  const rightSectionX = left + leftSectionWidth;

  pdf.rect(left, sectionTop, width, sectionHeight);
  pdf.line(rightSectionX, sectionTop, rightSectionX, sectionTop + sectionHeight);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Tax Summary:', left + 2, sectionTop + 4.5);

  const sumTop = sectionTop + 7;
  const sumCols = [22, 22, 10, 12, 10, 12, 16];
  const sumX: number[] = [left];
  sumCols.forEach((w) => sumX.push(sumX[sumX.length - 1] + w));
  sumX[sumX.length - 1] = rightSectionX;

  pdf.rect(left, sumTop, leftSectionWidth, 9);
  for (let i = 1; i < sumX.length - 1; i += 1) {
    pdf.line(sumX[i], sumTop, sumX[i], sumTop + 9);
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  const sumHeaders = ['HSN/ SAC', 'Taxable amount (₹)', 'CGST Rate (%)', 'CGST Amt (₹)', 'SGST Rate (%)', 'SGST Amt (₹)', 'Total Tax (₹)'];
  sumHeaders.forEach((h, i) => {
    pdf.text(h, (sumX[i] + sumX[i + 1]) / 2, sumTop + 5.6, { align: 'center' });
  });

  const hsnRows = buildHsnSummary(document.items);
  let hsnY = sumTop + 9;
  hsnRows.slice(0, 3).forEach((row) => {
    pdf.rect(left, hsnY, leftSectionWidth, 7);
    for (let i = 1; i < sumX.length - 1; i += 1) {
      pdf.line(sumX[i], hsnY, sumX[i], hsnY + 7);
    }

    const halfRate = row.rate / 2;
    const halfTax = row.totalTax / 2;
    const values = [
      row.hsnSac,
      row.taxable.toFixed(2),
      halfRate.toFixed(1),
      halfTax.toFixed(2),
      halfRate.toFixed(1),
      halfTax.toFixed(2),
      row.totalTax.toFixed(2),
    ];

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    values.forEach((value, i) => {
      pdf.text(value, (sumX[i] + sumX[i + 1]) / 2, hsnY + 4.5, { align: 'center' });
    });

    hsnY += 7;
  });

  pdf.rect(left, hsnY, leftSectionWidth, 8);
  for (let i = 1; i < sumX.length - 1; i += 1) {
    pdf.line(sumX[i], hsnY, sumX[i], hsnY + 8);
  }

  const totalTaxable = hsnRows.reduce((sum, row) => sum + row.taxable, 0);
  const totalTaxSum = hsnRows.reduce((sum, row) => sum + row.totalTax, 0);
  const avgRate = totalTaxable > 0 ? (totalTaxSum * 100) / totalTaxable : 0;
  const avgHalfRate = avgRate / 2;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('TOTAL', (sumX[0] + sumX[1]) / 2, hsnY + 5, { align: 'center' });
  pdf.text(totalTaxable.toFixed(2), (sumX[1] + sumX[2]) / 2, hsnY + 5, { align: 'center' });
  pdf.text(avgHalfRate.toFixed(1), (sumX[2] + sumX[3]) / 2, hsnY + 5, { align: 'center' });
  pdf.text((totalTaxSum / 2).toFixed(2), (sumX[3] + sumX[4]) / 2, hsnY + 5, { align: 'center' });
  pdf.text(avgHalfRate.toFixed(1), (sumX[4] + sumX[5]) / 2, hsnY + 5, { align: 'center' });
  pdf.text((totalTaxSum / 2).toFixed(2), (sumX[5] + sumX[6]) / 2, hsnY + 5, { align: 'center' });
  pdf.text(totalTaxSum.toFixed(2), (sumX[6] + sumX[7]) / 2, hsnY + 5, { align: 'center' });

  let rightY = sectionTop + 4.5;
  const labelX = rightSectionX + 2;
  const valueX = right - 2;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  const rowsRight: Array<[string, string, boolean]> = [
    ['Sub Total', `₹ ${document.subtotal.toFixed(2)}`, false],
    ['Round Off', `₹ ${document.roundOff.toFixed(2)}`, false],
    ['Total', `₹ ${document.totalAmount.toFixed(2)}`, true],
  ];

  rowsRight.forEach(([label, value, bold]) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.text(label, labelX, rightY);
    pdf.text(':', labelX + 24, rightY);
    pdf.text(value, valueX, rightY, { align: 'right' });
    rightY += 5;
  });

  pdf.setFont('helvetica', 'bold');
  pdf.text('Invoice Amount in Words:', labelX, rightY + 1);
  pdf.setFont('helvetica', 'normal');
  const words = `${toWordsIndian(document.totalAmount)} Rupees only`;
  const wordLines = pdf.splitTextToSize(words, right - rightSectionX - 4);
  pdf.text(wordLines, labelX, rightY + 5.3);
  rightY += 10;

  const paymentRows: Array<[string, number]> = [
    ['Received', document.receivedAmount],
    ['Balance', document.balanceAmount],
    ['Previous Bal', document.previousBalance],
    ['Current Bal', document.currentBalance],
  ];

  paymentRows.forEach(([label, amount]) => {
    pdf.text(label, labelX, rightY);
    pdf.text(':', labelX + 24, rightY);
    pdf.text(`₹ ${amount.toFixed(2)}`, valueX, rightY, { align: 'right' });
    rightY += 4.5;
  });

  const termsTop = sectionTop + sectionHeight;
  pdf.rect(left, termsTop, width, 12);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Terms & Conditions:', left + 2, termsTop + 4.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text(document.terms || document.notes || 'Thanks for doing business with us!', left + 2, termsTop + 9);

  const bankTop = termsTop + 12;
  const bankHeight = 30;
  const splitBank = left + width * 0.62;
  pdf.rect(left, bankTop, width, bankHeight);
  pdf.line(splitBank, bankTop, splitBank, bankTop + bankHeight);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Bank Details:', left + 2, bankTop + 4.5);

  let qrInserted = false;
  if (companySettings?.upi_id) {
    const qrContent = `upi://pay?pa=${encodeURIComponent(companySettings.upi_id)}&pn=${encodeURIComponent(companyName)}&cu=INR`;
    const qr = await generateQRCode(qrContent);
    if (qr) {
      try {
        pdf.rect(left + 2, bankTop + 6, 16, 16);
        pdf.addImage(qr, 'PNG', left + 2.5, bankTop + 6.5, 15, 15);
        qrInserted = true;
      } catch {
        qrInserted = false;
      }
    }
  }

  const bankTextX = qrInserted ? left + 20 : left + 2;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text(`Name : ${bankName}`, bankTextX, bankTop + 9.5);
  pdf.text(`Account No. : ${accountNumber}`, bankTextX, bankTop + 14.5);
  pdf.text(`IFSC code : ${ifscCode}`, bankTextX, bankTop + 19.5);
  pdf.text(`Account holder's name : ${accountHolder}`, bankTextX, bankTop + 24.5);

  pdf.setFont('helvetica', 'bold');
  pdf.text(`For ${companyName}:`, splitBank + 2, bankTop + 4.5);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Authorized Signatory', splitBank + 2, bankTop + 23.5);

  pdf.save(fileName);
  return true;
}

function mapOrderToTemplate(order: Order): TemplateDocument {
  const mappedItems: TemplateItem[] = order.items.map((item) => ({
    itemName: item.product_name,
    hsnSac: '-',
    quantity: item.quantity,
    unit: item.unit || 'Pcs',
    pricePerUnit: item.price_per_unit,
    discountAmount: 0,
    gstRate: 0,
    taxableAmount: item.total_price,
    taxAmount: 0,
    amount: item.total_price,
  }));

  return {
    title: 'Order Bill',
    numberLabel: 'Order No',
    documentNumber: order.order_number,
    documentDate: formatDate(order.order_date),
    placeOfSupply: '-',
    billToName: order.customer_name,
    billToAddress: order.customer_address,
    billToContact: order.customer_contact,
    billToGstin: order.customer_gstin,
    billToState: '-',
    shipTo: order.customer_address,
    items: mappedItems,
    subtotal: order.subtotal,
    roundOff: 0,
    totalAmount: order.total_amount,
    receivedAmount: 0,
    balanceAmount: order.total_amount,
    previousBalance: 0,
    currentBalance: order.total_amount,
    terms: order.payment_terms,
    notes: order.notes,
  };
}

function mapPurchaseToTemplate(purchase: PurchaseBill): TemplateDocument {
  const taxRate = (purchase.cgst_rate || 0) + (purchase.sgst_rate || 0) + (purchase.igst_rate || 0);

  const mappedItems: TemplateItem[] = purchase.items && purchase.items.length > 0
    ? purchase.items.map((item) => {
        const taxable = item.taxable_value || item.rate * item.quantity;
        const tax = (taxable * taxRate) / 100;
        return {
          itemName: item.product_name,
          hsnSac: item.hsn_code || '-',
          quantity: item.quantity,
          unit: item.unit || 'Pcs',
          pricePerUnit: item.rate,
          discountAmount: (purchase.discount_amount || 0) / Math.max(1, purchase.items?.length || 1),
          gstRate: taxRate,
          taxableAmount: taxable,
          taxAmount: tax,
          amount: taxable + tax,
        };
      })
    : [{
        itemName: purchase.product_name || 'Purchase Item',
        hsnSac: purchase.hsn_code || '-',
        quantity: purchase.quantity || 1,
        unit: purchase.unit || 'Pcs',
        pricePerUnit: purchase.unit_price || 0,
        discountAmount: purchase.discount_amount || 0,
        gstRate: taxRate,
        taxableAmount: purchase.taxable_amount || purchase.total_amount || 0,
        taxAmount: purchase.tax_amount || 0,
        amount: purchase.final_amount || purchase.total_amount || 0,
      }];

  const subtotal = mappedItems.reduce((sum, item) => sum + item.taxableAmount, 0);
  const totalAmount = purchase.final_amount || mappedItems.reduce((sum, item) => sum + item.amount, 0);
  const due = purchase.due_amount ?? Math.max(0, totalAmount - (purchase.paid_amount || 0));
  const roundOff = Number((totalAmount - Math.round(totalAmount)).toFixed(2));

  return {
    title: 'Purchase Bill',
    numberLabel: 'Purchase No',
    documentNumber: purchase.invoice_number || purchase.purchase_number || '-',
    documentDate: formatDate(purchase.purchase_date),
    placeOfSupply: purchase.place_of_supply || '-',
    billToName: purchase.supplier_name || 'Supplier',
    billToAddress: purchase.supplier_address,
    billToContact: purchase.supplier_contact || purchase.supplier_email,
    billToGstin: purchase.supplier_gstin,
    billToState: purchase.place_of_supply,
    shipTo: purchase.supplier_address,
    items: mappedItems,
    subtotal,
    roundOff,
    totalAmount,
    receivedAmount: purchase.paid_amount || 0,
    balanceAmount: due,
    previousBalance: 0,
    currentBalance: due,
    terms: 'Thanks for doing business with us!',
    notes: purchase.notes,
  };
}

export async function generateInvoicePDF(
  invoice: Invoice,
  options?: {
    discountOverride?: number;
  },
) {
  try {
    if (!invoice?._id) {
      throw new Error('Invoice ID is required for server-side PDF generation');
    }

    const token = localStorage.getItem('leaftrack_token');
    if (!token) {
      throw new Error('Authentication token missing');
    }

    const query = new URLSearchParams();
    if (options?.discountOverride !== undefined) {
      query.set('discountOverride', String(options.discountOverride));
    }

    const response = await fetch(
      `/api/invoices/${invoice._id}/pdf${query.toString() ? `?${query.toString()}` : ''}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`PDF generation failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = `invoice-${invoice.invoice_number}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
    return true;
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return false;
  }
}

export async function generateOrderBillPDF(order: Order, companyDetails?: {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin?: string;
  logo?: string;
}) {
  try {
    const companySettings = await fetchCompanySettings();
    const document = mapOrderToTemplate(order);

    if (!companySettings && companyDetails) {
      const fallbackSettings: CompanySettings = {
        company_name: companyDetails.name,
        address: companyDetails.address,
        phone: companyDetails.phone,
        email: companyDetails.email,
        gstin: companyDetails.gstin,
      };
      return await renderExactBillingTemplate(document, fallbackSettings, `order-${order.order_number}.pdf`);
    }

    return await renderExactBillingTemplate(document, companySettings, `order-${order.order_number}.pdf`);
  } catch (error) {
    console.error('Error generating order bill PDF:', error);
    return false;
  }
}

export async function generatePurchaseBillPDF(purchase: PurchaseBill) {
  try {
    const companySettings = await fetchCompanySettings();
    const document = mapPurchaseToTemplate(purchase);
    const fileLabel = purchase.purchase_number || purchase.invoice_number || 'purchase-bill';
    return await renderExactBillingTemplate(document, companySettings, `purchase-${fileLabel}.pdf`);
  } catch (error) {
    console.error('Error generating purchase bill PDF:', error);
    return false;
  }
}
