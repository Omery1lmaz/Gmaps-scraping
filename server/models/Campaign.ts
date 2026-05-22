import mongoose, { Schema, Document } from 'mongoose';

export interface ICampaign extends Document {
  name: string;
  templateId: string;
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  filters: {
    city?: string;
    category?: string;
    minRating?: string;
  };
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema: Schema = new Schema({
  name: { type: String, required: true },
  templateId: { type: String, required: true },
  status: { type: String, required: true, default: 'DRAFT' },
  filters: {
    city: { type: String },
    category: { type: String },
    minRating: { type: String },
  },
  userId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

CampaignSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<ICampaign>('Campaign', CampaignSchema);
