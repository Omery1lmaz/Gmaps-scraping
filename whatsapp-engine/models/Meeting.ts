import mongoose, { Schema, Document } from 'mongoose';

export interface IMeeting extends Document {
  userId: string;
  title: string;
  date: Date;
  relatedLeads: mongoose.Types.ObjectId[];
  notes: string;
  outcome?: 'SUCCESS' | 'FAILED' | 'PENDING';
  externalEventId?: string;
  provider?: string;
  location?: string;
  meetingLink?: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}

const MeetingSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  date: { type: Date, required: true },
  relatedLeads: [{ type: Schema.Types.ObjectId, ref: 'Lead' }],
  notes: { type: String },
  outcome: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING'], default: 'PENDING' },
  externalEventId: { type: String },
  provider: { type: String },
  location: { type: String },
  meetingLink: { type: String },
  status: { type: String, enum: ['PENDING', 'CONFIRMED', 'CANCELLED'], default: 'PENDING' }
});

export default mongoose.models.Meeting || mongoose.model<IMeeting>('Meeting', MeetingSchema);
