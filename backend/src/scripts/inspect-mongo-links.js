import 'dotenv/config';
import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}
import mongoose from 'mongoose';
import Link from '../models/Link.js';
import User from '../models/User.js';

async function inspectData() {
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  console.log('Connected to MongoDB.');

  const users = await User.find({}).lean();
  console.log('Users in Mongo:', users.map(u => ({ _id: u._id, username: u.username, email: u.email, supabaseId: u.supabaseId })));

  const totalLinks = await Link.countDocuments({});
  console.log('Total Links in Mongo:', totalLinks);

  const sampleLinks = await Link.find({}).limit(5).lean();
  console.log('Sample 5 links:', sampleLinks.map(l => ({ _id: l._id, title: l.title, userId: l.userId, userIdType: typeof l.userId })));

  // Group links by userId
  const distinctUserIds = await Link.distinct('userId');
  console.log('Distinct userIds in links collection:', distinctUserIds);

  await mongoose.disconnect();
}

inspectData();
