import mongoose, { Schema, Document } from 'mongoose';

export interface ITag extends Document {
  id: string;
  name: string;
  color: string;
}

const TagSchema: Schema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true, unique: true },
  color: { type: String, default: '#3b82f6' },
});

export default mongoose.model<ITag>('Tag', TagSchema);