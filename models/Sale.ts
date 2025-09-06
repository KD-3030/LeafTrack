import mongoose, { Document, Schema } from 'mongoose';

export interface ISale extends Document {
  assignment_id: mongoose.Types.ObjectId;
  salesman_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  customer_id?: mongoose.Types.ObjectId; // Reference to customer
  quantity_sold: number;
  unit_price: number; // Actual selling price
  discount_percentage: number; // Discount given
  total_amount: number; // Final amount after discount
  sale_date: Date;
  payment_method?: 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Credit';
  invoice_generated: boolean; // Whether invoice has been generated
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema = new Schema<ISale>({
  assignment_id: {
    type: Schema.Types.ObjectId,
    ref: 'Assignment',
    required: [true, 'Assignment ID is required'],
  },
  salesman_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Salesman ID is required'],
  },
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required'],
  },
  customer_id: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
  },
  quantity_sold: {
    type: Number,
    required: [true, 'Quantity sold is required'],
    min: [1, 'Quantity sold must be at least 1'],
  },
  unit_price: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price must be positive'],
  },
  discount_percentage: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%'],
  },
  total_amount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount must be positive'],
  },
  sale_date: {
    type: Date,
    default: Date.now,
  },
  payment_method: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Credit'],
    default: 'Cash',
  },
  invoice_generated: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema);