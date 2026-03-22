import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IInvitation extends Document {
  token: string;
  email: string;
  role: 'PrimaryExecutive' | 'SecondaryExecutive';
  invited_by: mongoose.Types.ObjectId;
  managerId?: mongoose.Types.ObjectId;
  invited_at: Date;
  expires_at: Date;
  used: boolean;
  used_at?: Date;
  user_id?: mongoose.Types.ObjectId;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['PrimaryExecutive', 'SecondaryExecutive'],
      required: true,
    },
    invited_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    invited_at: {
      type: Date,
      default: Date.now,
    },
    expires_at: {
      type: Date,
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
      index: true,
    },
    used_at: {
      type: Date,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

InvitationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

let Invitation: Model<IInvitation>;

if (mongoose.models.Invitation) {
  Invitation = mongoose.models.Invitation as Model<IInvitation>;
} else {
  Invitation = mongoose.model<IInvitation>('Invitation', InvitationSchema);
}

export default Invitation;