// lib/pdfGenerator.ts
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';

// Generate QR code as base64 data URL
async function generateQRCode(data: string): Promise<string | null> {
  try {
    const qrDataUrl = await QRCode.toDataURL(data, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
}

// Helper function to fetch company settings
async function fetchCompanySettings() {
  try {
    const response = await fetch('/api/settings/company', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('leaftrack_token')}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.settings;
    }
    return null;
  } catch (error) {
    console.error('Error fetching company settings:', error);
    return null;
  }
}

// Helper function to load image as base64
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
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
  status: 'pending' | 'approved' | 'rejected';
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
    product_name: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    gst_rate?: number;
    taxable_amount?: number;
    tax_amount?: number;
    cgst_amount?: number;
    sgst_amount?: number;
  }>;
  subtotal: number;
  grand_total: number;
  paid_amount: number;
  balance_due: number;
  status: string;
  payment_status: string;
  // GST fields
  total_cgst?: number;
  total_sgst?: number;
  total_igst?: number;
  total_tax?: number;
  taxable_amount?: number;
}

export async function generateInvoicePDF(invoice: Invoice) {
  try {
    // Fetch company settings from database
    const companySettings = await fetchCompanySettings();
    
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    let yPosition = 15;

    // Unified Green Color Theme
    const primaryColor: [number, number, number] = [34, 139, 34]; // Forest Green
    const accentColor: [number, number, number] = [46, 125, 50]; // Dark Green
    const lightGreen: [number, number, number] = [232, 245, 233]; // Light Green background
    const textDark: [number, number, number] = [33, 33, 33];
    const textMedium: [number, number, number] = [88, 88, 88];
    const textLight: [number, number, number] = [117, 117, 117];
    const borderColor: [number, number, number] = [200, 230, 201]; // Light green border
    const bgLight: [number, number, number] = [241, 248, 233]; // Very light green

    // ==================== HEADER SECTION ====================
    pdf.setFillColor(...primaryColor);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    // Decorative accent line
    pdf.setFillColor(...accentColor);
    pdf.rect(0, 40, pageWidth, 2, 'F');

    // Load and add logo if available - Top Left Corner
    let logoLoaded = false;
    if (companySettings?.logo_url) {
      try {
        const logoBase64 = await loadImageAsBase64(companySettings.logo_url);
        if (logoBase64) {
          const logoWidth = 25;
          const logoHeight = 25;
          pdf.addImage(logoBase64, 'PNG', 12, 7, logoWidth, logoHeight);
          logoLoaded = true;
        }
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    }

    // Company Name - Position based on logo presence
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('times', 'bold');
    const companyName = 'Sohagtea';
    const companyNameX = logoLoaded ? 40 : 15; // Shift right if logo exists
    pdf.text(companyName, companyNameX, 18);

    // Company Details - Position based on logo presence
    pdf.setFontSize(9);
    pdf.setFont('times', 'normal');
    const companyInfo = [];
    const detailsX = logoLoaded ? 40 : 15; // Shift right if logo exists
    
    // Use company settings from database if available
    const address = companySettings ? 
      `${companySettings.address || ''}, ${companySettings.city || ''}, ${companySettings.state || ''} ${companySettings.pincode || ''}`.trim() :
      invoice.company_details?.address;
    const phone = companySettings?.phone || invoice.company_details?.phone;
    const email = companySettings?.email || invoice.company_details?.email;
    const companyGstin = companySettings?.gstin || invoice.company_details?.gstin;
    
    if (address) companyInfo.push(address);
    if (phone) companyInfo.push(`Tel: ${phone}`);
    if (email) companyInfo.push(email);
    if (companyGstin) companyInfo.push(`GSTIN: ${companyGstin}`);
    
    if (companyInfo.length > 0) {
      pdf.text(companyInfo[0], detailsX, 26);
      if (companyInfo.length > 1) {
        const line2 = companyInfo.slice(1).join(' | ');
        pdf.text(line2, detailsX, 31);
      }
      if (companyInfo.length > 2) {
        const line3 = companyInfo.slice(2).join(' | ');
        pdf.text(line3, detailsX, 35);
      }
    }

    // INVOICE Title
    pdf.setFontSize(24);
    pdf.setFont('times', 'bold');
    pdf.text('INVOICE', pageWidth - 15, 28, { align: 'right' });

    // ==================== STATUS & DETAILS SECTION ====================
    yPosition = 50;
    
    // Payment Status Badge
    const paymentStatusText = invoice.payment_status.toUpperCase();
    const statusColor: [number, number, number] = 
      invoice.payment_status.toLowerCase() === 'paid' ? [39, 174, 96] : 
      invoice.payment_status.toLowerCase() === 'overdue' ? [192, 57, 43] : 
      [243, 156, 18];
    
    const badgeWidth = 45;
    const badgeX = pageWidth - 15 - badgeWidth;
    pdf.setFillColor(...statusColor);
    pdf.roundedRect(badgeX, yPosition, badgeWidth, 9, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('times', 'bold');
    pdf.text(paymentStatusText, badgeX + badgeWidth / 2, yPosition + 6, { align: 'center' });

    // ==================== INFO BOXES ====================
    yPosition = 48;
    const boxHeight = 32;
    
    // Invoice Details Box
    pdf.setDrawColor(...borderColor);
    pdf.setLineWidth(0.5);
    pdf.setFillColor(...bgLight);
    pdf.roundedRect(15, yPosition, 88, boxHeight, 3, 3, 'FD');
    
    // Header
    pdf.setFillColor(...primaryColor);
    pdf.roundedRect(15, yPosition, 88, 8, 3, 3, 'F');
    pdf.rect(15, yPosition + 5, 88, 3, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('times', 'bold');
    pdf.text('INVOICE INFORMATION', 20, yPosition + 5.5);
    
    // Content
    yPosition += 14;
    pdf.setFontSize(8);
    pdf.setFont('times', 'normal');
    pdf.setTextColor(...textLight);
    
    pdf.text('Invoice No.', 20, yPosition);
    pdf.setTextColor(...textDark);
    pdf.setFont('times', 'bold');
    pdf.setFontSize(9);
    pdf.text(invoice.invoice_number, 50, yPosition);
    
    yPosition += 6;
    pdf.setFontSize(8);
    pdf.setFont('times', 'normal');
    pdf.setTextColor(...textLight);
    pdf.text('Issue Date', 20, yPosition);
    pdf.setTextColor(...textDark);
    pdf.text(new Date(invoice.invoice_date).toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }), 50, yPosition);
    
    yPosition += 6;
    pdf.setTextColor(...textLight);
    pdf.text('Due Date', 20, yPosition);
    pdf.setTextColor(...textDark);
    const dueDate = new Date(invoice.due_date);
    const isOverdue = dueDate < new Date() && invoice.balance_due > 0;
    if (isOverdue) pdf.setTextColor(192, 57, 43);
    pdf.text(dueDate.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }), 50, yPosition);

    // Customer Details Box
    yPosition = 48;
    pdf.setDrawColor(...borderColor);
    pdf.setFillColor(...bgLight);
    pdf.roundedRect(108, yPosition, 87, boxHeight, 3, 3, 'FD');
    
    // Header
    pdf.setFillColor(...accentColor);
    pdf.roundedRect(108, yPosition, 87, 8, 3, 3, 'F');
    pdf.rect(108, yPosition + 5, 87, 3, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('times', 'bold');
    pdf.text('BILL TO', 113, yPosition + 5.5);
    
    // Content
    yPosition += 14;
    pdf.setTextColor(...textDark);
    pdf.setFontSize(10);
    pdf.setFont('times', 'bold');
    const customerName = invoice.customer_details.name.length > 25 ? 
      invoice.customer_details.name.substring(0, 22) + '...' : invoice.customer_details.name;
    pdf.text(customerName, 113, yPosition);
    
    yPosition += 6;
    pdf.setFontSize(8);
    pdf.setFont('times', 'normal');
    pdf.setTextColor(...textMedium);
    if (invoice.customer_details.address) {
      const address = invoice.customer_details.address.length > 30 ? 
        invoice.customer_details.address.substring(0, 27) + '...' : invoice.customer_details.address;
      pdf.text(address, 113, yPosition);
      yPosition += 4;
    }
    if (invoice.customer_details.gstin) {
      pdf.text(`GSTIN: ${invoice.customer_details.gstin}`, 113, yPosition);
      yPosition += 4;
    }
    if (invoice.customer_details.phone) {
      pdf.text(`Ph: ${invoice.customer_details.phone}`, 113, yPosition);
      yPosition += 4;
    }
    if (invoice.customer_details.email) {
      const email = invoice.customer_details.email.length > 30 ? 
        invoice.customer_details.email.substring(0, 27) + '...' : invoice.customer_details.email;
      pdf.text(`Email: ${email}`, 113, yPosition);
    }

    // ==================== ITEMS TABLE ====================
    yPosition = 90;
    
    // Table Header - Updated with CGST and SGST columns
    pdf.setFillColor(...primaryColor);
    pdf.rect(15, yPosition, pageWidth - 30, 9, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    pdf.setFont('times', 'bold');
    pdf.text('DESCRIPTION', 17, yPosition + 6);
    pdf.text('QTY', 68, yPosition + 6, { align: 'center' });
    pdf.text('RATE', 88, yPosition + 6, { align: 'right' });
    pdf.text('TAXABLE', 110, yPosition + 6, { align: 'right' });
    pdf.text('CGST%', 125, yPosition + 6, { align: 'center' });
    pdf.text('CGST', 142, yPosition + 6, { align: 'right' });
    pdf.text('SGST%', 157, yPosition + 6, { align: 'center' });
    pdf.text('SGST', 174, yPosition + 6, { align: 'right' });
    pdf.text('TOTAL', pageWidth - 18, yPosition + 6, { align: 'right' });
    
    yPosition += 9;

    // Table Items
    pdf.setFont('times', 'normal');
    pdf.setFontSize(7);
    let itemIndex = 0;
    const rowHeight = 9;
    
    invoice.items.forEach((item) => {
      // Alternating rows
      if (itemIndex % 2 === 1) {
        pdf.setFillColor(...bgLight);
        pdf.rect(15, yPosition, pageWidth - 30, rowHeight, 'F');
      }
      
      // Row border
      pdf.setDrawColor(...borderColor);
      pdf.setLineWidth(0.1);
      pdf.line(15, yPosition + rowHeight, pageWidth - 15, yPosition + rowHeight);
      
      pdf.setTextColor(...textDark);
      
      // Calculate item breakdown
      const itemTaxableAmount = item.taxable_amount || (item.quantity * item.unit_price);
      const itemGstRate = item.gst_rate || 5;
      const halfRate = itemGstRate / 2;
      const itemTaxAmount = item.tax_amount || ((itemTaxableAmount * itemGstRate) / 100);
      const itemCgst = itemTaxAmount / 2;
      const itemSgst = itemTaxAmount / 2;
      
      // Item name
      const maxLength = 22;
      const itemName = item.product_name.length > maxLength 
        ? item.product_name.substring(0, maxLength - 3) + '...' 
        : item.product_name;
      pdf.setFont('times', 'normal');
      pdf.text(itemName, 17, yPosition + 6);
      
      // Quantity
      pdf.text(item.quantity.toString(), 68, yPosition + 6, { align: 'center' });
      
      // Unit Rate
      pdf.text(`${item.unit_price.toFixed(2)}`, 88, yPosition + 6, { align: 'right' });
      
      // Taxable Amount (Qty × Rate)
      pdf.text(`${itemTaxableAmount.toFixed(2)}`, 110, yPosition + 6, { align: 'right' });
      
      // CGST Rate %
      pdf.text(`${halfRate}%`, 125, yPosition + 6, { align: 'center' });
      
      // CGST Amount
      pdf.text(`${itemCgst.toFixed(2)}`, 142, yPosition + 6, { align: 'right' });
      
      // SGST Rate %
      pdf.text(`${halfRate}%`, 157, yPosition + 6, { align: 'center' });
      
      // SGST Amount
      pdf.text(`${itemSgst.toFixed(2)}`, 174, yPosition + 6, { align: 'right' });
      
      // Total Amount
      pdf.setFont('times', 'bold');
      pdf.text(`${item.total_amount.toFixed(2)}`, pageWidth - 18, yPosition + 6, { align: 'right' });
      pdf.setFont('times', 'normal');
      
      yPosition += rowHeight;
      itemIndex++;
    });
    
    // Table bottom border
    pdf.setDrawColor(...primaryColor);
    pdf.setLineWidth(0.5);
    pdf.line(15, yPosition, pageWidth - 15, yPosition);

    // ==================== BALANCE & TOTALS SECTION ====================
    yPosition += 8;
    
    // Left side - Bank Details & QR Code Section
    const bankBoxX = 15;
    const bankBoxWidth = 70; // Reduced from 85
    
    // Bank Details Box
    pdf.setDrawColor(...borderColor);
    pdf.setLineWidth(0.5);
    pdf.setFillColor(...lightGreen);
    pdf.roundedRect(bankBoxX, yPosition, bankBoxWidth, 48, 3, 3, 'FD');
    
    // Header
    pdf.setFillColor(...primaryColor);
    pdf.roundedRect(bankBoxX, yPosition, bankBoxWidth, 8, 3, 3, 'F');
    pdf.rect(bankBoxX, yPosition + 5, bankBoxWidth, 3, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('times', 'bold');
    pdf.text('PAYMENT DETAILS', bankBoxX + 5, yPosition + 5.5);
    
    let bankY = yPosition + 14;
    pdf.setFontSize(7);
    pdf.setFont('times', 'normal');
    pdf.setTextColor(...textDark);
    
    // Bank Account Details - Use company settings or defaults
    const bankName = companySettings?.bank_name || 'Axis Bank';
    const accountHolder = companySettings?.account_holder_name || 'Sohag';
    const accountNumber = companySettings?.account_number || '923020024498640';
    const ifscCode = companySettings?.ifsc_code || 'UTIB0002083';
    
    // Bank Name
    pdf.setFont('times', 'bold');
    pdf.text('Bank:', bankBoxX + 3, bankY);
    pdf.setFont('times', 'normal');
    pdf.text(bankName, bankBoxX + 18, bankY);
    bankY += 5;
    
    // Account Holder Name
    pdf.setFont('times', 'bold');
    pdf.text('A/C Name:', bankBoxX + 3, bankY);
    pdf.setFont('times', 'normal');
    const accName = accountHolder.length > 18 
      ? accountHolder.substring(0, 18) + '...' 
      : accountHolder;
    pdf.text(accName, bankBoxX + 24, bankY);
    bankY += 5;
    
    // Account Number
    pdf.setFont('times', 'bold');
    pdf.text('A/C No:', bankBoxX + 3, bankY);
    pdf.setFont('times', 'normal');
    pdf.text(accountNumber, bankBoxX + 20, bankY);
    bankY += 5;
    
    // IFSC Code
    pdf.setFont('times', 'bold');
    pdf.text('IFSC:', bankBoxX + 3, bankY);
    pdf.setFont('times', 'normal');
    pdf.text(ifscCode, bankBoxX + 16, bankY);
    
    // QR Code Section - Next to Bank Details
    const qrBoxX = bankBoxX + bankBoxWidth + 3;
    const qrBoxWidth = 38;
    const qrBoxHeight = 48;
    
    pdf.setDrawColor(...borderColor);
    pdf.setFillColor(...bgLight);
    pdf.roundedRect(qrBoxX, yPosition, qrBoxWidth, qrBoxHeight, 3, 3, 'FD');
    
    // QR Code Header
    pdf.setFillColor(...primaryColor);
    pdf.roundedRect(qrBoxX, yPosition, qrBoxWidth, 6, 3, 3, 'F');
    pdf.rect(qrBoxX, yPosition + 3, qrBoxWidth, 3, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(6);
    pdf.setFont('times', 'bold');
    pdf.text('SCAN TO PAY', qrBoxX + qrBoxWidth / 2, yPosition + 4, { align: 'center' });
    
    // Generate and add QR Code for UPI payment dynamically
    const upiString = 'upi://pay?pa=9073353853@okbizaxis&pn=Sohag&cu=INR';
    const qrBase64 = await generateQRCode(upiString);
    
    if (qrBase64) {
      try {
        pdf.addImage(qrBase64, 'PNG', qrBoxX + 4, yPosition + 9, 30, 30);
      } catch (qrError) {
        console.error('Error adding QR image:', qrError);
        // Fallback text
        pdf.setTextColor(...textMedium);
        pdf.setFontSize(6);
        pdf.text('Scan QR', qrBoxX + qrBoxWidth / 2, yPosition + 28, { align: 'center' });
      }
    } else {
      // Fallback if QR generation fails
      pdf.setTextColor(...textMedium);
      pdf.setFontSize(6);
      pdf.text('Scan QR', qrBoxX + qrBoxWidth / 2, yPosition + 28, { align: 'center' });
    }
    
    // UPI Text below QR
    pdf.setTextColor(...textDark);
    pdf.setFontSize(5);
    pdf.setFont('times', 'normal');
    pdf.text('UPI: 9073353853@okbizaxis', qrBoxX + qrBoxWidth / 2, yPosition + 44, { align: 'center' });
    
    // Payment Status Box (below bank details)
    const paymentStatusY = yPosition + 52;
    if (invoice.balance_due > 0 || invoice.paid_amount > 0) {
      const statusBoxWidth = bankBoxWidth + qrBoxWidth + 3;
      
      pdf.setDrawColor(...borderColor);
      pdf.setLineWidth(0.5);
      pdf.setFillColor(...bgLight);
      pdf.roundedRect(bankBoxX, paymentStatusY, statusBoxWidth, 22, 3, 3, 'FD');
      
      // Header
      pdf.setFillColor(...accentColor);
      pdf.roundedRect(bankBoxX, paymentStatusY, statusBoxWidth, 7, 3, 3, 'F');
      pdf.rect(bankBoxX, paymentStatusY + 4, statusBoxWidth, 3, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('times', 'bold');
      pdf.text('PAYMENT STATUS', bankBoxX + 5, paymentStatusY + 5);
      
      let statusY = paymentStatusY + 13;
      pdf.setFontSize(8);
      
      // Total | Paid | Balance in one row
      const colWidth = statusBoxWidth / 3;
      
      // Total Amount
      pdf.setTextColor(...textMedium);
      pdf.setFont('times', 'normal');
      pdf.text('Total:', bankBoxX + 3, statusY);
      pdf.setTextColor(...textDark);
      pdf.setFont('times', 'bold');
      pdf.text(`Rs.${invoice.grand_total.toFixed(2)}`, bankBoxX + colWidth - 3, statusY, { align: 'right' });
      
      // Paid Amount
      pdf.setTextColor(34, 139, 34); // Green
      pdf.setFont('times', 'normal');
      pdf.text('Paid:', bankBoxX + colWidth + 3, statusY);
      pdf.setFont('times', 'bold');
      pdf.text(`Rs.${invoice.paid_amount.toFixed(2)}`, bankBoxX + colWidth * 2 - 3, statusY, { align: 'right' });
      
      // Balance Due
      pdf.setTextColor(192, 57, 43); // Red
      pdf.setFont('times', 'normal');
      pdf.text('Due:', bankBoxX + colWidth * 2 + 3, statusY);
      pdf.setFont('times', 'bold');
      pdf.text(`Rs.${invoice.balance_due.toFixed(2)}`, bankBoxX + statusBoxWidth - 3, statusY, { align: 'right' });
    }
    
    // Right side - Totals Section
    const totalsX = pageWidth - 75;
    const totalsY = yPosition;
    
    pdf.setFontSize(9);
    pdf.setFont('times', 'normal');
    
    // ALWAYS calculate subtotal and GST from items to ensure accuracy
    // This fixes issues where stored values may be incorrect
    let calculatedSubtotal = 0;
    let calculatedGst = 0;
    
    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach(item => {
        // Calculate taxable amount for this item
        const itemTaxable = item.taxable_amount || (item.quantity * item.unit_price);
        calculatedSubtotal += itemTaxable;
        
        // ALWAYS calculate GST from taxable amount and rate to ensure accuracy
        // Don't trust stored cgst_amount/sgst_amount as they may be incorrect
        const rate = item.gst_rate || 5;
        calculatedGst += (itemTaxable * rate) / 100;
      });
    }
    
    // Fallback to stored values only if items are empty
    if (calculatedSubtotal === 0) {
      calculatedSubtotal = invoice.subtotal || 0;
    }
    if (calculatedGst === 0 && invoice.grand_total > calculatedSubtotal) {
      calculatedGst = invoice.grand_total - calculatedSubtotal;
    }
    
    // Subtotal
    pdf.setTextColor(...textMedium);
    pdf.text('Subtotal', totalsX, totalsY);
    pdf.setTextColor(...textDark);
    pdf.setFont('times', 'bold');
    pdf.text(`Rs.${calculatedSubtotal.toFixed(2)}`, pageWidth - 20, totalsY, { align: 'right' });
    
    let taxY = totalsY + 6;
    
    // Display Total GST
    pdf.setFont('times', 'normal');
    pdf.setTextColor(...textMedium);
    pdf.text('Total GST', totalsX, taxY);
    pdf.setTextColor(...textDark);
    pdf.text(`Rs.${calculatedGst.toFixed(2)}`, pageWidth - 20, taxY, { align: 'right' });
    taxY += 6;

    // Separator line
    taxY += 2;
    pdf.setDrawColor(...primaryColor);
    pdf.setLineWidth(0.5);
    pdf.line(totalsX - 2, taxY, pageWidth - 18, taxY);
    taxY += 7;

    // Grand Total
    const totalBoxY = taxY - 5;
    const totalsBoxWidth = 60;
    pdf.setFillColor(...primaryColor);
    pdf.roundedRect(totalsX - 5, totalBoxY, totalsBoxWidth + 5, 11, 2, 2, 'F');
    
    // Accent stripe
    pdf.setFillColor(...accentColor);
    pdf.rect(totalsX - 5, totalBoxY, 3, 11, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('times', 'bold');
    pdf.text('TOTAL', totalsX, taxY + 2);
    pdf.setFontSize(12);
    pdf.text(`Rs.${invoice.grand_total.toFixed(2)}`, pageWidth - 20, taxY + 2, { align: 'right' });
    
    yPosition = Math.max(yPosition + (invoice.balance_due > 0 || invoice.paid_amount > 0 ? 78 : 52), taxY + 10);

    // ==================== AUTHORIZED SIGNATURE SECTION ====================
    const sigSectionY = pageHeight - 55;
    
    // Signature on the right side
    const sigX = pageWidth - 50;
    pdf.setFont('times', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...textDark);
    
    // Signature line
    pdf.setDrawColor(...primaryColor);
    pdf.setLineWidth(0.3);
    pdf.line(sigX - 25, sigSectionY + 12, sigX + 25, sigSectionY + 12);
    
    // Label
    pdf.setTextColor(...textMedium);
    pdf.setFontSize(8);
    pdf.text('Authorized Signature', sigX, sigSectionY + 18, { align: 'center' });
    
    // Company name under signature
    pdf.setFont('times', 'bold');
    pdf.setTextColor(...primaryColor);
    pdf.setFontSize(7);
    pdf.text('For Sohagtea', sigX, sigSectionY + 23, { align: 'center' });

    // ==================== FOOTER ====================
    const footerY = pageHeight - 20;
    
    // Decorative line
    pdf.setDrawColor(...primaryColor);
    pdf.setLineWidth(0.5);
    pdf.line(15, footerY, pageWidth - 15, footerY);
    
    pdf.setFontSize(8);
    pdf.setTextColor(...textMedium);
    pdf.setFont('times', 'normal');
    
    // Left - Generation info
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 15, footerY + 7);
    
    // Center - Thank you
    pdf.setFont('times', 'italic');
    pdf.setTextColor(...primaryColor);
    pdf.setFontSize(9);
    pdf.text('Thank you for your business!', pageWidth / 2, footerY + 7, { align: 'center' });
    
    // Page number
    pdf.setFontSize(7);
    pdf.setTextColor(...textLight);
    pdf.text(`Page 1 of 1`, pageWidth / 2, pageHeight - 5, { align: 'center' });

    // Save the PDF
    pdf.save(`invoice-${invoice.invoice_number}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
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
    // Fetch company settings from database
    const companySettings = await fetchCompanySettings();
    
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    let yPosition = 15;

    // Unified Green Color Theme - Same as Invoice
    const primaryColor: [number, number, number] = [34, 139, 34]; // Forest Green
    const accentColor: [number, number, number] = [46, 125, 50]; // Dark Green
    const textDark: [number, number, number] = [33, 33, 33];
    const textMedium: [number, number, number] = [88, 88, 88];
    const textLight: [number, number, number] = [117, 117, 117];
    const borderColor: [number, number, number] = [200, 230, 201]; // Light green border
    const bgLight: [number, number, number] = [241, 248, 233]; // Very light green

    // ==================== HEADER SECTION ====================
    // Elegant header with green theme
    pdf.setFillColor(...primaryColor);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    // Decorative accent line
    pdf.setFillColor(...accentColor);
    pdf.rect(0, 40, pageWidth, 2, 'F');

    // Load and add logo if available - Top Left Corner
    let logoLoaded = false;
    if (companySettings?.logo_url) {
      try {
        const logoBase64 = await loadImageAsBase64(companySettings.logo_url);
        if (logoBase64) {
          const logoWidth = 25;
          const logoHeight = 25;
          pdf.addImage(logoBase64, 'PNG', 12, 7, logoWidth, logoHeight);
          logoLoaded = true;
        }
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    }

    // Company Name - Position based on logo presence
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('times', 'bold');
    const companyName = companySettings?.company_name || 'Sohagtea Company';
    const companyNameX = logoLoaded ? 40 : 15;
    pdf.text(companyName, companyNameX, 18);

    // Company Details - Position based on logo presence
    pdf.setFontSize(9);
    pdf.setFont('times', 'normal');
    const companyInfo = [];
    const detailsX = logoLoaded ? 40 : 15;
    
    // Use company settings from database if available
    const address = companySettings ? 
      `${companySettings.address || ''}, ${companySettings.city || ''}, ${companySettings.state || ''} ${companySettings.pincode || ''}`.trim() :
      companyDetails?.address;
    const phone = companySettings?.phone || companyDetails?.phone;
    const email = companySettings?.email || companyDetails?.email;
    const companyGstin = companySettings?.gstin || companyDetails?.gstin;
    
    if (address) companyInfo.push(address);
    if (phone) companyInfo.push(`Tel: ${phone}`);
    if (email) companyInfo.push(email);
    if (companyGstin) companyInfo.push(`GSTIN: ${companyGstin}`);
    
    if (companyInfo.length > 0) {
      pdf.text(companyInfo[0], detailsX, 26);
      if (companyInfo.length > 1) {
        const line2 = companyInfo.slice(1).join(' | ');
        pdf.text(line2, detailsX, 31);
      }
      if (companyInfo.length > 2) {
        const line3 = companyInfo.slice(2).join(' | ');
        pdf.text(line3, detailsX, 35);
      }
    }

    // ORDER BILL Title - More elegant
    pdf.setFontSize(24);
    pdf.setFont('times', 'bold');
    pdf.text('ORDER', pageWidth - 15, 20, { align: 'right' });
    pdf.setFontSize(16);
    pdf.setFont('times', 'normal');
    pdf.text('BILL', pageWidth - 15, 28, { align: 'right' });

    // ==================== STATUS & DETAILS SECTION ====================
    yPosition = 50;
    
    // Status Badge - More refined
    const statusText = order.status.toUpperCase();
    const statusColor: [number, number, number] = 
      order.status === 'approved' ? [39, 174, 96] : 
      order.status === 'rejected' ? [192, 57, 43] : 
      [243, 156, 18];
    
    const badgeWidth = 45;
    const badgeX = pageWidth - 15 - badgeWidth;
    pdf.setFillColor(...statusColor);
    pdf.roundedRect(badgeX, yPosition, badgeWidth, 9, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('times', 'bold');
    pdf.text(statusText, badgeX + badgeWidth / 2, yPosition + 6, { align: 'center' });

    // ==================== INFO BOXES ====================
    yPosition = 48;
    const boxHeight = 32;
    
    // Order Details Box - Redesigned
    pdf.setDrawColor(...borderColor);
    pdf.setLineWidth(0.5);
    pdf.setFillColor(...bgLight);
    pdf.roundedRect(15, yPosition, 88, boxHeight, 3, 3, 'FD');
    
    // Order Details Header
    pdf.setFillColor(...primaryColor);
    pdf.roundedRect(15, yPosition, 88, 8, 3, 3, 'F');
    pdf.rect(15, yPosition + 5, 88, 3, 'F'); // Fill bottom corners
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('times', 'bold');
    pdf.text('ORDER INFORMATION', 20, yPosition + 5.5);
    
    // Order Details Content
    yPosition += 14;
    pdf.setFontSize(8);
    pdf.setFont('times', 'normal');
    pdf.setTextColor(...textLight);
    
    pdf.text('Order No.', 20, yPosition);
    pdf.setTextColor(...textDark);
    pdf.setFont('times', 'bold');
    pdf.setFontSize(9);
    pdf.text(order.order_number, 48, yPosition);
    
    yPosition += 6;
    pdf.setFontSize(8);
    pdf.setFont('times', 'normal');
    pdf.setTextColor(...textLight);
    pdf.text('Date', 20, yPosition);
    pdf.setTextColor(...textDark);
    pdf.text(new Date(order.order_date).toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }), 48, yPosition);
    
    yPosition += 6;
    pdf.setTextColor(...textLight);
    pdf.text('Salesman', 20, yPosition);
    pdf.setTextColor(...textDark);
    const salesmanName = order.salesman_name || 'N/A';
    const truncatedSalesman = salesmanName.length > 20 ? salesmanName.substring(0, 17) + '...' : salesmanName;
    pdf.text(truncatedSalesman, 48, yPosition);

    // Customer Details Box - Redesigned
    yPosition = 48;
    pdf.setDrawColor(...borderColor);
    pdf.setFillColor(...bgLight);
    pdf.roundedRect(108, yPosition, 87, boxHeight, 3, 3, 'FD');
    
    // Customer Details Header
    pdf.setFillColor(...accentColor);
    pdf.roundedRect(108, yPosition, 87, 8, 3, 3, 'F');
    pdf.rect(108, yPosition + 5, 87, 3, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('times', 'bold');
    pdf.text('CUSTOMER DETAILS', 113, yPosition + 5.5);
    
    // Customer Details Content
    yPosition += 14;
    pdf.setTextColor(...textDark);
    pdf.setFontSize(10);
    pdf.setFont('times', 'bold');
    const customerName = order.customer_name.length > 25 ? order.customer_name.substring(0, 22) + '...' : order.customer_name;
    pdf.text(customerName, 113, yPosition);
    
    yPosition += 6;
    pdf.setFontSize(8);
    pdf.setFont('times', 'normal');
    pdf.setTextColor(...textMedium);
    if (order.customer_address) {
      const address = order.customer_address.length > 30 ? 
        order.customer_address.substring(0, 27) + '...' : order.customer_address;
      pdf.text(address, 113, yPosition);
      yPosition += 4;
    }
    if (order.customer_gstin) {
      pdf.text(`GSTIN: ${order.customer_gstin}`, 113, yPosition);
      yPosition += 4;
    }
    if (order.customer_contact) {
      pdf.text(`Ph: ${order.customer_contact}`, 113, yPosition);
      yPosition += 4;
    }
    if (order.customer_email) {
      const email = order.customer_email.length > 30 ? order.customer_email.substring(0, 27) + '...' : order.customer_email;
      pdf.text(`Email: ${email}`, 113, yPosition);
    }

    // ==================== ITEMS TABLE ====================
    yPosition = 90;
    
    // Table Header - Modern design
    pdf.setFillColor(...primaryColor);
    pdf.rect(15, yPosition, pageWidth - 30, 9, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('times', 'bold');
    pdf.text('DESCRIPTION', 20, yPosition + 6);
    pdf.text('QTY', 115, yPosition + 6, { align: 'center' });
    pdf.text('UNIT', 138, yPosition + 6, { align: 'center' });
    pdf.text('RATE', 163, yPosition + 6, { align: 'right' });
    pdf.text('AMOUNT', pageWidth - 20, yPosition + 6, { align: 'right' });
    
    yPosition += 9;

    // Table Items - Enhanced styling
    pdf.setFont('times', 'normal');
    pdf.setFontSize(9);
    let itemIndex = 0;
    const rowHeight = 9;
    
    order.items.forEach((item) => {
      // Alternating row background with subtle styling
      if (itemIndex % 2 === 1) {
        pdf.setFillColor(...bgLight);
        pdf.rect(15, yPosition, pageWidth - 30, rowHeight, 'F');
      }
      
      // Row border
      pdf.setDrawColor(...borderColor);
      pdf.setLineWidth(0.1);
      pdf.line(15, yPosition + rowHeight, pageWidth - 15, yPosition + rowHeight);
      
      pdf.setTextColor(...textDark);
      
      // Item name with better truncation
      const maxLength = 40;
      const itemName = item.product_name.length > maxLength 
        ? item.product_name.substring(0, maxLength - 3) + '...' 
        : item.product_name;
      pdf.setFont('times', 'normal');
      pdf.text(itemName, 20, yPosition + 6);
      
      // Quantity
      pdf.text(item.quantity.toString(), 115, yPosition + 6, { align: 'center' });
      
      // Unit
      pdf.setFontSize(8);
      pdf.setTextColor(...textMedium);
      pdf.text(item.unit, 138, yPosition + 6, { align: 'center' });
      
      // Rate
      pdf.setFontSize(9);
      pdf.setTextColor(...textDark);
      pdf.text(`Rs.${item.price_per_unit.toFixed(2)}`, 163, yPosition + 6, { align: 'right' });
      
      // Amount
      pdf.setFont('times', 'bold');
      pdf.text(`Rs.${item.total_price.toFixed(2)}`, pageWidth - 20, yPosition + 6, { align: 'right' });
      pdf.setFont('times', 'normal');
      
      yPosition += rowHeight;
      itemIndex++;
    });
    
    // Table bottom border
    pdf.setDrawColor(...primaryColor);
    pdf.setLineWidth(0.5);
    pdf.line(15, yPosition, pageWidth - 15, yPosition);

    // ==================== TOTALS SECTION ====================
    yPosition += 8;
    const totalsX = pageWidth - 75;
    const totalsBoxWidth = 60;
    
    pdf.setFontSize(9);
    pdf.setFont('times', 'normal');
    
    // Subtotal
    pdf.setTextColor(...textMedium);
    pdf.text('Subtotal', totalsX, yPosition);
    pdf.setTextColor(...textDark);
    pdf.setFont('times', 'bold');
    pdf.text(`Rs.${order.subtotal.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });
    yPosition += 6;

    // Tax
    if (order.tax_amount > 0) {
      pdf.setFont('times', 'normal');
      pdf.setTextColor(...textMedium);
      pdf.text(`Tax (${order.tax_percentage.toFixed(1)}%)`, totalsX, yPosition);
      pdf.setTextColor(...textDark);
      pdf.text(`Rs.${order.tax_amount.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });
      yPosition += 6;
    }

    // Discount
    if (order.discount_amount > 0) {
      pdf.setFont('times', 'normal');
      pdf.setTextColor(192, 57, 43);
      pdf.text('Discount', totalsX, yPosition);
      pdf.text(`-Rs.${order.discount_amount.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });
      yPosition += 6;
    }

    // Separator line
    yPosition += 2;
    pdf.setDrawColor(...primaryColor);
    pdf.setLineWidth(0.5);
    pdf.line(totalsX - 2, yPosition, pageWidth - 18, yPosition);
    yPosition += 7;

    // Grand Total - Elegant box
    const totalBoxY = yPosition - 5;
    pdf.setFillColor(...primaryColor);
    pdf.roundedRect(totalsX - 5, totalBoxY, totalsBoxWidth + 5, 11, 2, 2, 'F');
    
    // Add accent stripe
    pdf.setFillColor(...accentColor);
    pdf.rect(totalsX - 5, totalBoxY, 3, 11, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('times', 'bold');
    pdf.text('TOTAL', totalsX, yPosition + 2);
    pdf.setFontSize(12);
    pdf.text(`Rs.${order.total_amount.toFixed(2)}`, pageWidth - 20, yPosition + 2, { align: 'right' });

    // ==================== ADDITIONAL INFORMATION ====================
    yPosition += 15;
    
    if (order.delivery_date || order.payment_terms || order.notes) {
      // Styled info box
      pdf.setDrawColor(...borderColor);
      pdf.setFillColor(...bgLight);
      pdf.roundedRect(15, yPosition, pageWidth - 30, 22, 3, 3, 'FD');
      
      // Info header
      pdf.setFillColor(248, 249, 250);
      pdf.roundedRect(15, yPosition, pageWidth - 30, 7, 3, 3, 'F');
      pdf.rect(15, yPosition + 4, pageWidth - 30, 3, 'F');
      
      pdf.setTextColor(...textDark);
      pdf.setFontSize(8);
      pdf.setFont('times', 'bold');
      pdf.text('ADDITIONAL INFORMATION', 20, yPosition + 5);
      
      let infoY = yPosition + 12;
      pdf.setFontSize(8);
      
      if (order.delivery_date) {
        pdf.setFont('times', 'bold');
        pdf.setTextColor(...textMedium);
        pdf.text('Delivery Date:', 20, infoY);
        pdf.setFont('times', 'normal');
        pdf.setTextColor(...textDark);
        pdf.text(new Date(order.delivery_date).toLocaleDateString('en-IN', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        }), 52, infoY);
        infoY += 5;
      }
      
      if (order.payment_terms) {
        pdf.setFont('times', 'bold');
        pdf.setTextColor(...textMedium);
        pdf.text('Payment Terms:', 20, infoY);
        pdf.setFont('times', 'normal');
        pdf.setTextColor(...textDark);
        const terms = order.payment_terms.length > 50 ? order.payment_terms.substring(0, 47) + '...' : order.payment_terms;
        pdf.text(terms, 52, infoY);
        infoY += 5;
      }
      
      if (order.notes) {
        pdf.setFont('times', 'bold');
        pdf.setTextColor(...textMedium);
        pdf.text('Notes:', 20, infoY);
        pdf.setFont('times', 'normal');
        pdf.setTextColor(...textDark);
        const notes = order.notes.length > 60 ? order.notes.substring(0, 57) + '...' : order.notes;
        pdf.text(notes, 52, infoY);
      }
      
      yPosition += 23;
    }

    // ==================== FOOTER ====================
    const footerY = pageHeight - 25;
    
    // Decorative line
    pdf.setDrawColor(...accentColor);
    pdf.setLineWidth(0.5);
    pdf.line(15, footerY, pageWidth - 15, footerY);
    
    // Signature section
    pdf.setFontSize(8);
    pdf.setTextColor(...textMedium);
    pdf.setFont('times', 'normal');
    
    // Left side - Generation info
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 15, footerY + 7);
    
    // Center - Thank you message
    pdf.setFont('times', 'italic');
    pdf.setTextColor(...accentColor);
    pdf.setFontSize(9);
    pdf.text('Thank you for your business!', pageWidth / 2, footerY + 7, { align: 'center' });
    
    // Right side - Signature
    const sigX = pageWidth - 45;
    pdf.setFont('times', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...textDark);
    pdf.text('____________________', sigX, footerY + 10, { align: 'center' });
    pdf.setTextColor(...textMedium);
    pdf.text('Authorized Signature', sigX, footerY + 15, { align: 'center' });
    
    // Page number
    pdf.setFontSize(7);
    pdf.setTextColor(...textLight);
    pdf.text(`Page 1 of 1`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Save the PDF
    pdf.save(`order-${order.order_number}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error generating order bill PDF:', error);
    return false;
  }
}