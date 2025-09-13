import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IAssignment extends Document {
  salesman_id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId; // Changed from batchId to productId
  quantity: number;
  sellingPricePerUnit: number; // Dynamic price for this assignment
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>({
  salesman_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Salesman ID is required'],
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
  },
  sellingPricePerUnit: {
    type: Number,
    required: [true, 'Selling price per unit is required'],
    min: [0, 'Selling price must be positive'],
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