// lib/pdfGenerator.ts
import { jsPDF } from 'jspdf';

// Helper function to fetch company settings
async function fetchCompanySettings() {
  try {
    const response = await fetch('/api/settings/company', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
  }>;
  subtotal: number;
  grand_total: number;
  paid_amount: number;
  balance_due: number;
  status: string;
  payment_status: string;
}

export async function generateInvoicePDF(invoice: Invoice) {
  try {
    // Fetch company settings from database
    const companySettings = await fetchCompanySettings();
    
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    let yPosition = 15;

    // Enhanced Colors - Same as order bill
    const primaryColor: [number, number, number] = [26, 82, 118];
    const accentColor: [number, number, number] = [0, 150, 136];
    const textDark: [number, number, number] = [33, 33, 33];
    const textMedium: [number, number, number] = [88, 88, 88];
    const textLight: [number, number, number] = [117, 117, 117];
    const borderColor: [number, number, number] = [224, 224, 224];
    const bgLight: [number, number, number] = [250, 250, 250];

    // ==================== HEADER SECTION ====================
    pdf.setFillColor(...primaryColor);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    // Decorative accent line
    pdf.setFillColor(...accentColor);
    pdf.rect(0, 40, pageWidth, 2, 'F');

    // Load and add logo if available
    if (companySettings?.logo_url) {
      try {
        const logoBase64 = await loadImageAsBase64(companySettings.logo_url);
        if (logoBase64) {
          const logoWidth = 50;
          const logoHeight = 20;
          pdf.addImage(logoBase64, 'PNG', pageWidth - 65, 10, logoWidth, logoHeight);
        }
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    }

    // Company Name
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    const companyName = companySettings?.company_name || invoice.company_details?.name || 'Sohagtea Trading Company';
    pdf.text(companyName, 15, 18);

    // Company Details
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    const companyInfo = [];
    
    // Use company settings from database if available
    const address = companySettings ? 
      `${companySettings.address || ''}, ${companySettings.city || ''}, ${companySettings.state || ''} ${companySettings.pincode || ''}`.trim() :
      invoice.company_details?.address;
    const phone = companySettings?.phone || invoice.company_details?.phone;
    const email = companySettings?.email || invoice.company_details?.email;
    const gstin = companySettings?.gstin || invoice.company_details?.gstin;
    
    if (address) companyInfo.push(address);
    if (phone) companyInfo.push(`Tel: ${phone}`);
    if (email) companyInfo.push(email);
    if (gstin) companyInfo.push(`GSTIN: ${gstin}`);
    
    if (companyInfo.length > 0) {
      pdf.text(companyInfo[0], 15, 25);
      if (companyInfo.length > 1) {
        const line2 = companyInfo.slice(1).join(' • ');
        pdf.text(line2, 15, 29);
      }
    }

    // INVOICE Title
    pdf.setFontSize(26);
    pdf.setFont('helvetica', 'bold');
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
    pdf.setFont('helvetica', 'bold');
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
    pdf.setFont('helvetica', 'bold');
    pdf.text('INVOICE INFORMATION', 20, yPosition + 5.5);
    
    // Content
    yPosition += 14;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...textLight);
    
    pdf.text('Invoice No.', 20, yPosition);
    pdf.setTextColor(...textDark);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text(invoice.invoice_number, 50, yPosition);
    
    yPosition += 6;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
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
    pdf.setFont('helvetica', 'bold');
    pdf.text('BILL TO', 113, yPosition + 5.5);
    
    // Content
    yPosition += 14;
    pdf.setTextColor(...textDark);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    const customerName = invoice.customer_details.name.length > 25 ? 
      invoice.customer_details.name.substring(0, 22) + '...' : invoice.customer_details.name;
    pdf.text(customerName, 113, yPosition);
    
    yPosition += 6;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...textMedium);
    if (invoice.customer_details.phone) {
      pdf.text(`Phone: ${invoice.customer_details.phone}`, 113, yPosition);
      yPosition += 5;
    }
    if (invoice.customer_details.email) {
      const email = invoice.customer_details.email.length > 30 ? 
        invoice.customer_details.email.substring(0, 27) + '...' : invoice.customer_details.email;
      pdf.text(`Email: ${email}`, 113, yPosition);
    }

    // ==================== ITEMS TABLE ====================
    yPosition = 90;
    
    // Table Header
    pdf.setFillColor(...primaryColor);
    pdf.rect(15, yPosition, pageWidth - 30, 9, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DESCRIPTION', 20, yPosition + 6);
    pdf.text('QTY', 130, yPosition + 6, { align: 'center' });
    pdf.text('RATE', 163, yPosition + 6, { align: 'right' });
    pdf.text('AMOUNT', pageWidth - 20, yPosition + 6, { align: 'right' });
    
    yPosition += 9;

    // Table Items
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
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
      
      // Item name
      const maxLength = 45;
      const itemName = item.product_name.length > maxLength 
        ? item.product_name.substring(0, maxLength - 3) + '...' 
        : item.product_name;
      pdf.setFont('helvetica', 'normal');
      pdf.text(itemName, 20, yPosition + 6);
      
      // Quantity
      pdf.text(item.quantity.toString(), 130, yPosition + 6, { align: 'center' });
      
      // Rate
      pdf.text(`₹${item.unit_price.toFixed(2)}`, 163, yPosition + 6, { align: 'right' });
      
      // Amount
      pdf.setFont('helvetica', 'bold');
      pdf.text(`₹${item.total_amount.toFixed(2)}`, pageWidth - 20, yPosition + 6, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      
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
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    // Subtotal
    pdf.setTextColor(...textMedium);
    pdf.text('Subtotal', totalsX, yPosition);
    pdf.setTextColor(...textDark);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`₹${invoice.subtotal.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });
    yPosition += 6;

    // Paid Amount
    if (invoice.paid_amount > 0) {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(39, 174, 96);
      pdf.text('Paid', totalsX, yPosition);
      pdf.text(`-₹${invoice.paid_amount.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });
      yPosition += 6;
    }

    // Balance Due
    if (invoice.balance_due > 0) {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(192, 57, 43);
      pdf.text('Balance Due', totalsX, yPosition);
      pdf.text(`₹${invoice.balance_due.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });
      yPosition += 6;
    }

    // Separator line
    yPosition += 2;
    pdf.setDrawColor(...primaryColor);
    pdf.setLineWidth(0.5);
    pdf.line(totalsX - 2, yPosition, pageWidth - 18, yPosition);
    yPosition += 7;

    // Grand Total
    const totalBoxY = yPosition - 5;
    const totalsBoxWidth = 60;
    pdf.setFillColor(...primaryColor);
    pdf.roundedRect(totalsX - 5, totalBoxY, totalsBoxWidth + 5, 11, 2, 2, 'F');
    
    // Accent stripe
    pdf.setFillColor(...accentColor);
    pdf.rect(totalsX - 5, totalBoxY, 3, 11, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL', totalsX, yPosition + 2);
    pdf.setFontSize(12);
    pdf.text(`₹${invoice.grand_total.toFixed(2)}`, pageWidth - 20, yPosition + 2, { align: 'right' });

    // ==================== FOOTER ====================
    const footerY = pageHeight - 25;
    
    // Decorative line
    pdf.setDrawColor(...accentColor);
    pdf.setLineWidth(0.5);
    pdf.line(15, footerY, pageWidth - 15, footerY);
    
    pdf.setFontSize(8);
    pdf.setTextColor(...textMedium);
    pdf.setFont('helvetica', 'normal');
    
    // Left - Generation info
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 15, footerY + 7);
    
    // Center - Thank you
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(...accentColor);
    pdf.setFontSize(9);
    pdf.text('Thank you for your business!', pageWidth / 2, footerY + 7, { align: 'center' });
    
    // Right - Signature
    const sigX = pageWidth - 45;
    pdf.setFont('helvetica', 'normal');
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

    // Enhanced Colors - More sophisticated palette
    const primaryColor: [number, number, number] = [26, 82, 118]; // Deep professional blue
    const accentColor: [number, number, number] = [0, 150, 136]; // Teal accent
    const textDark: [number, number, number] = [33, 33, 33];
    const textMedium: [number, number, number] = [88, 88, 88];
    const textLight: [number, number, number] = [117, 117, 117];
    const borderColor: [number, number, number] = [224, 224, 224];
    const bgLight: [number, number, number] = [250, 250, 250];

    // ==================== HEADER SECTION ====================
    // Elegant header with gradient effect (simulated with rectangle)
    pdf.setFillColor(...primaryColor);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    // Decorative accent line
    pdf.setFillColor(...accentColor);
    pdf.rect(0, 40, pageWidth, 2, 'F');

    // Load and add logo if available
    if (companySettings?.logo_url) {
      try {
        const logoBase64 = await loadImageAsBase64(companySettings.logo_url);
        if (logoBase64) {
          const logoWidth = 50;
          const logoHeight = 20;
          pdf.addImage(logoBase64, 'PNG', pageWidth - 65, 10, logoWidth, logoHeight);
        }
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    }

    // Company Name - More prominent
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    const companyName = companySettings?.company_name || companyDetails?.name || 'Sohagtea Trading Company';
    pdf.text(companyName, 15, 18);

    // Company Details - Better organized
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    const companyInfo = [];
    
    // Use company settings from database if available
    const address = companySettings ? 
      `${companySettings.address || ''}, ${companySettings.city || ''}, ${companySettings.state || ''} ${companySettings.pincode || ''}`.trim() :
      companyDetails?.address;
    const phone = companySettings?.phone || companyDetails?.phone;
    const email = companySettings?.email || companyDetails?.email;
    const gstin = companySettings?.gstin || companyDetails?.gstin;
    
    if (address) companyInfo.push(address);
    if (phone) companyInfo.push(`Tel: ${phone}`);
    if (email) companyInfo.push(email);
    if (gstin) companyInfo.push(`GSTIN: ${gstin}`);
    
    if (companyInfo.length > 0) {
      pdf.text(companyInfo[0], 15, 25);
      if (companyInfo.length > 1) {
        const line2 = companyInfo.slice(1).join(' • ');
        pdf.text(line2, 15, 29);
      }
    }

    // ORDER BILL Title - More elegant
    pdf.setFontSize(26);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ORDER', pageWidth - 15, 20, { align: 'right' });
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'normal');
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
    pdf.setFont('helvetica', 'bold');
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
    pdf.setFont('helvetica', 'bold');
    pdf.text('ORDER INFORMATION', 20, yPosition + 5.5);
    
    // Order Details Content
    yPosition += 14;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...textLight);
    
    pdf.text('Order No.', 20, yPosition);
    pdf.setTextColor(...textDark);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text(order.order_number, 48, yPosition);
    
    yPosition += 6;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
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
    pdf.setFont('helvetica', 'bold');
    pdf.text('CUSTOMER DETAILS', 113, yPosition + 5.5);
    
    // Customer Details Content
    yPosition += 14;
    pdf.setTextColor(...textDark);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    const customerName = order.customer_name.length > 25 ? order.customer_name.substring(0, 22) + '...' : order.customer_name;
    pdf.text(customerName, 113, yPosition);
    
    yPosition += 6;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...textMedium);
    if (order.customer_contact) {
      pdf.text(`Phone: ${order.customer_contact}`, 113, yPosition);
      yPosition += 5;
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
    pdf.setFont('helvetica', 'bold');
    pdf.text('DESCRIPTION', 20, yPosition + 6);
    pdf.text('QTY', 115, yPosition + 6, { align: 'center' });
    pdf.text('UNIT', 138, yPosition + 6, { align: 'center' });
    pdf.text('RATE', 163, yPosition + 6, { align: 'right' });
    pdf.text('AMOUNT', pageWidth - 20, yPosition + 6, { align: 'right' });
    
    yPosition += 9;

    // Table Items - Enhanced styling
    pdf.setFont('helvetica', 'normal');
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
      pdf.setFont('helvetica', 'normal');
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
      pdf.text(`₹${item.price_per_unit.toFixed(2)}`, 163, yPosition + 6, { align: 'right' });
      
      // Amount
      pdf.setFont('helvetica', 'bold');
      pdf.text(`₹${item.total_price.toFixed(2)}`, pageWidth - 20, yPosition + 6, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      
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
    pdf.setFont('helvetica', 'normal');
    
    // Subtotal
    pdf.setTextColor(...textMedium);
    pdf.text('Subtotal', totalsX, yPosition);
    pdf.setTextColor(...textDark);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`₹${order.subtotal.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });
    yPosition += 6;

    // Tax
    if (order.tax_amount > 0) {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...textMedium);
      pdf.text(`Tax (${order.tax_percentage.toFixed(1)}%)`, totalsX, yPosition);
      pdf.setTextColor(...textDark);
      pdf.text(`₹${order.tax_amount.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });
      yPosition += 6;
    }

    // Discount
    if (order.discount_amount > 0) {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(192, 57, 43);
      pdf.text('Discount', totalsX, yPosition);
      pdf.text(`-₹${order.discount_amount.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });
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
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL', totalsX, yPosition + 2);
    pdf.setFontSize(12);
    pdf.text(`₹${order.total_amount.toFixed(2)}`, pageWidth - 20, yPosition + 2, { align: 'right' });

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
      pdf.setFont('helvetica', 'bold');
      pdf.text('ADDITIONAL INFORMATION', 20, yPosition + 5);
      
      let infoY = yPosition + 12;
      pdf.setFontSize(8);
      
      if (order.delivery_date) {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...textMedium);
        pdf.text('Delivery Date:', 20, infoY);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...textDark);
        pdf.text(new Date(order.delivery_date).toLocaleDateString('en-IN', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        }), 52, infoY);
        infoY += 5;
      }
      
      if (order.payment_terms) {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...textMedium);
        pdf.text('Payment Terms:', 20, infoY);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...textDark);
        const terms = order.payment_terms.length > 50 ? order.payment_terms.substring(0, 47) + '...' : order.payment_terms;
        pdf.text(terms, 52, infoY);
        infoY += 5;
      }
      
      if (order.notes) {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...textMedium);
        pdf.text('Notes:', 20, infoY);
        pdf.setFont('helvetica', 'normal');
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
    pdf.setFont('helvetica', 'normal');
    
    // Left side - Generation info
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 15, footerY + 7);
    
    // Center - Thank you message
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(...accentColor);
    pdf.setFontSize(9);
    pdf.text('Thank you for your business!', pageWidth / 2, footerY + 7, { align: 'center' });
    
    // Right side - Signature
    const sigX = pageWidth - 45;
    pdf.setFont('helvetica', 'normal');
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