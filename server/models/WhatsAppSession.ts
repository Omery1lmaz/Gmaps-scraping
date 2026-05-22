import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppSession extends Document {
  id: string;
  userId: string;
  sessionName?: string;
  status: string;
  phoneNumber?: string;
  pushName?: string;
  lastErrorMessage?: string;
  lastErrorAt?: Date;
  lastConnected?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppSessionSchema: Schema = new Schema({
  _id: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  sessionName: { type: String, default: 'WhatsApp Hesabı' },
  status: { type: String, default: 'DISCONNECTED' },
  phoneNumber: { type: String },
  pushName: { type: String },
  lastErrorMessage: { type: String },
  lastErrorAt: { type: Date },
  lastConnected: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IWhatsAppSession>('WhatsAppSession', WhatsAppSessionSchema);
