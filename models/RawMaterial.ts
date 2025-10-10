import mongoose, { Schema, Document } from 'mongoose';

// Interface for Raw Material
export interface IRawMaterial extends Document {
  name: string;
  description?: string;
  unit: 'kg' | 'liter' | 'piece' | 'meter' | 'gram';
  base_cost_per_unit: number; // Cost per unit
  current_stock?: number;
  min_stock_level?: number;
  supplier?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const RawMaterialSchema = new Schema<IRawMaterial>({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  description: {
    type: String,
    trim: true,
  },
  unit: {
    type: String,
    enum: ['kg', 'liter', 'piece', 'meter', 'gram'],
    required: true,
  },
  base_cost_per_unit: {
    type: Number,
    required: true,
    min: 0,
  },
  current_stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  min_stock_level: {
    type: Number,
    default: 0,
    min: 0,
  },
  supplier: {
    type: String,
    trim: true,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// Indexes
// Note: 'name' index is not needed here as it's already created by unique: true
RawMaterialSchema.index({ is_active: 1 });

// Clear model cache
if (mongoose.models.RawMaterial) {
  delete mongoose.models.RawMaterial;
}

const RawMaterial = mongoose.model<IRawMaterial>('RawMaterial', RawMaterialSchema);

export default RawMaterial;
