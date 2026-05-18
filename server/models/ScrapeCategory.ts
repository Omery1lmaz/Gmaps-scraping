import mongoose, { Schema, Document } from 'mongoose';

export interface IScrapeCategory extends Document {
  name: string;
  createdAt: Date;
}

const ScrapeCategorySchema: Schema = new Schema({
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IScrapeCategory>('ScrapeCategory', ScrapeCategorySchema);
