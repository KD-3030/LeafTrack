// lib/pdfGenerator.ts
import { jsPDF } from 'jspdf';

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

export function generateInvoicePDF(invoice: Invoice) {
  try {
    // Create new jsPDF instance
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    let yPosition = 20;

    // Set font
    pdf.setFont('helvetica');

    // Company Header
    pdf.setFontSize(20);
    pdf.setTextColor(40, 40, 40);
    const companyName = invoice.company_details?.name || 'Your Company';
    pdf.text(companyName, 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    if (invoice.company_details?.address) {
      pdf.text(invoice.company_details.address, 20, yPosition);
      yPosition += 5;
    }
    if (invoice.company_details?.phone) {
      pdf.text(`Phone: ${invoice.company_details.phone}`, 20, yPosition);
      yPosition += 5;
    }
    if (invoice.company_details?.email) {
      pdf.text(`Email: ${invoice.company_details.email}`, 20, yPosition);
      yPosition += 5;
    }
    if (invoice.company_details?.gstin) {
      pdf.text(`GSTIN: ${invoice.company_details.gstin}`, 20, yPosition);
      yPosition += 5;
    }

    // Invoice Title
    yPosition += 10;
    pdf.setFontSize(24);
    pdf.setTextColor(40, 40, 40);
    pdf.text('INVOICE', pageWidth - 20, yPosition, { align: 'right' });
    yPosition += 10;

    // Invoice Details (right side)
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Invoice #: ${invoice.invoice_number}`, pageWidth - 20, yPosition, { align: 'right' });
    yPosition += 5;
    pdf.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, pageWidth - 20, yPosition, { align: 'right' });
    yPosition += 5;
    pdf.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, pageWidth - 20, yPosition, { align: 'right' });
    yPosition += 5;

    // Customer Details (left side)
    yPosition = Math.max(yPosition, 70); // Ensure we don't overlap
    pdf.setFontSize(14);
    pdf.setTextColor(40, 40, 40);
    pdf.text('Bill To:', 20, yPosition);
    yPosition += 8;

    pdf.setFontSize(12);
    pdf.text(invoice.customer_details.name, 20, yPosition);
    yPosition += 6;

    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    if (invoice.customer_details.email) {
      pdf.text(invoice.customer_details.email, 20, yPosition);
      yPosition += 5;
    }
    if (invoice.customer_details.phone) {
      pdf.text(invoice.customer_details.phone, 20, yPosition);
      yPosition += 5;
    }
    if (invoice.customer_details.address) {
      pdf.text(invoice.customer_details.address, 20, yPosition);
      yPosition += 5;
    }
    if (invoice.customer_details.state) {
      pdf.text(invoice.customer_details.state, 20, yPosition);
      yPosition += 5;
    }
    if (invoice.customer_details.gstin) {
      pdf.text(`GSTIN: ${invoice.customer_details.gstin}`, 20, yPosition);
      yPosition += 5;
    }

    // Items Table
    yPosition += 15;
    // const tableTop = yPosition;
    
    // Table Header
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, yPosition, pageWidth - 40, 8, 'F');
    
    pdf.setFontSize(10);
    pdf.setTextColor(40, 40, 40);
    pdf.text('Item', 25, yPosition + 5);
    pdf.text('Qty', 110, yPosition + 5, { align: 'right' });
    pdf.text('Price', 140, yPosition + 5, { align: 'right' });
    pdf.text('Total', pageWidth - 25, yPosition + 5, { align: 'right' });
    yPosition += 8;

    // Table Items
    pdf.setTextColor(60, 60, 60);
    invoice.items.forEach((item) => {
      yPosition += 8;
      pdf.text(item.product_name, 25, yPosition);
      pdf.text(item.quantity.toString(), 110, yPosition, { align: 'right' });
      pdf.text(`₹${item.unit_price.toFixed(2)}`, 140, yPosition, { align: 'right' });
      pdf.text(`₹${item.total_amount.toFixed(2)}`, pageWidth - 25, yPosition, { align: 'right' });
    });

    // Totals
    yPosition += 15;
    pdf.setFontSize(12);
    pdf.setTextColor(40, 40, 40);
    
    // Subtotal
    pdf.text('Subtotal:', pageWidth - 60, yPosition, { align: 'right' });
    pdf.text(`₹${invoice.subtotal.toFixed(2)}`, pageWidth - 25, yPosition, { align: 'right' });
    yPosition += 8;

    // Grand Total
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total:', pageWidth - 60, yPosition, { align: 'right' });
    pdf.text(`₹${invoice.grand_total.toFixed(2)}`, pageWidth - 25, yPosition, { align: 'right' });
    yPosition += 10;

    // Payment Information
    if (invoice.paid_amount > 0) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('Paid:', pageWidth - 60, yPosition, { align: 'right' });
      pdf.text(`₹${invoice.paid_amount.toFixed(2)}`, pageWidth - 25, yPosition, { align: 'right' });
      yPosition += 6;
      
      pdf.text('Balance Due:', pageWidth - 60, yPosition, { align: 'right' });
      pdf.text(`₹${invoice.balance_due.toFixed(2)}`, pageWidth - 25, yPosition, { align: 'right' });
      yPosition += 6;
    }

    // Status
    yPosition += 10;
    pdf.setFontSize(12);
    pdf.setTextColor(40, 40, 40);
    pdf.text(`Status: ${invoice.status}`, 20, yPosition);
    pdf.text(`Payment: ${invoice.payment_status}`, 20, yPosition + 8);

    // Footer
    yPosition = pdf.internal.pageSize.height - 30;
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' });

    // Save the PDF
    pdf.save(`invoice-${invoice.invoice_number}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
}