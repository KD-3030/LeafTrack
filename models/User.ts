import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'Admin' | 'PrimaryExecutive' | 'SecondaryExecutive' | 'Customer';
  managerId?: mongoose.Types.ObjectId;
  approval_status: 'pending' | 'approved' | 'rejected';
  invited_by?: mongoose.Types.ObjectId;
  approved_by?: mongoose.Types.ObjectId;
  approval_date?: Date;
  rejection_reason?: string;
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
    enum: ['Admin', 'PrimaryExecutive', 'SecondaryExecutive', 'Customer'],
    required: [true, 'Role is required'],
  },
  managerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  approval_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  invited_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  approved_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  approval_date: {
    type: Date,
  },
  rejection_reason: {
    type: String,
    trim: true,
    maxlength: 500,
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

UserSchema.pre('save', function userRoleValidation(next) {
  if (this.role === 'SecondaryExecutive' && !this.managerId) {
    return next(new Error('SecondaryExecutive requires a managerId'));
  }

  if (this.role !== 'SecondaryExecutive' && this.managerId) {
    this.managerId = undefined;
  }

  next();
});

let User: Model<IUser>;

if (mongoose.models.User) {
  const existingModel = mongoose.models.User as Model<IUser>;
  const existingEnum = (existingModel.schema.path('role') as mongoose.SchemaType & { enumValues?: string[] })
    ?.enumValues || [];

  const requiredRoles = ['Admin', 'PrimaryExecutive', 'SecondaryExecutive', 'Customer'];
  const hasUpdatedEnum = requiredRoles.every((role) => existingEnum.includes(role));

  if (!hasUpdatedEnum) {
    // Hot reload can keep an old model with legacy enum values. Rebuild it safely.
    mongoose.deleteModel('User');
    User = mongoose.model<IUser>('User', UserSchema);
  } else {
    User = existingModel;
  }
} else {
  User = mongoose.model<IUser>('User', UserSchema);
}

export default User;