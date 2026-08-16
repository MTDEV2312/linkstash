import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('SupabaseConfig');

const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.mathiast.me';
const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

if (!process.env.SUPABASE_URL) {
  logger.warn('SUPABASE_URL environment variable is not defined, using default: https://supabase.mathiast.me');
}

if (!supabaseAnonKey) {
  logger.error('CRITICAL: SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY / SUPABASE_SECRET_KEY) is not defined in environment variables! Auth requests will fail with Kong 401 Unauthorized.');
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
