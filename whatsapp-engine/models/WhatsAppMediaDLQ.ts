import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppMediaDLQ extends Document {
  id: string;
  jobId: string;
  sessionId: string;
  mediaType: string;
  failureReason: string;
  stackTrace?: string;
  retryCount: number;
  lastKnownLatency?: number;
  queueLagSnapshot?: number;
  timestamp: Date;
}

const WhatsAppMediaDLQSchema: Schema = new Schema({
  _id: { type: String, required: true },
  jobId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, index: true },
  mediaType: { type: String, required: true },
  failureReason: { type: String, required: true },
  stackTrace: { type: String },
  retryCount: { type: Number, required: true },
  lastKnownLatency: { type: Number },
  queueLagSnapshot: { type: Number },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model<IWhatsAppMediaDLQ>('WhatsAppMediaDLQ', WhatsAppMediaDLQSchema);
