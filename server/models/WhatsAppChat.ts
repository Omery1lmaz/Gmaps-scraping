import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppChat extends Document {
  id: string;
  userId: string;
  sessionId?: string;
  jid: string;
  name?: string;
  isGroup: boolean;
  isArchived: boolean;
  isPinned: boolean;
  isMuted: boolean;
  unreadCount: number;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  contactId?: string;
  leadId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppChatSchema: Schema = new Schema({
  _id: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  sessionId: { type: String, index: true },
  jid: { type: String, required: true },
  name: { type: String },
  isGroup: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  isMuted: { type: Boolean, default: false },
  unreadCount: { type: Number, default: 0 },
  lastMessageAt: { type: Date, index: true },
  lastMessagePreview: { type: String },
  contactId: { type: String, index: true },
  leadId: { type: String, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

WhatsAppChatSchema.index({ userId: 1, sessionId: 1, jid: 1 }, { unique: true });

export default mongoose.model<IWhatsAppChat>('WhatsAppChat', WhatsAppChatSchema);
