import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
  id: string;
  userId: string;
  externalId?: string;
  googleMapsUrl?: string;
  businessName: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  status: string;
  source?: string;
  aiQualityScore?: number;
  aiResponseLikelihood?: number;
  aiOutreachFit?: string;
  aiAnalysisSummary?: string;
  assignedToId?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  externalId: { type: String, sparse: true },
  googleMapsUrl: { type: String },
  businessName: { type: String, required: true },
  phone: { type: String },
  website: { type: String },
  address: { type: String },
  city: { type: String, index: true },
  category: { type: String },
  rating: { type: Number },
  reviewCount: { type: Number },
  status: { type: String, default: 'NEW', index: true },
  source: { type: String, default: 'GMAPS_SCRAPER' },
  aiQualityScore: { type: Number },
  aiResponseLikelihood: { type: Number },
  aiOutreachFit: { type: String },
  aiAnalysisSummary: { type: String },
  assignedToId: { type: String },
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

LeadSchema.index({ userId: 1, externalId: 1 }, { unique: true, sparse: true });

export default mongoose.model<ILead>('Lead', LeadSchema);
