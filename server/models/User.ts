import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  avatar?: string;
  createdAt: Date;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'inactive' | 'canceled' | 'expired';
  subscriptionExpiresAt: Date | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  leadsScrapedLimit: number;
  totalLeadsLimit: number;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now },
  plan: { type: String, enum: ['free', 'starter', 'pro', 'enterprise'], default: 'free' },
  subscriptionStatus: { type: String, enum: ['active', 'inactive', 'canceled', 'expired'], default: 'active' },
  subscriptionExpiresAt: { type: Date, default: null },
  stripeCustomerId: { type: String },
  stripeSubscriptionId: { type: String },
  leadsScrapedLimit: { type: Number, default: 20 },
  totalLeadsLimit: { type: Number, default: 100 },
});

export default mongoose.model<IUser>('User', UserSchema);
