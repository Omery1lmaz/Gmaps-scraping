import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppContact extends Document {
  id: string;
  jid: string;
  phone?: string;
  name?: string;
  pushName?: string;
  shortName?: string;
  isBusiness: boolean;
  profilePicUrl?: string;
  leadId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppContactSchema: Schema = new Schema({
  _id: { type: String, required: true },
  jid: { type: String, required: true, unique: true },
  phone: { type: String, index: true },
  name: { type: String },
  pushName: { type: String },
  shortName: { type: String },
  isBusiness: { type: Boolean, default: false },
  profilePicUrl: { type: String },
  leadId: { type: String, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IWhatsAppContact>('WhatsAppContact', WhatsAppContactSchema);