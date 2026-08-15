import dotenv from 'dotenv';
dotenv.config();

import { supabase, supabaseAdmin } from '../config/supabase.js';

async function testSupabase() {
  console.log('--- Testing Supabase Connection ---');
  console.log('Supabase URL:', process.env.SUPABASE_URL);

  let allSuccess = true;

  // 1. Test Auth Admin API
  try {
    console.log('\n1. Testing Auth Service...');
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 5 });
    if (usersError) {
      console.error('❌ Auth API Error:', usersError.message);
      allSuccess = false;
    } else {
      console.log('✅ Auth API Connected! Total users listed in test slice:', usersData.users.length);
    }
  } catch (err) {
    console.error('❌ Auth Connection Exception:', err.message);
    allSuccess = false;
  }

  // 2. Test Storage API
  try {
    console.log('\n2. Testing Storage Service...');
    const { data: buckets, error: storageError } = await supabaseAdmin.storage.listBuckets();
    if (storageError) {
      console.error('❌ Storage API Error:', storageError.message);
      allSuccess = false;
    } else {
      console.log('✅ Storage API Connected! Existing buckets:', buckets.map(b => b.name));
      
      // Check if 'images' bucket exists, if not create it
      const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'images';
      const imagesBucketExists = buckets.some(b => b.name === bucketName);
      if (!imagesBucketExists) {
        console.log(`ℹ️ Bucket "${bucketName}" not found. Creating bucket "${bucketName}" (public: true)...`);
        const { data: createData, error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 10485760 // 10MB
        });
        if (createError) {
          console.warn(`⚠️ Could not auto-create bucket "${bucketName}":`, createError.message);
        } else {
          console.log(`✅ Bucket "${bucketName}" created successfully!`);
        }
      } else {
        console.log(`✅ Bucket "${bucketName}" exists and is accessible.`);
      }
    }
  } catch (err) {
    console.error('❌ Storage Connection Exception:', err.message);
    allSuccess = false;
  }

  // 3. Test JWKS URL endpoint
  if (process.env.SUPABASE_JWKS_URL) {
    try {
      console.log('\n3. Testing JWKS Endpoint...');
      const response = await fetch(process.env.SUPABASE_JWKS_URL);
      if (response.ok) {
        const jwks = await response.json();
        console.log('✅ JWKS Endpoint Reachable! Keys found:', jwks.keys ? jwks.keys.length : 'N/A');
      } else {
        console.log(`ℹ️ JWKS Endpoint HTTP ${response.status} (Status Text: ${response.statusText})`);
      }
    } catch (err) {
      console.warn('⚠️ JWKS Fetch Exception:', err.message);
    }
  }

  console.log('\n-----------------------------------');
  if (allSuccess) {
    console.log('🎉 Supabase Self-Hosted is fully operational and connected!');
  } else {
    console.log('⚠️ Some tests failed. Please review error messages above.');
  }
}

testSupabase();
