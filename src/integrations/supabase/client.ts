// Supabase client configuration
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { ENV_CONFIG } from '@/config/env';

// Get environment variables with fallbacks
const SUPABASE_URL = ENV_CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = ENV_CONFIG.SUPABASE_ANON_KEY;

// Validate environment variables
if (!SUPABASE_URL) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);