import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPayment extends Document {
  invoice_id: mongoose.Types.ObjectId;
  customer_id: mongoose.Types.ObjectId;
  salesman_id?: mongoose.Types.ObjectId;
  
  // Payment Details
  payment_date: Date;
  amount_paid: number;
  payment_method: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' | 'Credit Card' | 'Debit Card' | 'Other';
  
  // Bank/Transaction Details
  transaction_id?: string;
  bank_reference?: string;
  cheque_number?: string;
  cheque_date?: Date;
  bank_name?: string;
  
  // Status and Notes
  status: 'Pending' | 'Confirmed' | 'Failed' | 'Cancelled';
  notes?: string;
  
  // Reconciliation
  reconciled: boolean;
  reconciled_date?: Date;
  reconciled_by?: mongoose.Types.ObjectId;
  
  // Tracking
  created_by?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  invoice_id: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice',
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
  },
  payment_date: {
    type: Date,
    default: Date.now,
  },
  amount_paid: {
    type: Number,
    required: true,
    min: 0,
  },
  payment_method: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Credit Card', 'Debit Card', 'Other'],
    required: true,
  },
  transaction_id: {
    type: String,
    trim: true,
  },
  bank_reference: {
    type: String,
    trim: true,
  },
  cheque_number: {
    type: String,
    trim: true,
  },
  cheque_date: {
    type: Date,
  },
  bank_name: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Failed', 'Cancelled'],
    default: 'Pending',
  },
  notes: {
    type: String,
    trim: true,
  },
  reconciled: {
    type: Boolean,
    default: false,
  },
  reconciled_date: {
    type: Date,
  },
  reconciled_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
PaymentSchema.index({ invoice_id: 1 });
PaymentSchema.index({ customer_id: 1, payment_date: -1 });
PaymentSchema.index({ payment_date: -1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ reconciled: 1 });

let Payment: Model<IPayment>;

if (mongoose.models.Payment) {
  Payment = mongoose.models.Payment as Model<IPayment>;
} else {
  Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
}

export default Payment;
