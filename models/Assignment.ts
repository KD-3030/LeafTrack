import mongoose, { Document, Schema } from 'mongoose';

export interface IAssignment extends Document {
  salesman_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>({
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
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
  },
}, {
  timestamps: true,
});

export default mongoose.models.Assignment || mongoose.model<IAssignment>('Assignment', AssignmentSchema);