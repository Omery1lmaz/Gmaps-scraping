import mongoose, { Schema, Document } from 'mongoose';

export interface IMessageLog extends Document {
  id: string;
  userId: string;
  leadId: string;
  campaignLeadId?: string;
  aiGenerationId?: string;
  direction: string;
  status: string;
  content: string;
  error?: string;
  messageId?: string;
  queueJobId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageLogSchema: Schema = new Schema({
  _id: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  leadId: { type: String, required: true },
  campaignLeadId: { type: String },
  aiGenerationId: { type: String },
  direction: { type: String, default: 'OUTGOING' },
  status: { type: String, required: true },
  content: { type: String, required: true },
  error: { type: String },
  messageId: { type: String },
  queueJobId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IMessageLog>('MessageLog', MessageLogSchema);
