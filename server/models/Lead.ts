import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
  externalId: string;
  name: string;
  rating?: number;
  reviews?: number;
  category?: string;
  address?: string;
  city?: string;
  phone?: string;
  website?: string;
  url: string;
  // Detail fields
  openingHours?: Record<string, string>;
  isOpenNow?: boolean;
  plusCode?: string;
  priceLevel?: string;
  serviceOptions?: string[];
  description?: string;
  totalPhotos?: number;
  createdAt: Date;
}

const LeadSchema: Schema = new Schema({
  externalId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  rating: { type: Number },
  reviews: { type: Number },
  category: { type: String },
  address: { type: String },
  city: { type: String, index: true },
  phone: { type: String },
  website: { type: String },
  url: { type: String, required: true },
  // Detail fields
  openingHours: { type: Schema.Types.Mixed },
  isOpenNow: { type: Boolean },
  plusCode: { type: String },
  priceLevel: { type: String },
  serviceOptions: [{ type: String }],
  description: { type: String },
  totalPhotos: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<ILead>('Lead', LeadSchema);
