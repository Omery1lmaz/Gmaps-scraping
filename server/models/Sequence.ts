import mongoose, { Schema, Document } from 'mongoose';

export interface ISequenceStep {
  templateId: string | mongoose.Types.ObjectId;
  delayHours: number; // Hours to wait before sending this step (0 for immediately after added or after previous)
}

export interface ISequence extends Document {
  name: string;
  steps: ISequenceStep[];
  isActive: boolean;
  userId: string;
  // Schedule settings
  sendTimeStart: string; // e.g. "09:00"
  sendTimeEnd: string;   // e.g. "18:00"
  activeDays: number[];  // 0=Sun, 1=Mon, ..., 6=Sat
  maxPerDay: number;     // Max messages per day
  minDelayMinutes: number; // Min delay between messages in minutes
  skipReplied: boolean;  // Skip leads that already replied
  autoStopOnReply: boolean; // Auto-stop sequence when lead replies
  nodes?: any[];        // React Flow Nodes
  edges?: any[];        // React Flow Edges
  autoEnrollEnabled?: boolean;
  autoEnrollCategory?: string;
  autoEnrollCity?: string;
  autoEnrollMinRating?: number;
  autoEnrollHasWebsite?: string; // 'all' | 'true' | 'false'
  autoEnrollHasPhone?: string;   // 'all' | 'true' | 'false'
  whatsappSessionId?: string;    // The WhatsApp account to send through
  aiReplyEnabled?: boolean;
  aiPrompt?: string;
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
  // Schedule settings
  sendTimeStart: { type: String, default: '09:00' },
  sendTimeEnd: { type: String, default: '18:00' },
  activeDays: { type: [Number], default: [1, 2, 3, 4, 5] }, // Mon-Fri
  maxPerDay: { type: Number, default: 50 },
  minDelayMinutes: { type: Number, default: 5 },
  skipReplied: { type: Boolean, default: true },
  autoStopOnReply: { type: Boolean, default: true },
  nodes: { type: Array, default: [] },
  edges: { type: Array, default: [] },
  // Auto enrollment settings
  autoEnrollEnabled: { type: Boolean, default: false },
  autoEnrollCategory: { type: String, default: '' },
  autoEnrollCity: { type: String, default: '' },
  autoEnrollMinRating: { type: Number, default: 0 },
  autoEnrollHasWebsite: { type: String, default: 'all' },
  autoEnrollHasPhone: { type: String, default: 'all' },
  whatsappSessionId: { type: String, default: null },
  aiReplyEnabled: { type: Boolean, default: false },
  aiPrompt: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

SequenceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Sequence || mongoose.model<ISequence>('Sequence', SequenceSchema);
