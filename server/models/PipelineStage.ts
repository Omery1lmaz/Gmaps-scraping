import mongoose, { Schema, Document } from 'mongoose';

export interface IPipelineStage extends Document {
  name: string;
  label: string;
  icon: string;
  color: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const PipelineStageSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true }, // e.g. 'NEW', 'SEARCHED'
  label: { type: String, required: true }, // e.g. 'New Lead'
  icon: { type: String, default: 'Plus' },
  color: { type: String, default: 'blue' },
  order: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model<IPipelineStage>('PipelineStage', PipelineStageSchema);
