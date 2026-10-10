import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env relative to server root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  dbPath: process.env.DATABASE_PATH || path.resolve(__dirname, '../../database.sqlite'),

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

  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || '5000'}`,

  // Email Configuration (SMTP / Transactional Service)
  emailService: process.env.EMAIL_SERVICE || 'gmail',
  emailHost: process.env.EMAIL_HOST || 'smtp.gmail.com',
  emailPort: parseInt(process.env.EMAIL_PORT || '465', 10),
  emailSecure: process.env.EMAIL_SECURE === 'true' || process.env.EMAIL_PORT === '465',
  emailUser: process.env.EMAIL_USER || 'salahcompanion786@gmail.com',
  emailPass: process.env.EMAIL_PASS || 'tcynoikdurlgcves',
  emailFrom: process.env.EMAIL_FROM || '"Salah Companion" <salahcompanion786@gmail.com>',

  // Verification Token Expiration & Rate Limiting
  verificationTokenTtlHours: parseInt(process.env.VERIFICATION_TOKEN_TTL_HOURS || '24', 10),
  verificationResendCooldownSec: parseInt(process.env.VERIFICATION_RESEND_COOLDOWN_SEC || '60', 10),

  // Google OAuth 2.0 Credentials
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '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',

  // Web Push VAPID Configuration
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || 'BK0MvxYd3ZDZoa05l-2e7qSdFFyUl1OVAtvwVIRf96sWxNAwbS7yifAb9gxTG5YDfHWUlXu_rGn5guso0O6pvvc',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || 'whUyPf51wecRJIeSIK9ul0-IW13FvsGzma7d_LxjO30',
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:salahcompanion786@gmail.com',
};
