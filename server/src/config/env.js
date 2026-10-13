import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load .env relative to server root with active environment profile support
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const activeEnv = process.env.NODE_ENV || 'development';

// Cascade load environment files: local .env takes priority, falling back to profile defaults
const candidateEnvPaths = [
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, `../../.env.${activeEnv}`),
  path.resolve(__dirname, '../../../.env.local'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, `../../../.env.${activeEnv}`),
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

export const config = {
  port: parseInt(
    process.env.PORT || (process.env.NODE_ENV === 'production' ? '10000' : '8080'),
    10
  ),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  frontendUrl: (() => {
    const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER) || Boolean(process.env.RENDER_SERVICE_ID);
    const raw = process.env.FRONTEND_URL?.replace('salahcopmanion', 'salahcompanion')?.replace(/\/+$/, '');
    if (raw && !raw.includes('netlify.app')) {
      if (isProduction && (raw.includes('localhost') || raw.includes('127.0.0.1'))) {
        return 'https://salah-companion.mdsaif.workers.dev';
      }
      return raw;
    }
    return isProduction
      ? 'https://salah-companion.mdsaif.workers.dev'
      : 'http://localhost:5173';
  })(),
  dbPath: process.env.DATABASE_PATH || path.resolve(__dirname, '../../database.sqlite'),
  databaseUrl: process.env.DATABASE_URL || '',
  directUrl: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  dbSsl: process.env.DATABASE_SSL !== 'false',

  // Supabase API Integration
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Prime window in minutes for on_time status (default 35 minutes)
  primeWindowMinutes: parseInt(process.env.PRIME_WINDOW_MINUTES || '35', 10),

  // Official HadithAPI Configuration
  hadithApiBaseUrl: process.env.HADITH_API_BASE_URL || 'https://hadithapi.com/api/hadiths',
  hadithApiKey: process.env.HADITH_API_KEY || '$2y$10$4CMfszpOeiq6YKTiOdHVQMQd7SKn6Pz88iVipYEVPy3y4q9yZJm',
  hadithCacheTtl: parseInt(process.env.HADITH_CACHE_TTL || '86400', 10), // 24 hours
  hadithCacheMaxSize: parseInt(process.env.HADITH_CACHE_MAX_SIZE || '500', 10),

  // JWT Secret
  jwtSecret: process.env.JWT_SECRET || 'super_secret_salah_companion_jwt_key_2026_secure',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  appUrl: (
    (process.env.APP_URL && !process.env.APP_URL.includes('salah-companion-ja12.onrender.com') ? process.env.APP_URL : '') ||
    (process.env.NODE_ENV === 'production' || process.env.RENDER ? 'https://salah-companion-z3i4.onrender.com' : `http://localhost:${process.env.PORT || '8080'}`)
  ).replace(/\/+$/, ''),

  // Google OAuth 2.0 Credentials
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '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',
  googleCallbackUrl: (
    process.env.GOOGLE_CALLBACK_URL && !process.env.GOOGLE_CALLBACK_URL.includes('salah-companion-ja12.onrender.com')
      ? process.env.GOOGLE_CALLBACK_URL
      : 'https://salah-companion-z3i4.onrender.com/api/auth/google/callback'
  ).replace(/\/+$/, ''),

  // Web Push VAPID Configuration
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || 'BK0MvxYd3ZDZoa05l-2e7qSdFFyUl1OVAtvwVIRf96sWxNAwbS7yifAb9gxTG5YDfHWUlXu_rGn5guso0O6pvvc',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || 'whUyPf51wecRJIeSIK9ul0-IW13FvsGzma7d_LxjO30',
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:salahcompanion786@gmail.com',
};
