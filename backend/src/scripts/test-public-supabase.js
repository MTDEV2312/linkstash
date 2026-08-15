import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

console.log('Testing connection to public Supabase URL:', url);

const client = createClient(url, key, {
  auth: { persistSession: false }
});

async function runTest() {
  try {
    const { data, error } = await client.auth.admin.listUsers();
    if (error) {
      console.error('Supabase Auth error:', error);
    } else {
      console.log('Successfully connected to public Supabase!');
      console.log(`Found ${data.users.length} users registered:`, data.users.map(u => u.email));
    }
  } catch (err) {
    console.error('Network / Exception:', err.message);
  }
}

runTest();
