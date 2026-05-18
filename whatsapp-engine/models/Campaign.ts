import mongoose, { Schema, Document } from 'mongoose';

export interface ICampaign extends Document {
  id: string;
  name: string;
  description?: string;
  status: string;
  filters?: any;
  templateId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema: Schema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  status: { type: String, default: 'DRAFT' },
  filters: { type: Schema.Types.Mixed },
  templateId: { type: String, required: true },
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<ICampaign>('Campaign', CampaignSchema);