import 'dotenv/config';
import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}
import mongoose from 'mongoose';
import Link from '../models/Link.js';

async function updateUrls() {
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  console.log('Connected to MongoDB.');

  const oldPrefix = 'http://192.168.100.116:8000';
  const newPrefix = 'https://supabase.mathiast.me';

  const linksToUpdate = await Link.find({ image: { $regex: '^http://192.168.100.116:8000' } });
  console.log(`Found ${linksToUpdate.length} links with local IP storage URLs.`);

  for (const link of linksToUpdate) {
    link.image = link.image.replace(oldPrefix, newPrefix);
    await link.save();
  }

  console.log(`Updated ${linksToUpdate.length} links to use ${newPrefix}.`);

  const sample = await Link.find({ imageIsStored: true }).limit(3).lean();
  console.log('Sample updated image URLs:', sample.map(s => s.image));

  await mongoose.disconnect();
}

updateUrls();
