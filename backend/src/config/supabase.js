import { createClient } from '@supabase/supabase-js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('SupabaseConfig');

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:8000';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'dummy-anon-key';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'dummy-service-role-key';

if (!process.env.SUPABASE_URL) {
  logger.warn('SUPABASE_URL environment variable is not defined, falling back to default localhost URL');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export default supabase;
