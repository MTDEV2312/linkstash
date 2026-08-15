import 'dotenv/config';
import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}
import mongoose from 'mongoose';
import User from '../models/User.js';

async function fixUserIds() {
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db;
  const linksColl = db.collection('links');
  const tagsColl = db.collection('tags');
  const usersColl = db.collection('users');

  const users = await usersColl.find({ supabaseId: { $exists: true, $ne: '' } }).toArray();
  console.log(`Found ${users.length} users with Supabase ID.`);

  for (const user of users) {
    const mongoId = user._id; // ObjectId
    const supabaseId = user.supabaseId; // String UUID
    console.log(`\nMigrating records for user: ${user.email}`);
    console.log(`  Target: ObjectId("${mongoId}") -> Supabase UUID "${supabaseId}"`);

    // Update Links matching ObjectId or string
    const linkRes = await linksColl.updateMany(
      { userId: mongoId },
      { $set: { userId: supabaseId } }
    );
    console.log(`  Updated ${linkRes.modifiedCount} Link documents matching ObjectId.`);

    // Update Tags matching ObjectId or string
    const tagRes = await tagsColl.updateMany(
      { userId: mongoId },
      { $set: { userId: supabaseId } }
    );
    console.log(`  Updated ${tagRes.modifiedCount} Tag documents matching ObjectId.`);
  }

  // Verify
  const sampleLinks = await linksColl.find({}).limit(5).toArray();
  console.log('\nSample 5 links after raw update:', sampleLinks.map(l => ({ title: l.title, userId: l.userId, userIdType: typeof l.userId })));

  const sampleTags = await tagsColl.find({}).toArray();
  console.log('\nSample tags after raw update:', sampleTags.map(t => ({ name: t.name, userId: t.userId, userIdType: typeof t.userId })));

  await mongoose.disconnect();
  console.log('\nFinished successfully!');
}

fixUserIds();
