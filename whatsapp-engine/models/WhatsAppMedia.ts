import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppMedia extends Document {
  id: string;
  messageId: string;
  fileName?: string;
  mimeType: string;
  size?: number;
  localPath: string;
  publicUrl: string;
  thumbnailPath?: string;
  createdAt: Date;
}

const WhatsAppMediaSchema: Schema = new Schema({
  _id: { type: String, required: true },
  messageId: { type: String, required: true, index: true },
  fileName: { type: String },
  mimeType: { type: String, required: true },
  size: { type: Number },
  localPath: { type: String, required: true },
  publicUrl: { type: String, required: true },
  thumbnailPath: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IWhatsAppMedia>('WhatsAppMedia', WhatsAppMediaSchema);