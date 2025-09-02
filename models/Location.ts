import mongoose, { Document, Schema } from 'mongoose';

export interface ILocation extends Document {
  salesman_id: mongoose.Types.ObjectId;
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ILocation>({
  salesman_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Salesman ID is required'],
    index: true,
  },
  latitude: {
    type: Number,
    required: [true, 'Latitude is required'],
    min: [-90, 'Latitude must be between -90 and 90'],
    max: [90, 'Latitude must be between -90 and 90'],
  },
  longitude: {
    type: Number,
    required: [true, 'Longitude is required'],
    min: [-180, 'Longitude must be between -180 and 180'],
    max: [180, 'Longitude must be between -180 and 180'],
  },
  timestamp: {
    type: Date,
    required: [true, 'Timestamp is required'],
    default: Date.now,
  },
  accuracy: {
    type: Number,
    min: [0, 'Accuracy must be positive'],
  },
  address: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
LocationSchema.index({ salesman_id: 1, timestamp: -1 });
LocationSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 }); // 7 days in seconds

export default mongoose.models.Location || mongoose.model<ILocation>('Location', LocationSchema);
