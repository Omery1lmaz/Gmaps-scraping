import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppMessage extends Document {
  id: string;
  userId: string;
  sessionId?: string;
  whatsappMessageId?: string;
  chatId: string;
  leadId?: string;
  direction: string;
  status: string;
  type: string;
  body?: string;
  fromJid?: string;
  toJid?: string;
  authorJid?: string;
  quotedMessageId?: string;
  queueJobId?: string;
  error?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppMessageSchema: Schema = new Schema({
  _id: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  sessionId: { type: String, index: true },
  whatsappMessageId: { type: String, sparse: true },
  chatId: { type: String, required: true, index: true },
  leadId: { type: String, index: true },
  direction: { type: String, default: 'OUTGOING' },
  status: { type: String, default: 'QUEUED', index: true },
  type: { type: String, default: 'text' },
  body: { type: String },
  fromJid: { type: String },
  toJid: { type: String },
  authorJid: { type: String },
  quotedMessageId: { type: String },
  queueJobId: { type: String },
  error: { type: String },
  timestamp: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Compound index for chatId + timestamp
WhatsAppMessageSchema.index({ chatId: 1, timestamp: 1 });
WhatsAppMessageSchema.index({ userId: 1, sessionId: 1, whatsappMessageId: 1 }, { unique: true, sparse: true });

export default mongoose.model<IWhatsAppMessage>('WhatsAppMessage', WhatsAppMessageSchema);
