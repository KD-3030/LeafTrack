import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  manufacturingCost: number; // Static manufacturing cost for this product
  totalStock: number; // Total quantity available in inventory
  hsn_code: string; // HSN code for GST compliance
  gst_rate: number; // GST rate percentage (5, 12, 18, 28)
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  manufacturingCost: {
    type: Number,
    required: [true, 'Manufacturing cost is required'],
    min: [0, 'Manufacturing cost must be positive'],
  },
  totalStock: {
    type: Number,
    required: [true, 'Total stock is required'],
    min: [0, 'Total stock must be non-negative'],
    default: 0,
  },
  hsn_code: {
    type: String,
    required: [true, 'HSN code is required'],
    trim: true,
  },
  gst_rate: {
    type: Number,
    required: [true, 'GST rate is required'],
    enum: [0, 5, 12, 18, 28],
    default: 18,
  },
}, {
  timestamps: true,
});

let Product: Model<IProduct>;

if (mongoose.models.Product) {
  Product = mongoose.models.Product as Model<IProduct>;
} else {
  Product = mongoose.model<IProduct>('Product', ProductSchema);
}

export default Product;