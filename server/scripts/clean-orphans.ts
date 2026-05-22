import { getMongoConnection, Template, Sequence } from '../dbClient';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  console.log('Connecting to MongoDB...');
  await getMongoConnection();
  console.log('Connected.');

  const orphanQuery = {
    $or: [
      { userId: { $exists: false } },
      { userId: null },
      { userId: 'undefined' },
      { userId: '' }
    ]
  };

  console.log('Fetching legacy/orphaned templates...');
  const templates = await Template.find(orphanQuery);
  console.log(`Found ${templates.length} orphaned templates.`);

  console.log('Fetching legacy/orphaned sequences...');
  const sequences = await Sequence.find(orphanQuery);
  console.log(`Found ${sequences.length} orphaned sequences.`);

  if (templates.length > 0) {
    console.log('Deleting orphaned templates...');
    const result = await Template.deleteMany(orphanQuery);
    console.log(`Successfully deleted ${result.deletedCount} templates.`);
  }

  if (sequences.length > 0) {
    console.log('Deleting orphaned sequences...');
    const result = await Sequence.deleteMany(orphanQuery);
    console.log(`Successfully deleted ${result.deletedCount} sequences.`);
  }

  console.log('Database cleanup completed successfully.');
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
