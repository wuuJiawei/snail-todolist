// Environment configuration with validation
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!SUPABASE_URL) {
  throw new Error('🚨 VITE_SUPABASE_URL is required but not defined. Please check your .env file.');
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('🚨 VITE_SUPABASE_ANON_KEY is required but not defined. Please check your .env file.');
}

export const ENV_CONFIG = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
};

// 调试信息（仅开发环境）
if (import.meta.env.DEV) {
  console.log('🔧 Environment Config Status:', {
    SUPABASE_URL: ENV_CONFIG.SUPABASE_URL ? 'SET ✅' : 'MISSING ❌',
    SUPABASE_ANON_KEY: ENV_CONFIG.SUPABASE_ANON_KEY ? 'SET ✅' : 'MISSING ❌',
    NODE_ENV: import.meta.env.MODE || process.env.NODE_ENV,
    BUILD_ENV: import.meta.env.PROD ? 'PRODUCTION' : 'DEVELOPMENT'
  });
}