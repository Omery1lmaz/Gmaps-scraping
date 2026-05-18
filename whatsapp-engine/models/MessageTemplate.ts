import mongoose, { Schema, Document } from 'mongoose';

export interface IMessageTemplate extends Document {
  id: string;
  name: string;
  content: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageTemplateSchema: Schema = new Schema({
  name: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Template || mongoose.model<IMessageTemplate>('Template', MessageTemplateSchema);