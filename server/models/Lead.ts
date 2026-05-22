import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
  userId: string;
  externalId: string;
  name: string;
  businessName?: string;
  rating?: number;
  reviews?: number;
  reviewCount?: number;
  category?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  website?: string;
  url: string;
  status?: string;
  // Detail fields
  openingHours?: Record<string, string>;
  isOpenNow?: boolean;
  plusCode?: string;
  priceLevel?: string;
  serviceOptions?: string[];
  description?: string;
  totalPhotos?: number;
  // Dashboard fields
  tags?: Array<{ id: string; name: string; color: string }>;
  notes?: Array<{ id: string; content: string; createdAt: Date }>;
  activities?: Array<{ id: string; type: string; description: string; createdAt: Date }>;
  messageLogs?: Array<{ id: string; content: string; direction: 'INCOMING' | 'OUTGOING'; status: string; createdAt: Date }>;
  assignedTo?: { id: string; name: string; email: string; avatar: string };
  leadSequenceStates?: Array<{ id: string; status: string; sequence: { id: string; name: string } }>;
  aiQualityScore?: number;
  aiResponseLikelihood?: number;
  aiOutreachFit?: string;
  aiAnalysisSummary?: string;
  _count?: { notes: number };
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  externalId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  businessName: { type: String },
  rating: { type: Number, index: true },
  reviews: { type: Number },
  reviewCount: { type: Number },
  category: { type: String, index: true },
  address: { type: String },
  city: { type: String, index: true },
  country: { type: String, index: true },
  phone: { type: String },
  website: { type: String },
  url: { type: String, required: true },
  status: { type: String, index: true },
  // Detail fields
  openingHours: { type: Schema.Types.Mixed },
  isOpenNow: { type: Boolean, index: true },
  plusCode: { type: String },
  priceLevel: { type: String },
  serviceOptions: [{ type: String }],
  description: { type: String },
  totalPhotos: { type: Number },
  // Dashboard fields
  tags: [{ id: String, name: String, color: String }],
  notes: [{ id: String, content: String, createdAt: Date }],
  activities: [{ id: String, type: String, description: String, createdAt: Date }],
  messageLogs: [{ id: String, content: String, direction: String, status: String, createdAt: Date }],
  assignedTo: { id: String, name: String, email: String, avatar: String },
  leadSequenceStates: [{ id: String, status: String, sequence: { id: String, name: String } }],
  aiQualityScore: { type: Number },
  aiResponseLikelihood: { type: Number },
  aiOutreachFit: { type: String },
  aiAnalysisSummary: { type: String },
  _count: { notes: Number },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

LeadSchema.index({ userId: 1, externalId: 1 }, { unique: true });

// Update updatedAt before saving
LeadSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<ILead>('Lead', LeadSchema);
