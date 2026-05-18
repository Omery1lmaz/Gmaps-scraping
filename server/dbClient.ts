import mongoose from 'mongoose';
import Lead from './models/Lead';
import User from './models/User';
import Tag from './models/Tag';
import Note from './models/Note';
import Activity from './models/Activity';
import AIGeneration from './models/AIGeneration';
import Campaign from './models/Campaign';
import WhatsAppChat from './models/WhatsAppChat';
import WhatsAppMessage from './models/WhatsAppMessage';
import WhatsAppSession from './models/WhatsAppSession';
import WhatsAppSyncState from './models/WhatsAppSyncState';
import WhatsAppContact from './models/WhatsAppContact';
import WhatsAppMedia from './models/WhatsAppMedia';
import Template from './models/Template';
import Sequence from './models/Sequence';
import SequenceState from './models/SequenceState';

let isConnected = false;

export function getMongoConnection() {
  const MONGODB_URI = process.env.MONGODB_URL || 'mongodb://localhost:27017/gmaps-lead-scraper';
  
  if (!isConnected) {
    mongoose.connect(MONGODB_URI)
      .then(() => {
        console.log('Connected to MongoDB');
        isConnected = true;
      })
      .catch(err => {
        console.error('MongoDB connection error:', err);
      });
  }
  
  return mongoose;
}

// Export models for convenience
export {
  Lead,
  User,
  Tag,
  Note,
  Activity,
  AIGeneration,
  Campaign,
  WhatsAppChat,
  WhatsAppMessage,
  WhatsAppSession,
  WhatsAppSyncState,
  WhatsAppContact,
  WhatsAppMedia,
  Template,
  Sequence,
  SequenceState
};