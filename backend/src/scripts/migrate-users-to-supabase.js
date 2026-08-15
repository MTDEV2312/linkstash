import 'dotenv/config';
import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore DNS config error
}
import mongoose from 'mongoose';
import { supabaseAdmin } from '../config/supabase.js';
import User from '../models/User.js';
import Link from '../models/Link.js';
import Tag from '../models/Tag.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('MigrateUsersToSupabase');

const runMigration = async () => {
  const isDryRun = process.argv.includes('--dry-run');
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  console.log(`Starting user migration to Supabase Auth... [Mode: ${isDryRun ? 'DRY-RUN' : 'LIVE'}]`);

  try {
    await mongoose.connect(mongoUri, {
      family: 4
    });
    console.log(`Connected to MongoDB successfully.`);

    // Query users lacking supabaseId
    const users = await User.find({
      $or: [
        { supabaseId: { $exists: false } },
        { supabaseId: null },
        { supabaseId: '' }
      ]
    }).select('+password');

    console.log(`Found ${users.length} users to migrate.`);

    if (users.length === 0) {
      console.log('No users require migration.');
      await mongoose.disconnect();
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Fetch existing Supabase auth users to avoid duplicates
    let existingSupabaseUsers = [];
    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();
      if (!error && data?.users) {
        existingSupabaseUsers = data.users;
      }
    } catch (e) {
      logger.warn('Could not list existing Supabase users', { error: e.message });
    }

    for (const user of users) {
      const email = user.email ? user.email.toLowerCase() : '';
      const username = user.username || email.split('@')[0];
      const mongoUserId = user._id;

      if (!email) {
        console.warn(`[SKIP] User ${mongoUserId} has no email.`);
        errorCount++;
        continue;
      }

      console.log(`\nProcessing user: ${email} (MongoDB _id: ${mongoUserId})`);

      // Check if user already exists in Supabase Auth
      let matchedSupabaseUser = existingSupabaseUsers.find(
        u => u.email?.toLowerCase() === email
      );

      let supabaseId = matchedSupabaseUser?.id || null;

      if (isDryRun) {
        const linkCount = await Link.countDocuments({
          userId: { $in: [mongoUserId, mongoUserId.toString()] }
        });
        const tagCount = await Tag.countDocuments({
          userId: { $in: [mongoUserId, mongoUserId.toString()] }
        });
        console.log(`[DRY-RUN] Target updates for ${email}:`);
        console.log(`  - Create/Link Supabase Auth User ID: ${supabaseId || 'new-generated-uuid'}`);
        console.log(`  - Update MongoDB User.supabaseId`);
        console.log(`  - Update ${linkCount} Link document(s) userId string`);
        console.log(`  - Update ${tagCount} Tag document(s) userId string`);
        successCount++;
        continue;
      }

      // Live mode execution
      try {
        if (!supabaseId) {
          const createPayload = {
            email,
            email_confirm: true,
            user_metadata: { username }
          };

          if (user.password) {
            createPayload.password_hash = user.password;
          } else {
            createPayload.password = Math.random().toString(36).slice(2) + 'A1!';
          }

          const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser(createPayload);

          if (createError) {
            console.error(`[ERROR] Failed to create Supabase Auth user for ${email}:`, createError.message);
            errorCount++;
            continue;
          }

          supabaseId = createData.user.id;
          console.log(`Created Supabase Auth user with UUID: ${supabaseId}`);
        } else {
          console.log(`Matched existing Supabase Auth user UUID: ${supabaseId}`);
        }

        // Update MongoDB User.supabaseId
        await User.updateOne({ _id: mongoUserId }, { $set: { supabaseId } });
        console.log(`Updated User document _id ${mongoUserId} with supabaseId ${supabaseId}`);

        // Update Link documents (matching both raw BSON ObjectId and string)
        const linkResult = await mongoose.connection.db.collection('links').updateMany(
          { userId: { $in: [mongoUserId, mongoUserId.toString()] } },
          { $set: { userId: supabaseId } }
        );
        console.log(`Updated ${linkResult.modifiedCount} Link document(s).`);

        // Update Tag documents (matching both raw BSON ObjectId and string)
        const tagResult = await mongoose.connection.db.collection('tags').updateMany(
          { userId: { $in: [mongoUserId, mongoUserId.toString()] } },
          { $set: { userId: supabaseId } }
        );
        console.log(`Updated ${tagResult.modifiedCount} Tag document(s).`);

        successCount++;
      } catch (err) {
        console.error(`[ERROR] Exception migrating user ${email}:`, err.message);
        errorCount++;
      }
    }

    console.log(`\n========================================`);
    console.log(`Migration Summary [Mode: ${isDryRun ? 'DRY-RUN' : 'LIVE'}]`);
    console.log(`Total users processed: ${users.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed/Skipped: ${errorCount}`);
    console.log(`========================================\n`);

  } catch (err) {
    console.error('Fatal migration error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

runMigration();
