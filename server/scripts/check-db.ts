import { getMongoConnection, User, Template, Sequence } from '../dbClient';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  await getMongoConnection();
  console.log('--- USERS ---');
  const users = await User.find({});
  users.forEach(u => {
    console.log(`User: ID=${u._id}, Email=${u.email}, Name=${u.name}`);
  });

  console.log('\n--- TEMPLATES ---');
  const templates = await Template.find({});
  templates.forEach(t => {
    console.log(`Template: ID=${t._id}, Name="${t.name}", userId="${t.userId}"`);
  });

  console.log('\n--- SEQUENCES ---');
  const sequences = await Sequence.find({});
  sequences.forEach(s => {
    console.log(`Sequence: ID=${s._id}, Name="${s.name}", userId="${s.userId}"`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
