import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function cleanupIndexes() {
  const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/gmaps-lead-scraper';
  
  console.log('Connecting to MongoDB:', MONGODB_URL);
  await mongoose.connect(MONGODB_URL);
  
  const db = mongoose.connection.db;
  if (!db) {
    console.error('Failed to get database connection');
    process.exit(1);
  }

  const collections = [
    { name: 'whatsappcontacts', index: 'jid_1' },
    { name: 'whatsappchats', index: 'jid_1' },
    { name: 'whatsappsessions', index: 'userId_1' },
    { name: 'whatsappmessages', index: 'userId_1_sessionId_1_whatsappMessageId_1' }
  ];
  
  for (const col of collections) {
    console.log(`\nChecking collection: ${col.name}`);
    const collection = db.collection(col.name);
    const indexes = await collection.indexes();
    
    console.log('Current indexes:', indexes.map(i => `${i.name} (unique: ${!!i.unique})`).join(', '));
    
    const targetIndex = indexes.find(i => i.name === col.index);
    
    if (targetIndex) {
      console.log(`Found index '${col.index}' on ${col.name}. Dropping it to ensure non-unique version...`);
      try {
        await collection.dropIndex(col.index);
        console.log(`Successfully dropped '${col.index}' on ${col.name}`);
      } catch (err) {
        console.error(`Error dropping index on ${col.name}:`, err);
      }
    } else {
      console.log(`Index '${col.index}' not found on ${col.name}.`);
    }
  }

  console.log('\nCleanup completed.');
  await mongoose.disconnect();
}

cleanupIndexes().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
