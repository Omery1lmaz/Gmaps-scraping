import mongoose, { Schema, Document } from 'mongoose';

export interface ICalendlyIntegration extends Document {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt?: Date;
  organizationUri?: string;
  userUri?: string;
  selectedEventType?: {
    name: string;
    uri: string;
    schedulingUrl: string;
  };
  schedulingUrl?: string;
  connectedAt: Date;
  syncStatus: 'synced' | 'failed' | 'idle';
}

const CalendlyIntegrationSchema: Schema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  expiresAt: { type: Date },
  organizationUri: { type: String },
  userUri: { type: String },
  selectedEventType: {
    name: { type: String },
    uri: { type: String },
    schedulingUrl: { type: String }
  },
  schedulingUrl: { type: String },
  connectedAt: { type: Date, default: Date.now },
  syncStatus: { type: String, enum: ['synced', 'failed', 'idle'], default: 'idle' }
});

export default mongoose.models.CalendlyIntegration || mongoose.model<ICalendlyIntegration>('CalendlyIntegration', CalendlyIntegrationSchema);
