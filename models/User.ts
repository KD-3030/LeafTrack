import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'Admin' | 'Salesman' | 'Customer';
  phone?: string;
  address?: string;
  state?: string; // For GST calculation (CGST+SGST vs IGST)
  gstin?: string; // GST identification number
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['Admin', 'Salesman', 'Customer'],
    required: [true, 'Role is required'],
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  gstin: {
    type: String,
    trim: true,
    uppercase: true,
  },
}, {
  timestamps: true,
});

let User: Model<IUser>;

if (mongoose.models.User) {
  User = mongoose.models.User as Model<IUser>;
} else {
  User = mongoose.model<IUser>('User', UserSchema);
}

export default User;