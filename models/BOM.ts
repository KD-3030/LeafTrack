import mongoose, { Schema, Document } from 'mongoose';

// Interface for BOM Material Item
export interface IBOMMaterial {
  material_id: mongoose.Types.ObjectId;
  material_name: string; // Denormalized for easier querying
  quantity: number;
  unit: string;
  cost_per_unit: number; // Cost at the time of BOM creation
  total_cost: number; // quantity * cost_per_unit
}

// Interface for BOM
export interface IBOM extends Document {
  product_id: mongoose.Types.ObjectId;
  product_name: string; // Denormalized for easier querying
  version: number; // Version number for tracking changes
  materials: IBOMMaterial[];
  total_manufacturing_cost: number; // Sum of all material costs
  overhead_percentage: number; // Additional overhead (labor, utilities, etc.)
  final_cost: number; // total_manufacturing_cost + overhead
  notes?: string;
  status: 'draft' | 'active' | 'archived';
  created_by: mongoose.Types.ObjectId;
  created_by_name: string;
  is_current: boolean; // Only one BOM per product should be current
  created_at: Date;
  updated_at: Date;
}

const BOMMaterialSchema = new Schema<IBOMMaterial>({
  material_id: {
    type: Schema.Types.ObjectId,
    ref: 'RawMaterial',
    required: true,
  },
  material_name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.001,
  },
  unit: {
    type: String,
    required: true,
  },
  cost_per_unit: {
    type: Number,
    required: true,
    min: 0,
  },
  total_cost: {
    type: Number,
    required: true,
    min: 0,
  },
}, { _id: false });

const BOMSchema = new Schema<IBOM>({
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  },
  product_name: {
    type: String,
    required: true,
    trim: true,
  },
  version: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
  },
  materials: {
    type: [BOMMaterialSchema],
    required: true,
    validate: {
      validator: function(materials: IBOMMaterial[]) {
        return materials.length > 0;
      },
      message: 'BOM must have at least one material',
    },
  },
  total_manufacturing_cost: {
    type: Number,
    required: true,
    min: 0,
  },
  overhead_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  final_cost: {
    type: Number,
    required: true,
    min: 0,
  },
  notes: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft',
    index: true,
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  created_by_name: {
    type: String,
    required: true,
  },
  is_current: {
    type: Boolean,
    default: false,
    index: true,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// Compound indexes
BOMSchema.index({ product_id: 1, version: -1 });
BOMSchema.index({ product_id: 1, is_current: 1 });
BOMSchema.index({ status: 1, is_current: 1 });

// Pre-save hook to calculate costs
BOMSchema.pre('save', function(next) {
  // Calculate total manufacturing cost from materials
  this.total_manufacturing_cost = this.materials.reduce((sum, material) => {
    return sum + material.total_cost;
  }, 0);
  
  // Calculate final cost with overhead
  const overheadAmount = (this.total_manufacturing_cost * this.overhead_percentage) / 100;
  this.final_cost = this.total_manufacturing_cost + overheadAmount;
  
  next();
});

// Clear model cache
if (mongoose.models.BOM) {
  delete mongoose.models.BOM;
}

const BOM = mongoose.model<IBOM>('BOM', BOMSchema);

export default BOM;
