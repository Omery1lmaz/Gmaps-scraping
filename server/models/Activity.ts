import mongoose, { Schema, Document } from 'mongoose';

export interface IActivity extends Document {
  userId: string;
  type: string;
  description: string;
  leadId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ActivitySchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  description: { type: String, required: true },
  leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IActivity>('Activity', ActivitySchema);