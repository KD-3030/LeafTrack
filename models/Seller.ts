import mongoose, { Schema, Document } from 'mongoose';

export interface ISeller extends Document {
  name: string;
  gstin?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;  upi_id?: string;  notes?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const SellerSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  gstin: {
    type: String,
    trim: true,
    uppercase: true,
  },
  contact_person: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
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
  bank_name: {
    type: String,
    trim: true,
  },
  account_number: {
    type: String,
    trim: true,
  },
  ifsc_code: {
    type: String,
    trim: true,
    uppercase: true,
  },
  upi_id: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  is_active: {
    type: Boolean,
    default: true,
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

// Indexes
SellerSchema.index({ name: 1 });
SellerSchema.index({ gstin: 1 });
SellerSchema.index({ is_active: 1 });

// Pre-save hook to update timestamp
SellerSchema.pre<ISeller>('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Delete cached model to ensure schema updates are applied
if (mongoose.models.Seller) {
  delete mongoose.models.Seller;
}

export default mongoose.model<ISeller>('Seller', SellerSchema);
