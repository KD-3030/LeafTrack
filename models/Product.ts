import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  price: number;
  cost_price: number; // For profit calculation
  stock_quantity: number;
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
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be positive'],
  },
  cost_price: {
    type: Number,
    required: [true, 'Cost price is required'],
    min: [0, 'Cost price must be positive'],
  },
  stock_quantity: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock quantity must be non-negative'],
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