import mongoose, { Schema, Document } from 'mongoose';

export interface ITemplate extends Document {
  name: string;
  content: string;
  variables: string[]; // e.g. ['businessName', 'category', 'city']
  userId: string;
  hasMedia?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  mimeType?: string;
  fileName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSchema: Schema = new Schema({
  name: { type: String, required: true },
  content: { type: String, required: true },
  variables: [{ type: String }],
  userId: { type: String, required: true, index: true },
  hasMedia: { type: Boolean, default: false },
  mediaType: { type: String },
  mediaUrl: { type: String },
  mimeType: { type: String },
  fileName: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

TemplateSchema.pre('save', function(this: any, next) {
  this.updatedAt = new Date();
  
  // Extract variables inside {} brackets automatically
  const matches = this.content.match(/{(.*?)}/g);
  if (matches) {
    this.variables = matches.map((m: string) => m.replace(/[{}]/g, '').trim());
  } else {
    this.variables = [];
  }
  
  next();
});

export default mongoose.models.Template || mongoose.model<ITemplate>('Template', TemplateSchema);
