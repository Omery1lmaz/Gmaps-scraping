import mongoose, { Schema, Document } from 'mongoose';

export interface ISequenceStep {
  templateId: string | mongoose.Types.ObjectId;
  delayHours: number; // Hours to wait before sending this step (0 for immediately after added or after previous)
}

export interface ISequence extends Document {
  name: string;
  steps: ISequenceStep[];
  isActive: boolean;
  userId?: string;
  // Schedule settings
  sendTimeStart: string; // e.g. "09:00"
  sendTimeEnd: string;   // e.g. "18:00"
  activeDays: number[];  // 0=Sun, 1=Mon, ..., 6=Sat
  maxPerDay: number;     // Max messages per day
  minDelayMinutes: number; // Min delay between messages in minutes
  skipReplied: boolean;  // Skip leads that already replied
  autoStopOnReply: boolean; // Auto-stop sequence when lead replies
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
  userId: { type: String },
  // Schedule settings
  sendTimeStart: { type: String, default: '09:00' },
  sendTimeEnd: { type: String, default: '18:00' },
  activeDays: { type: [Number], default: [1, 2, 3, 4, 5] }, // Mon-Fri
  maxPerDay: { type: Number, default: 50 },
  minDelayMinutes: { type: Number, default: 5 },
  skipReplied: { type: Boolean, default: true },
  autoStopOnReply: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

SequenceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Sequence || mongoose.model<ISequence>('Sequence', SequenceSchema);
