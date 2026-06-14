import mongoose, { Schema, Document } from 'mongoose';

export interface ISequenceStep {
  id?: string;
  type: 'SEND_MESSAGE' | 'BOOK_MEETING' | 'CONDITION' | 'AI_INTENT' | 'TAG';
  templateId?: string | mongoose.Types.ObjectId;
  templates?: {
    templateId: string | mongoose.Types.ObjectId;
    weight: number;
  }[];
  delayHours: number;
  meetingTitle?: string;
  meetingDuration?: number;
  branches?: {
    intent: string;
    nextStepId: string;
  }[];
  tagId?: string;
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
  id: { type: String },  // React Flow node ID — used for graph navigation
  type: {
    type: String,
    enum: ['TRIGGER', 'SEND_MESSAGE', 'BOOK_MEETING', 'CONDITION', 'AI_INTENT', 'TAG'],
    default: 'SEND_MESSAGE'
  },
  templateId: { type: Schema.Types.ObjectId, ref: 'Template', required: false },
  templates: [{
    templateId: { type: Schema.Types.ObjectId, ref: 'Template' },
    weight: { type: Number, default: 1 }
  }],
  delayHours: { type: Number, required: true, default: 24 },
  waitType: { type: String, enum: ['duration', 'until_time', 'weekdays'], default: 'duration' },
  untilTime: { type: String, default: '09:00' },
  meetingTitle: { type: String },
  meetingDuration: { type: Number, default: 60 },
  branches: [{
    intent: { type: String },
    nextStepId: { type: String }
  }],
  tagId: { type: String },
  nextStepId: { type: String },  // Links this step to the next in the visual graph
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
