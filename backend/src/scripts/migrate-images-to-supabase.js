import 'dotenv/config';
import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore DNS error
}
import mongoose from 'mongoose';
import storageService from '../services/StorageService.js';
import Link from '../models/Link.js';
import User from '../models/User.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('MigrateImagesToSupabase');

const isSupabaseStorageUrl = (url) => {
  return typeof url === 'string' && /\/storage\/v1\/object\/public\//i.test(url);
};

const runImageMigration = async () => {
  const isDryRun = process.argv.includes('--dry-run');
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  console.log(`Starting image asset migration to Supabase Storage... [Mode: ${isDryRun ? 'DRY-RUN' : 'LIVE'}]`);

  try {
    await mongoose.connect(mongoUri, { family: 4 });
    console.log(`Connected to MongoDB successfully.`);

    // Query links that have stored images or InsForge URLs
    const links = await Link.find({
      $or: [
        { imageIsStored: true },
        { image: { $regex: /insforge/i } },
        { imagePublicId: { $ne: '' } }
      ]
    });

    console.log(`Found ${links.length} Link documents to inspect for image migration.`);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const link of links) {
      const currentUrl = link.image;

      if (!currentUrl) {
        skippedCount++;
        continue;
      }

      // Check if image is already hosted on Supabase Storage
      if (isSupabaseStorageUrl(currentUrl)) {
        console.log(`[SKIP] Link ${link._id} is already hosted on Supabase Storage.`);
        skippedCount++;
        continue;
      }

      console.log(`\nProcessing Link ${link._id}: ${currentUrl}`);

      if (isDryRun) {
        console.log(`[DRY-RUN] Target migration for Link ${link._id}:`);
        console.log(`  - Original URL: ${currentUrl}`);
        console.log(`  - Will download binary asset and re-upload to Supabase Storage 'images' bucket.`);
        console.log(`  - Will update Link.image, Link.imagePublicId, Link.imageIsStored in MongoDB.`);
        successCount++;
        continue;
      }

      // Live mode execution
      try {
        const uploadRes = await storageService.uploadImageFromUrl(currentUrl, {
          userId: link.userId,
          linkId: link._id.toString()
        });

        if (!uploadRes.success || !uploadRes.url) {
          console.error(`[ERROR] Failed to upload image for Link ${link._id}:`, uploadRes.error?.message || uploadRes.error);
          errorCount++;
          continue;
        }

        const newPublicUrl = uploadRes.url;
        const newKey = uploadRes.key || uploadRes.public_id || '';

        await Link.updateOne(
          { _id: link._id },
          {
            $set: {
              image: newPublicUrl,
              imagePublicId: newKey,
              imageIsStored: true
            }
          }
        );

        console.log(`[SUCCESS] Migrated Link ${link._id} to Supabase Storage:`);
        console.log(`  New URL: ${newPublicUrl}`);
        console.log(`  New Object Key: ${newKey}`);
        successCount++;
      } catch (err) {
        console.error(`[ERROR] Exception migrating image for Link ${link._id}:`, err.message);
        errorCount++;
      }
    }

    console.log(`\n========================================`);
    console.log(`Image Migration Summary [Mode: ${isDryRun ? 'DRY-RUN' : 'LIVE'}]`);
    console.log(`Total inspectable links: ${links.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Skipped (already Supabase or empty): ${skippedCount}`);
    console.log(`Failed: ${errorCount}`);
    console.log(`========================================\n`);

  } catch (err) {
    console.error('Fatal image migration error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

runImageMigration();
