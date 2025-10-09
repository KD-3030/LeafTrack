import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  product_id?: mongoose.Types.ObjectId;
  product_name: string;
  quantity: number;
  unit: 'kg' | 'box' | 'bag';
  price_per_unit: number;
  total_price: number;
}

export interface IOrder extends Document {
  // Order Identification
  order_number: string;
  order_date: Date;
  
  // Salesman Information
  salesman_id: mongoose.Types.ObjectId;
  salesman_name: string;
  salesman_contact?: string;
  
  // Customer Information
  customer_id?: mongoose.Types.ObjectId;
  customer_name: string;
  customer_contact: string;
  customer_address?: string;
  customer_gstin?: string;
  customer_email?: string;
  
  // Order Items
  items: IOrderItem[];
  
  // Pricing
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  
  // Approval Status
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: Date;
  reviewed_at?: Date;
  reviewed_by?: mongoose.Types.ObjectId;
  reviewer_name?: string;
  
  // Admin Modifications
  admin_modified: boolean;
  admin_notes?: string;
  original_total?: number; // Store original amount before admin modification
  
  // Additional Details
  delivery_date?: Date;
  payment_terms?: string;
  notes?: string;
  rejection_reason?: string;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
  },
  product_name: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01,
  },
  unit: {
    type: String,
    enum: ['kg', 'box', 'bag'],
    required: true,
  },
  price_per_unit: {
    type: Number,
    required: true,
    min: 0,
  },
  total_price: {
    type: Number,
    required: true,
    min: 0,
  },
}, { _id: false });

const OrderSchema = new Schema<IOrder>({
  order_number: {
    type: String,
    unique: true,
    index: true,
  },
  order_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  
  // Salesman Information
  salesman_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  salesman_name: {
    type: String,
    required: true,
    trim: true,
  },
  salesman_contact: {
    type: String,
    trim: true,
  },
  
  // Customer Information
  customer_id: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
  },
  customer_name: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  customer_contact: {
    type: String,
    required: true,
    trim: true,
  },
  customer_address: {
    type: String,
    trim: true,
  },
  customer_gstin: {
    type: String,
    trim: true,
  },
  customer_email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  
  // Order Items
  items: {
    type: [OrderItemSchema],
    required: true,
    validate: {
      validator: function(items: IOrderItem[]) {
        return items.length > 0;
      },
      message: 'Order must have at least one item',
    },
  },
  
  // Pricing
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  tax_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  tax_amount: {
    type: Number,
    default: 0,
    min: 0,
  },
  discount_amount: {
    type: Number,
    default: 0,
    min: 0,
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0,
  },
  
  // Approval Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  submitted_at: {
    type: Date,
    default: Date.now,
  },
  reviewed_at: {
    type: Date,
  },
  reviewed_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewer_name: {
    type: String,
    trim: true,
  },
  
  // Admin Modifications
  admin_modified: {
    type: Boolean,
    default: false,
  },
  admin_notes: {
    type: String,
    trim: true,
  },
  original_total: {
    type: Number,
    min: 0,
  },
  
  // Additional Details
  delivery_date: {
    type: Date,
  },
  payment_terms: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  rejection_reason: {
    type: String,
    trim: true,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// Auto-generate order number
OrderSchema.pre('save', async function(next) {
  if (!this.order_number) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Find the latest order number for this month
    const latestOrder = await mongoose.model('Order').findOne({
      order_number: new RegExp(`^ORD-${year}${month}-`)
    }).sort({ order_number: -1 });
    
    let sequence = 1;
    if (latestOrder && latestOrder.order_number) {
      const lastSequence = parseInt(latestOrder.order_number.split('-')[2]);
      sequence = lastSequence + 1;
    }
    
    this.order_number = `ORD-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }
  next();
});

// Indexes for performance
OrderSchema.index({ salesman_id: 1, status: 1 });
OrderSchema.index({ customer_name: 1, status: 1 });
OrderSchema.index({ order_date: -1 });
OrderSchema.index({ submitted_at: -1 });

// Clear the model cache before defining the model
if (mongoose.models.Order) {
  delete mongoose.models.Order;
}

const Order = mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
