import mongoose from 'mongoose';

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://mongo:27017/gmaps-lead-scraper';

let isConnected = false;

export async function connectMongo(): Promise<void> {
  if (isConnected) return;

  try {
    await mongoose.connect(MONGODB_URL);
    isConnected = true;
    console.log('[MongoDB] Connected successfully');
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    throw error;
  }
}

export const getMongoConnection = () => mongoose.connection;

export default mongoose;
