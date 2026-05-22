import mongoose, { Schema, Document } from 'mongoose';

export interface IScrapeCategory extends Document {
  userId: string;
  name: string;
  createdAt: Date;
}

const ScrapeCategorySchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

ScrapeCategorySchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model<IScrapeCategory>('ScrapeCategory', ScrapeCategorySchema);
