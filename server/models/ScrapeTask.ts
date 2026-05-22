import mongoose, { Schema, Document } from 'mongoose';

export type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR';

export interface IScrapeTask extends Document {
  userId: string;
  city: string;
  district: string;
  neighborhood: string;
  category: string;
  status: TaskStatus;
  leadsFound: number;
  message?: string;
  nextPageToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScrapeTaskSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  city: { type: String, required: true },
  district: { type: String, required: true },
  neighborhood: { type: String, required: true },
  category: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'RUNNING', 'COMPLETED', 'ERROR'], 
    default: 'PENDING' 
  },
  leadsFound: { type: Number, default: 0 },
  message: { type: String },
  nextPageToken: { type: String },
}, { timestamps: true });

// Ensure unique tasks per combination per user to avoid duplicate queue items
ScrapeTaskSchema.index({ userId: 1, city: 1, district: 1, neighborhood: 1, category: 1 }, { unique: true });

export default mongoose.model<IScrapeTask>('ScrapeTask', ScrapeTaskSchema);
