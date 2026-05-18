import mongoose, { Schema, Document } from 'mongoose';

export interface ISequenceState extends Document {
  sequenceId: string | mongoose.Types.ObjectId;
  leadId: string | mongoose.Types.ObjectId;
  currentStepIndex: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'REPLIED';
  nextRunAt?: Date;
  lastError?: string;
  isForced?: boolean;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SequenceStateSchema: Schema = new Schema({
  sequenceId: { type: Schema.Types.ObjectId, ref: 'Sequence', required: true },
  leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
  currentStepIndex: { type: Number, default: 0 },
  status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'FAILED', 'REPLIED'], default: 'PENDING' },
  nextRunAt: { type: Date },
  lastError: { type: String },
  isForced: { type: Boolean, default: false },
  userId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});



export default mongoose.models.SequenceState || mongoose.model<ISequenceState>('SequenceState', SequenceStateSchema);
