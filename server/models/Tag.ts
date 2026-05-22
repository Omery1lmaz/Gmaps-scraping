import mongoose, { Schema, Document } from 'mongoose';

export interface ITag extends Document {
  userId: string;
  name: string;
  color: string;
  createdAt: Date;
}

const TagSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  color: { type: String, default: '#3b82f6' },
  createdAt: { type: Date, default: Date.now },
});

TagSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model<ITag>('Tag', TagSchema);