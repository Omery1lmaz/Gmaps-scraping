import mongoose, { Schema, Document } from 'mongoose';

export interface ITag extends Document {
  id: string;
  userId: string;
  name: string;
  color: string;
}

const TagSchema: Schema = new Schema({
  _id: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  color: { type: String, default: '#3b82f6' },
});

TagSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model<ITag>('Tag', TagSchema);