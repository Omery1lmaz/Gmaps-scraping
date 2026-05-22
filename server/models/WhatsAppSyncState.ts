import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppSyncState extends Document {
  id: string;
  userId: string;
  sessionId?: string;
  status: string;
  totalChats: number;
  syncedChats: number;
  totalMessages: number;
  lastChatName?: string;
  error?: string;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppSyncStateSchema: Schema = new Schema({
  _id: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  sessionId: { type: String, index: true },
  status: { type: String, default: 'IDLE' },
  totalChats: { type: Number, default: 0 },
  syncedChats: { type: Number, default: 0 },
  totalMessages: { type: Number, default: 0 },
  lastChatName: { type: String },
  error: { type: String },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IWhatsAppSyncState>('WhatsAppSyncState', WhatsAppSyncStateSchema);
