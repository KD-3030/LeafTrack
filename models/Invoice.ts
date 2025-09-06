import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoiceItem {
  product_id: mongoose.Types.ObjectId;
  product_name: string;
  hsn_code: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  taxable_amount: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
}

export interface IInvoice extends Document {
  invoice_number: string; // Auto-generated unique invoice number
  sale_id: mongoose.Types.ObjectId; // Reference to the original sale
  customer_id: mongoose.Types.ObjectId; // Reference to customer (User)
  salesman_id: mongoose.Types.ObjectId; // Reference to salesman
  
  // Invoice Details
  invoice_date: Date;
  due_date: Date;
  
  // Customer Details (snapshot for record keeping)
  customer_details: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    state?: string;
    gstin?: string;
  };
  
  // Company Details
  company_details: {
    name: string;
    address: string;
    gstin: string;
    phone: string;
    email: string;
  };
  
  // Invoice Items
  items: IInvoiceItem[];
  
  // Totals
  subtotal: number;
  total_discount: number;
  taxable_amount: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_tax: number;
  grand_total: number;
  
  // Status and Payment
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  payment_status: 'Pending' | 'Partial' | 'Paid';
  payment_method?: string;
  payment_date?: Date;
  paid_amount: number;
  balance_due: number;
  
  // Metadata
  notes?: string;
  terms_and_conditions?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  product_name: {
    type: String,
    required: true,
  },
  hsn_code: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unit_price: {
    type: Number,
    required: true,
    min: 0,
  },
  discount_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  taxable_amount: {
    type: Number,
    required: true,
  },
  gst_rate: {
    type: Number,
    required: true,
  },
  cgst_amount: {
    type: Number,
    default: 0,
  },
  sgst_amount: {
    type: Number,
    default: 0,
  },
  igst_amount: {
    type: Number,
    default: 0,
  },
  total_amount: {
    type: Number,
    required: true,
  },
});

const InvoiceSchema = new Schema<IInvoice>({
  invoice_number: {
    type: String,
    required: true,
    unique: true,
  },
  sale_id: {
    type: Schema.Types.ObjectId,
    ref: 'Sale',
    required: true,
  },
  customer_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  salesman_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  invoice_date: {
    type: Date,
    default: Date.now,
  },
  due_date: {
    type: Date,
    required: true,
  },
  customer_details: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    address: String,
    state: String,
    gstin: String,
  },
  company_details: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    gstin: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
  },
  items: [InvoiceItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  total_discount: {
    type: Number,
    default: 0,
  },
  taxable_amount: {
    type: Number,
    required: true,
  },
  total_cgst: {
    type: Number,
    default: 0,
  },
  total_sgst: {
    type: Number,
    default: 0,
  },
  total_igst: {
    type: Number,
    default: 0,
  },
  total_tax: {
    type: Number,
    required: true,
  },
  grand_total: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Draft',
  },
  payment_status: {
    type: String,
    enum: ['Pending', 'Partial', 'Paid'],
    default: 'Pending',
  },
  payment_method: String,
  payment_date: Date,
  paid_amount: {
    type: Number,
    default: 0,
  },
  balance_due: {
    type: Number,
    required: true,
  },
  notes: String,
  terms_and_conditions: String,
}, {
  timestamps: true,
});

// Indexes for efficient queries
InvoiceSchema.index({ invoice_number: 1 });
InvoiceSchema.index({ customer_id: 1, invoice_date: -1 });
InvoiceSchema.index({ salesman_id: 1, invoice_date: -1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ payment_status: 1 });
InvoiceSchema.index({ due_date: 1 });

export default mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
