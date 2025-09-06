import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  email: string;
  phone?: string;
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
  
  // Metadata
  status: 'Active' | 'Inactive';
  tags?: string[]; // For categorization
  notes?: string;
  
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
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
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
}, {
  timestamps: true,
});

// Indexes
CustomerSchema.index({ email: 1 });
CustomerSchema.index({ name: 1 });
CustomerSchema.index({ state: 1 });
CustomerSchema.index({ status: 1 });

export default mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
