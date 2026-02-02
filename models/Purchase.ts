import mongoose, { Schema, Document } from 'mongoose';

// Line Item interface for multiple products per purchase
export interface IPurchaseItem {
  product_name: string;
  hsn_code?: string;
  quantity: number;
  unit: string;
  rate: number;
  taxable_value: number;
}

export interface IPurchase extends Document {
  // Serial Number (Simple incremental ID)
  serial_number: number;
  
  // Purchase Identification
  purchase_number: string;
  purchase_date: Date;
  
  // Seller Reference (Link to Seller collection)
  seller_id?: mongoose.Types.ObjectId;
  
  // Place of Supply (State) for GST
  place_of_supply?: string;
  
  // Line Items (Multiple products per invoice)
  items?: IPurchaseItem[];
  
  // Product Details (Manual Entry - for single product backward compatibility)
  product_name?: string;
  hsn_code?: string;
  product_category?: string;
  product_description?: string;
  quantity?: number;
  unit?: string; // kg, pieces, liters, etc.
  
  // Batch Details
  batch_number?: string;
  manufacturing_date?: Date;
  expiry_date?: Date;
  
  // Supplier/Store Details (Manual Entry - for backward compatibility)
  supplier_name?: string;
  supplier_contact?: string;
  supplier_address?: string;
  supplier_gstin?: string;
  supplier_email?: string;
  
  // Pricing Details
  unit_price?: number;
  taxable_amount?: number; // Total taxable amount before GST
  total_amount?: number;
  
  // GST Details
  is_taxable?: boolean;
  cgst_rate?: number;
  cgst_amount?: number;
  sgst_rate?: number;
  sgst_amount?: number;
  igst_rate?: number;
  igst_amount?: number;
  tax_amount?: number; // Total tax (CGST + SGST or IGST)
  tax_percentage?: number;
  
  discount_amount?: number;
  final_amount?: number;
  
  // Payment Details
  payment_status: 'Pending' | 'Partial' | 'Paid';
  paid_amount: number;
  due_amount: number;
  payment_method?: string; // Cash, Card, UPI, Cheque, Bank Transfer, etc.
  payment_date?: Date;
  
  // Bill/Invoice Details
  invoice_number?: string;
  bill_image_url?: string; // Store uploaded bill image URL
  
  // Additional Details
  notes?: string;
  packaging_note?: string; // e.g., "1 Kg Packet" 
  received_by?: string;
  quality_check?: 'Pass' | 'Fail' | 'Pending';
  
  // Metadata
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

// Schema for line items
const PurchaseItemSchema = new Schema({
  product_name: {
    type: String,
    required: true,
    trim: true,
  },
  hsn_code: {
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
    trim: true,
    default: 'kg',
  },
  rate: {
    type: Number,
    required: true,
    min: 0,
  },
  taxable_value: {
    type: Number,
    min: 0,
  },
}, { _id: false });

const PurchaseSchema: Schema = new Schema({
  // Serial Number (Simple incremental ID)
  serial_number: {
    type: Number,
    unique: true,
    index: true,
  },
  
  // Purchase Identification
  purchase_number: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  purchase_date: {
    type: Date,
    default: Date.now,
  },
  
  // Seller Reference
  seller_id: {
    type: Schema.Types.ObjectId,
    ref: 'Seller',
  },
  
  // Place of Supply (State for GST)
  place_of_supply: {
    type: String,
    trim: true,
  },
  
  // Line Items (Multiple products per invoice)
  items: [PurchaseItemSchema],
  
  // Product Details - All optional for flexible entry
  product_name: {
    type: String,
    trim: true,
  },
  hsn_code: {
    type: String,
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
    min: 0,
  },
  unit: {
    type: String,
    trim: true,
    default: 'kg',
  },
  
  // Batch Details - Optional
  batch_number: {
    type: String,
    trim: true,
    index: true,
  },
  manufacturing_date: {
    type: Date,
  },
  expiry_date: {
    type: Date,
  },
  
  // Supplier/Store Details - Optional (for backward compatibility)
  supplier_name: {
    type: String,
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
  
  // Pricing Details - Optional
  unit_price: {
    type: Number,
    min: 0,
  },
  taxable_amount: {
    type: Number,
    min: 0,
  },
  total_amount: {
    type: Number,
    min: 0,
  },
  is_taxable: {
    type: Boolean,
    default: false,
  },
  // GST Breakdown
  cgst_rate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  cgst_amount: {
    type: Number,
    default: 0,
    min: 0,
  },
  sgst_rate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  sgst_amount: {
    type: Number,
    default: 0,
    min: 0,
  },
  igst_rate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  igst_amount: {
    type: Number,
    default: 0,
    min: 0,
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
  
  // Bill/Invoice Details
  invoice_number: {
    type: String,
    trim: true,
  },
  bill_image_url: {
    type: String,
    trim: true,
  },
  
  // Additional Details
  notes: {
    type: String,
    trim: true,
  },
  packaging_note: {
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
PurchaseSchema.index({ serial_number: -1 });
PurchaseSchema.index({ purchase_date: -1 });
PurchaseSchema.index({ seller_id: 1 });
PurchaseSchema.index({ supplier_name: 1 });
PurchaseSchema.index({ product_name: 1 });
PurchaseSchema.index({ payment_status: 1 });

// Pre-save hook to auto-generate serial number, purchase number, calculate due_amount, and update timestamps
PurchaseSchema.pre<IPurchase>('save', async function(next) {
  try {
    // Update timestamp
    this.updated_at = new Date();
    
    // Auto-generate serial number if not provided
    if (!this.serial_number) {
      const Purchase = mongoose.models.Purchase || mongoose.model<IPurchase>('Purchase', PurchaseSchema);
      const lastPurchase = await Purchase.findOne().sort({ serial_number: -1 }).lean();
      this.serial_number = lastPurchase && (lastPurchase as IPurchase).serial_number 
        ? (lastPurchase as IPurchase).serial_number + 1 
        : 1001; // Start at 1001
    }
    
    // Auto-generate purchase number from serial number if not provided
    if (!this.purchase_number) {
      this.purchase_number = `PUR-${this.serial_number}`;
    }
    
    // Calculate due_amount
    const finalAmount = this.final_amount || 0;
    const paidAmount = this.paid_amount || 0;
    this.due_amount = finalAmount - paidAmount;
    
    // Update payment status based on amounts
    if (paidAmount === 0) {
      this.payment_status = 'Pending';
    } else if (paidAmount >= finalAmount) {
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
