import mongoose, { Schema, Document } from 'mongoose';

export interface ISequenceState extends Document {
  sequenceId: string | mongoose.Types.ObjectId;
  leadId: string | mongoose.Types.ObjectId;
  currentStepIndex: number; // For backward compatibility
  currentStepId?: string;    // The unique ID of the current step in the sequence
  status: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'REPLIED' | 'STOPPED_BY_REPLY';
  nextRunAt?: Date; // Scheduled time for the next step
  lastSentAt?: Date; // Time when the last step message was sent
  lastError?: string;
  isForced?: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const SequenceStateSchema: Schema = new Schema({
  sequenceId: { type: Schema.Types.ObjectId, ref: 'Sequence', required: true },
  leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
  currentStepIndex: { type: Number, default: 0 },
  currentStepId: { type: String },
  status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'FAILED', 'REPLIED', 'STOPPED_BY_REPLY'], default: 'PENDING' },
  nextRunAt: { type: Date },
  lastSentAt: { type: Date },
  lastError: { type: String },
  isForced: { type: Boolean, default: false },
  userId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

SequenceStateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.SequenceState || mongoose.model<ISequenceState>('SequenceState', SequenceStateSchema);
