import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseReturn extends Document {
  // Return Identification
  return_number: string;
  return_date: Date;
  purchase_id?: mongoose.Types.ObjectId; // Reference to Purchase
  original_purchase_number?: string;
  
  // Product Details (Auto-populated from Purchase)
  product_name: string;
  product_category?: string;
  product_description?: string;
  returned_quantity: number;
  original_quantity?: number; // From purchase for reference
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
  
  // Return Reason
  return_reason: string;
  return_type: 'Quality Issue' | 'Damaged' | 'Expired' | 'Wrong Item' | 'Excess Stock' | 'Other';
  
  // Pricing Details
  unit_price: number;
  total_return_amount: number;
  tax_amount?: number;
  tax_percentage?: number;
  discount_amount?: number;
  final_return_amount: number;
  
  // Refund Details
  refund_status: 'Pending' | 'Partial' | 'Completed' | 'Rejected';
  refunded_amount: number;
  pending_refund_amount: number;
  refund_method?: string; // Cash, Bank Transfer, Credit Note, Adjustment, etc.
  refund_date?: Date;
  
  // Additional Details
  debit_note_number?: string;
  notes?: string;
  returned_by?: string;
  condition_on_return?: 'Good' | 'Damaged' | 'Unusable';
  approval_status?: 'Pending' | 'Approved' | 'Rejected';
  approved_by?: string;
  
  // Metadata
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

const PurchaseReturnSchema: Schema = new Schema({
  // Return Identification
  return_number: {
    type: String,
    unique: true,
    index: true,
  },
  return_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  purchase_id: {
    type: Schema.Types.ObjectId,
    ref: 'Purchase',
    index: true,
  },
  original_purchase_number: {
    type: String,
    trim: true,
  },
  
  // Product Details (Auto-populated from Purchase)
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
  returned_quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  original_quantity: {
    type: Number,
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
  
  // Return Reason
  return_reason: {
    type: String,
    required: true,
    trim: true,
  },
  return_type: {
    type: String,
    enum: ['Quality Issue', 'Damaged', 'Expired', 'Wrong Item', 'Excess Stock', 'Other'],
    required: true,
    default: 'Other',
  },
  
  // Pricing Details
  unit_price: {
    type: Number,
    required: true,
    min: 0,
  },
  total_return_amount: {
    type: Number,
    required: true,
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
  final_return_amount: {
    type: Number,
    required: true,
    min: 0,
  },
  
  // Refund Details
  refund_status: {
    type: String,
    enum: ['Pending', 'Partial', 'Completed', 'Rejected'],
    default: 'Pending',
  },
  refunded_amount: {
    type: Number,
    default: 0,
    min: 0,
  },
  pending_refund_amount: {
    type: Number,
    required: true,
    min: 0,
  },
  refund_method: {
    type: String,
    trim: true,
  },
  refund_date: {
    type: Date,
  },
  
  // Additional Details
  debit_note_number: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  returned_by: {
    type: String,
    trim: true,
  },
  condition_on_return: {
    type: String,
    enum: ['Good', 'Damaged', 'Unusable'],
    default: 'Good',
  },
  approval_status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
  approved_by: {
    type: String,
    trim: true,
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
PurchaseReturnSchema.index({ return_date: -1 });
PurchaseReturnSchema.index({ supplier_name: 1 });
PurchaseReturnSchema.index({ product_name: 1 });
PurchaseReturnSchema.index({ refund_status: 1 });
PurchaseReturnSchema.index({ approval_status: 1 });
PurchaseReturnSchema.index({ return_type: 1 });

// Pre-save hook to auto-generate return number, calculate pending_refund_amount, and update timestamps
PurchaseReturnSchema.pre<IPurchaseReturn>('save', async function(next) {
  try {
    // Update timestamp
    this.updated_at = new Date();
    
    // Auto-generate return number if not provided
    if (!this.return_number) {
      const PurchaseReturn = mongoose.models.PurchaseReturn || mongoose.model<IPurchaseReturn>('PurchaseReturn', PurchaseReturnSchema);
      const count = await PurchaseReturn.countDocuments();
      this.return_number = `PR${String(count + 1).padStart(6, '0')}`;
    }
    
    // Calculate pending_refund_amount
    this.pending_refund_amount = this.final_return_amount - (this.refunded_amount || 0);
    
    // Update refund status based on amounts
    if ((this.refunded_amount || 0) === 0) {
      this.refund_status = 'Pending';
    } else if ((this.refunded_amount || 0) >= this.final_return_amount) {
      this.refund_status = 'Completed';
    } else {
      this.refund_status = 'Partial';
    }
    
    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error('Pre-save hook failed'));
  }
});

// Delete cached model to ensure schema updates are applied
if (mongoose.models.PurchaseReturn) {
  delete mongoose.models.PurchaseReturn;
}

export default mongoose.model<IPurchaseReturn>('PurchaseReturn', PurchaseReturnSchema);
