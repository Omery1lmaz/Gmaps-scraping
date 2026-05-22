import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
  id: string;
  userId: string;
  content: string;
  leadId: string;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema: Schema = new Schema({
  _id: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  leadId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<INote>('Note', NoteSchema);