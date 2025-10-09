import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchase extends Document {
  // Purchase Identification
  purchase_number: string;
  purchase_date: Date;
  
  // Product Details (Manual Entry)
  product_name: string;
  product_category?: string;
  product_description?: string;
  quantity: number;
  unit: string; // kg, pieces, liters, etc.
  
  // Batch Details
  batch_number: string;
  manufacturing_date?: Date;
  expiry_date?: Date;
  
  // Supplier/Store Details (Manual Entry)
  supplier_name: string;
  supplier_contact?: string;
  supplier_address?: string;
  supplier_gstin?: string;
  supplier_email?: string;
  
  // Pricing Details
  unit_price: number;
  total_amount: number;
  is_taxable?: boolean;
  tax_amount?: number;
  tax_percentage?: number;
  discount_amount?: number;
  final_amount: number;
  
  // Payment Details
  payment_status: 'Pending' | 'Partial' | 'Paid';
  paid_amount: number;
  due_amount: number;
  payment_method?: string; // Cash, Card, UPI, Cheque, Bank Transfer, etc.
  payment_date?: Date;
  
  // Additional Details
  invoice_number?: string;
  notes?: string;
  received_by?: string;
  quality_check?: 'Pass' | 'Fail' | 'Pending';
  
  // Metadata
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

const PurchaseSchema: Schema = new Schema({
  // Purchase Identification
  purchase_number: {
    type: String,
    unique: true,
    index: true,
  },
  purchase_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  
  // Product Details
  product_name: {
    type: String,
    required: true,
    trim: true,
  },
  product_category: {
    type: String,
    trim: true,
  },
  product_description: {
    type: String,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    required: true,
    trim: true,
    default: 'kg',
  },
  
  // Batch Details
  batch_number: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  manufacturing_date: {
    type: Date,
  },
  expiry_date: {
    type: Date,
  },
  
  // Supplier/Store Details
  supplier_name: {
    type: String,
    required: true,
    trim: true,
  },
  supplier_contact: {
    type: String,
    trim: true,
  },
  supplier_address: {
    type: String,
    trim: true,
  },
  supplier_gstin: {
    type: String,
    trim: true,
  },
  supplier_email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  
  // Pricing Details
  unit_price: {
    type: Number,
    required: true,
    min: 0,
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0,
  },
  is_taxable: {
    type: Boolean,
    default: false,
  },
  tax_amount: {
    type: Number,
    default: 0,
    min: 0,
  },
  tax_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  discount_amount: {
    type: Number,
    default: 0,
    min: 0,
  },
  final_amount: {
    type: Number,
    required: true,
    min: 0,
  },
  
  // Payment Details
  payment_status: {
    type: String,
    enum: ['Pending', 'Partial', 'Paid'],
    default: 'Pending',
  },
  paid_amount: {
    type: Number,
    default: 0,
    min: 0,
  },
  due_amount: {
    type: Number,
    default: 0,
    min: 0,
  },
  payment_method: {
    type: String,
    trim: true,
  },
  payment_date: {
    type: Date,
  },
  
  // Additional Details
  invoice_number: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  received_by: {
    type: String,
    trim: true,
  },
  quality_check: {
    type: String,
    enum: ['Pass', 'Fail', 'Pending'],
    default: 'Pending',
  },
  
  // Metadata
  created_by: {
    type: String,
    trim: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for better query performance
PurchaseSchema.index({ purchase_date: -1 });
PurchaseSchema.index({ supplier_name: 1 });
PurchaseSchema.index({ product_name: 1 });
PurchaseSchema.index({ payment_status: 1 });

// Pre-save hook to auto-generate purchase number, calculate due_amount, and update timestamps
PurchaseSchema.pre<IPurchase>('save', async function(next) {
  try {
    // Update timestamp
    this.updated_at = new Date();
    
    // Auto-generate purchase number if not provided
    if (!this.purchase_number) {
      const Purchase = mongoose.models.Purchase || mongoose.model<IPurchase>('Purchase', PurchaseSchema);
      const count = await Purchase.countDocuments();
      this.purchase_number = `PUR${String(count + 1).padStart(6, '0')}`;
    }
    
    // Calculate due_amount
    this.due_amount = this.final_amount - (this.paid_amount || 0);
    
    // Update payment status based on amounts
    if ((this.paid_amount || 0) === 0) {
      this.payment_status = 'Pending';
    } else if ((this.paid_amount || 0) >= this.final_amount) {
      this.payment_status = 'Paid';
    } else {
      this.payment_status = 'Partial';
    }
    
    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error('Pre-save hook failed'));
  }
});

// Delete cached model to ensure schema updates are applied
if (mongoose.models.Purchase) {
  delete mongoose.models.Purchase;
}

export default mongoose.model<IPurchase>('Purchase', PurchaseSchema);
