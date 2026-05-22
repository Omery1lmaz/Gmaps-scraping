import mongoose, { Schema, Document } from 'mongoose';

export interface ISequenceStep {
  templateId: string | mongoose.Types.ObjectId;
  delayHours: number;
}

export interface ISequence extends Document {
  name: string;
  steps: ISequenceStep[];
  isActive: boolean;
  userId: string;
  sendTimeStart: string;
  sendTimeEnd: string;
  activeDays: number[];
  maxPerDay: number;
  minDelayMinutes: number;
  skipReplied: boolean;
  autoStopOnReply: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SequenceStepSchema: Schema = new Schema({
  templateId: { type: Schema.Types.ObjectId, ref: 'Template', required: true },
  delayHours: { type: Number, required: true, default: 24 },
});

const SequenceSchema: Schema = new Schema({
  name: { type: String, required: true },
  steps: [SequenceStepSchema],
  isActive: { type: Boolean, default: true },
  userId: { type: String, required: true, index: true },
  sendTimeStart: { type: String, default: '09:00' },
  sendTimeEnd: { type: String, default: '18:00' },
  activeDays: { type: [Number], default: [1, 2, 3, 4, 5] },
  maxPerDay: { type: Number, default: 50 },
  minDelayMinutes: { type: Number, default: 5 },
  skipReplied: { type: Boolean, default: true },
  autoStopOnReply: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Sequence || mongoose.model<ISequence>('Sequence', SequenceSchema);
