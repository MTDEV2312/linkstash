import 'dotenv/config';
import { supabase, supabaseAdmin } from '../config/supabase.js';

async function testLogin() {
  console.log('Testing Supabase login and token validation...');
  
  // Try login with agusmaty23@gmail.com or list users
  const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  console.log('Registered Supabase users:', users?.users?.map(u => ({ id: u.id, email: u.email })));

  if (users?.users?.length > 0) {
    const testUser = users.users[0];
    console.log(`Found test user: ${testUser.email}`);
  }
}

testLogin();
