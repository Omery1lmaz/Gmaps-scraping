import mongoose, { Schema, Document } from 'mongoose';

export interface ITag extends Document {
  name: string;
  color: string;
  createdAt: Date;
}

const TagSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  color: { type: String, default: '#3b82f6' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<ITag>('Tag', TagSchema);