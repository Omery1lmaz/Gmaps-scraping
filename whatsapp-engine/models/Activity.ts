import mongoose, { Schema, Document } from 'mongoose';

export interface IActivity extends Document {
  id: string;
  type: string;
  description: string;
  leadId: string;
  createdAt: Date;
}

const ActivitySchema: Schema = new Schema({
  _id: { type: String, required: true },
  type: { type: String, required: true },
  description: { type: String, required: true },
  leadId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IActivity>('Activity', ActivitySchema);