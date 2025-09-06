import mongoose, { Document, Schema, Model } from 'mongoose';

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

let Assignment: Model<IAssignment>;

if (mongoose.models.Assignment) {
  Assignment = mongoose.models.Assignment as Model<IAssignment>;
} else {
  Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);
}

export default Assignment;