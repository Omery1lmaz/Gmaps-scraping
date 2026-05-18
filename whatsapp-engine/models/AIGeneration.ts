import mongoose, { Schema } from 'mongoose';

export interface IAIGeneration {
  _id: string;
  id: string;
  leadId: string;
  originalText: string;
  generatedText: string;
  prompt: string;
  provider: string;
  aiModel: string;
  tone: string;
  tokensUsed?: number;
  spamScore?: number;
  createdAt: Date;
}

const AIGenerationSchema: Schema = new Schema({
  _id: { type: String, required: true },
  leadId: { type: String, required: true },
  originalText: { type: String, required: true },
  generatedText: { type: String, required: true },
  prompt: { type: String, required: true },
  provider: { type: String, required: true },
  aiModel: { type: String, required: true },
  tone: { type: String, required: true },
  tokensUsed: { type: Number },
  spamScore: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IAIGeneration>('AIGeneration', AIGenerationSchema);