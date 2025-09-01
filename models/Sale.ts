import mongoose, { Document, Schema } from 'mongoose';

export interface ISale extends Document {
  assignment_id: mongoose.Types.ObjectId;
  salesman_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  quantity_sold: number;
  sale_date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema = new Schema<ISale>({
  assignment_id: {
    type: Schema.Types.ObjectId,
    ref: 'Assignment',
    required: [true, 'Assignment ID is required'],
  },
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
  quantity_sold: {
    type: Number,
    required: [true, 'Quantity sold is required'],
    min: [1, 'Quantity sold must be at least 1'],
  },
  sale_date: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema);