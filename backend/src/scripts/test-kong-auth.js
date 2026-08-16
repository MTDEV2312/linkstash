import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing with URL:', url);
console.log('Anon key exists:', !!anonKey, 'prefix:', anonKey?.substring(0, 15));
console.log('Secret key exists:', !!secretKey, 'prefix:', secretKey?.substring(0, 15));

// Test 1: with Anon key
console.log('\n--- Test 1: signInWithPassword using Anon Key ---');
const clientWithAnon = createClient(url, anonKey || 'dummy-anon-key', { auth: { persistSession: false } });
const { data: d1, error: e1 } = await clientWithAnon.auth.signInWithPassword({
  email: 'email',
  password: 'wrongpasswordfortest'
});
console.log('Anon client result:', { error: e1?.message, status: e1?.status });

// Test 2: with dummy key
console.log('\n--- Test 2: signInWithPassword using dummy key ---');
const clientDummy = createClient(url, 'dummy-key', { auth: { persistSession: false } });
const { data: d2, error: e2 } = await clientDummy.auth.signInWithPassword({
  email: 'email',
  password: 'wrongpasswordfortest'
});
console.log('Dummy client result:', { error: e2?.message, status: e2?.status });
