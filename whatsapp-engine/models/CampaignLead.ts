import mongoose, { Schema, Document } from 'mongoose';

export interface ICampaignLead extends Document {
  id: string;
  campaignId: string;
  leadId: string;
  status: string;
  error?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignLeadSchema: Schema = new Schema({
  _id: { type: String, required: true },
  campaignId: { type: String, required: true },
  leadId: { type: String, required: true },
  status: { type: String, default: 'PENDING' },
  error: { type: String },
  sentAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Compound unique index
CampaignLeadSchema.index({ campaignId: 1, leadId: 1 }, { unique: true });

export default mongoose.model<ICampaignLead>('CampaignLead', CampaignLeadSchema);