import mongoose, { Schema, Document } from 'mongoose';

export interface IAIGeneration {
  userId: string;
  leadId: mongoose.Types.ObjectId;
  originalText: string;
  generatedText: string;
  prompt: string;
  provider: string;
  model: string;
  tone?: string;
  tokensUsed?: number;
  spamScore?: number;
  createdAt: Date;
}

const AIGenerationSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
  originalText: { type: String, required: true },
  generatedText: { type: String, required: true },
  prompt: { type: String, required: true },
  provider: { type: String, required: true },
  model: { type: String, required: true },
  tone: { type: String },
  tokensUsed: { type: Number },
  spamScore: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IAIGeneration>('AIGeneration', AIGenerationSchema);