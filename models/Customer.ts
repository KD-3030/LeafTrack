import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  email?: string; // Now optional
  phone: string; // Now required
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string; // GST identification number
  pan?: string; // PAN number
  
  // Business information
  business_name?: string;
  business_type?: 'Individual' | 'Partnership' | 'Company' | 'LLP';
  
  // Credit information
  credit_limit: number;
  credit_days: number;
  outstanding_balance: number;
  
  // Metadata
  status: 'Active' | 'Inactive';
  tags?: string[]; // For categorization
  notes?: string;

  // Ownership and hierarchy mapping
  primary_executive_id?: mongoose.Types.ObjectId;
  secondary_executive_id?: mongoose.Types.ObjectId;
  created_by?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    sparse: true, // Allows multiple null/undefined values
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    unique: true, // Ensure unique phone numbers
  },
  address: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  pincode: {
    type: String,
    trim: true,
  },
  gstin: {
    type: String,
    trim: true,
    uppercase: true,
  },
  pan: {
    type: String,
    trim: true,
    uppercase: true,
  },
  business_name: {
    type: String,
    trim: true,
  },
  business_type: {
    type: String,
    enum: ['Individual', 'Partnership', 'Company', 'LLP'],
    default: 'Individual',
  },
  credit_limit: {
    type: Number,
    default: 0,
    min: 0,
  },
  credit_days: {
    type: Number,
    default: 30,
    min: 0,
  },
  outstanding_balance: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
  tags: [{
    type: String,
    trim: true,
  }],
  notes: {
    type: String,
    trim: true,
  },
  primary_executive_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  secondary_executive_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes
CustomerSchema.index({ name: 1 });
CustomerSchema.index({ state: 1 });
CustomerSchema.index({ status: 1 });

let Customer: Model<ICustomer>;

if (mongoose.models.Customer) {
  Customer = mongoose.models.Customer as Model<ICustomer>;
} else {
  Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
}

export default Customer;
