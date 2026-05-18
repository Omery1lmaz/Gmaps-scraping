import mongoose, { Schema, Document } from 'mongoose';

export interface IMeeting extends Document {
  workspaceId: string;
  title: string;
  date: Date;
  relatedLeads: mongoose.Types.ObjectId[];
  notes: string;
  outcome?: 'SUCCESS' | 'FAILED' | 'PENDING';
}

const MeetingSchema: Schema = new Schema({
  workspaceId: { type: String, default: 'default' },
  title: { type: String, required: true },
  date: { type: Date, required: true },
  relatedLeads: [{ type: Schema.Types.ObjectId, ref: 'Lead' }],
  notes: { type: String },
  outcome: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING'], default: 'PENDING' },
});

export default mongoose.model<IMeeting>('Meeting', MeetingSchema);
