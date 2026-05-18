import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
  content: string;
  leadId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema: Schema = new Schema({
  content: { type: String, required: true },
  leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update updatedAt on save
NoteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<INote>('Note', NoteSchema);