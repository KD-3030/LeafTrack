import mongoose, { Document, Schema } from 'mongoose';

export interface ICompanySettings extends Document {
  // Company Information
  company_name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  
  // Contact Information
  phone: string;
  email: string;
  website?: string;
  
  // Tax Information
  gstin: string;
  pan: string;
  cin?: string; // Corporate Identification Number
  
  // Banking Information
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  account_holder_name?: string;
  
  // Invoice Settings
  invoice_prefix: string; // e.g., "INV"
  invoice_counter: number; // Auto-increment counter
  invoice_terms: string; // Terms and conditions
  
  // Business Settings
  financial_year_start: Date;
  default_credit_days: number;
  currency: string;
  
  // Logo and Branding
  logo_url?: string;
  signature_url?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const CompanySettingsSchema = new Schema<ICompanySettings>({
  company_name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    trim: true,
  },
  country: {
    type: String,
    default: 'India',
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
  },
  website: {
    type: String,
    trim: true,
  },
  gstin: {
    type: String,
    required: [true, 'GSTIN is required'],
    trim: true,
    uppercase: true,
  },
  pan: {
    type: String,
    required: [true, 'PAN is required'],
    trim: true,
    uppercase: true,
  },
  cin: {
    type: String,
    trim: true,
    uppercase: true,
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
  account_holder_name: {
    type: String,
    trim: true,
  },
  invoice_prefix: {
    type: String,
    default: 'INV',
    trim: true,
    uppercase: true,
  },
  invoice_counter: {
    type: Number,
    default: 1,
    min: 1,
  },
  invoice_terms: {
    type: String,
    default: 'Payment is due within 30 days from the date of invoice.',
  },
  financial_year_start: {
    type: Date,
    default: () => new Date(new Date().getFullYear(), 3, 1), // April 1st
  },
  default_credit_days: {
    type: Number,
    default: 30,
    min: 0,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  logo_url: String,
  signature_url: String,
}, {
  timestamps: true,
});

export default mongoose.models.CompanySettings || mongoose.model<ICompanySettings>('CompanySettings', CompanySettingsSchema);
