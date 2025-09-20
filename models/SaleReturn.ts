import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISaleReturnItem {
  product_id?: mongoose.Types.ObjectId; // Optional for manual entries
  product_name: string;
  original_quantity?: number; // Optional for manual entries
  return_quantity?: number; // For invoice-based returns
  quantity_returned?: number; // For manual entries
  return_reason?: 'Defective' | 'Wrong Product' | 'Customer Request' | 'Quality Issue' | 'Other';
  reason?: string; // For manual entries - free text
  condition?: 'Good' | 'Damaged' | 'Expired';
  unit_price: number;
  total_refund?: number; // For invoice-based returns
  total_amount?: number; // For manual entries
}

export interface ISaleReturn extends Document {
  return_number: string; // Auto-generated unique return number
  original_invoice_id?: mongoose.Types.ObjectId; // Reference to original invoice (optional for manual entries)
  original_sale_id?: mongoose.Types.ObjectId; // Reference to original sale (optional for manual entries)
  customer_id?: mongoose.Types.ObjectId; // For invoice-based returns
  salesman_id?: mongoose.Types.ObjectId; // For invoice-based returns
  
  // Manual Entry Support
  is_manual_entry?: boolean;
  customer_details?: {
    name: string;
    email?: string;
    phone?: string;
  };
  created_by?: mongoose.Types.ObjectId; // Admin who created manual entry
  return_reason?: string; // Overall reason for return
  
  // Return Details
  return_date: Date;
  return_items: ISaleReturnItem[];
  
  // Financial Details
  subtotal?: number; // Optional for manual entries
  tax_amount?: number; // Optional for manual entries
  total_refund_amount?: number; // For manual entries
  total_refund?: number; // For invoice-based returns
  
  // Return Status
  status: 'Pending' | 'Processing' | 'Completed' | 'Rejected';
  refund_method: 'Cash' | 'Bank Transfer' | 'Store Credit' | 'Exchange' | 'Cheque' | 'Credit Note';
  refund_status: 'Pending' | 'Processed' | 'Failed';
  
  // Additional Information
  notes?: string;
  admin_approval: boolean;
  approved_by?: mongoose.Types.ObjectId;
  approval_date?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const SaleReturnItemSchema = new Schema<ISaleReturnItem>({
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: false, // Optional for manual entries
  },
  product_name: {
    type: String,
    required: true,
  },
  original_quantity: {
    type: Number,
    required: false, // Optional for manual entries
    min: 1,
  },
  return_quantity: {
    type: Number,
    required: false, // For invoice-based returns
    min: 1,
  },
  quantity_returned: {
    type: Number,
    required: false, // For manual entries
    min: 1,
  },
  return_reason: {
    type: String,
    enum: ['Defective', 'Wrong Product', 'Customer Request', 'Quality Issue', 'Other'],
    required: false,
  },
  reason: {
    type: String,
    required: false, // Free text reason for manual entries
  },
  condition: {
    type: String,
    enum: ['Good', 'Damaged', 'Expired'],
    required: false,
    default: 'Good',
  },
  unit_price: {
    type: Number,
    required: true,
    min: 0,
  },
  total_refund: {
    type: Number,
    required: false, // For invoice-based returns
    min: 0,
  },
  total_amount: {
    type: Number,
    required: false, // For manual entries
    min: 0,
  },
});

const SaleReturnSchema = new Schema<ISaleReturn>({
  return_number: {
    type: String,
    required: true,
    unique: true,
  },
  original_invoice_id: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice',
    required: false, // Optional for manual entries
  },
  original_sale_id: {
    type: Schema.Types.ObjectId,
    ref: 'Sale',
    required: false, // Optional for manual entries
  },
  customer_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Optional for manual entries
  },
  salesman_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Optional for manual entries
  },
  
  // Manual Entry Support
  is_manual_entry: {
    type: Boolean,
    default: false,
  },
  customer_details: {
    name: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: false,
    }
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  return_reason: {
    type: String,
    required: false,
  },
  
  return_date: {
    type: Date,
    default: Date.now,
  },
  return_items: [SaleReturnItemSchema],
  subtotal: {
    type: Number,
    required: false, // Optional for manual entries
    min: 0,
  },
  tax_amount: {
    type: Number,
    required: false, // Optional for manual entries
    min: 0,
  },
  total_refund: {
    type: Number,
    required: false, // For invoice-based returns
    min: 0,
  },
  total_refund_amount: {
    type: Number,
    required: false, // For manual entries
    min: 0,
  },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Completed', 'Rejected'],
    default: 'Pending',
  },
  refund_method: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Store Credit', 'Exchange', 'Cheque', 'Credit Note'],
    required: true,
  },
  refund_status: {
    type: String,
    enum: ['Pending', 'Processed', 'Failed'],
    default: 'Pending',
  },
  notes: {
    type: String,
    trim: true,
  },
  admin_approval: {
    type: Boolean,
    default: false,
  },
  approved_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  approval_date: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Generate unique return number
SaleReturnSchema.pre('save', async function(next) {
  if (this.isNew && !this.return_number) {
    const count = await mongoose.model('SaleReturn').countDocuments();
    this.return_number = `RET${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Indexes for better query performance
SaleReturnSchema.index({ return_number: 1 });
SaleReturnSchema.index({ original_invoice_id: 1 });
SaleReturnSchema.index({ customer_id: 1 });
SaleReturnSchema.index({ return_date: -1 });
SaleReturnSchema.index({ status: 1 });

const SaleReturn: Model<ISaleReturn> = mongoose.models.SaleReturn || mongoose.model<ISaleReturn>('SaleReturn', SaleReturnSchema);

export default SaleReturn;