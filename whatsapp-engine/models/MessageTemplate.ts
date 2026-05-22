import mongoose, { Schema, Document } from 'mongoose';

export interface IMessageTemplate extends Document {
  id: string;
  userId: string;
  name: string;
  content: string;
  category: string;
  hasMedia?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  mimeType?: string;
  fileName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageTemplateSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String },
  hasMedia: { type: Boolean, default: false },
  mediaType: { type: String },
  mediaUrl: { type: String },
  mimeType: { type: String },
  fileName: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Template || mongoose.model<IMessageTemplate>('Template', MessageTemplateSchema);