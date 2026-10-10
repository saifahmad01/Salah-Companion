-- ============================================================================
-- Salah Companion - Complete Supabase PostgreSQL Production Schema
-- Compatible with PostgreSQL 14+, Supabase, and Render
-- ============================================================================

-- Enable required cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to automatically maintain updated_at timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 1. Users Table (Authentication, GPS location, and Preferences)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL DEFAULT 'Salah Companion User',
  email TEXT UNIQUE,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'USER',
  prayer_calculation_method TEXT NOT NULL DEFAULT 'Karachi',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  is_email_verified BOOLEAN NOT NULL DEFAULT false,
  verification_token_hash TEXT,
  token_expires_at TIMESTAMPTZ,
  last_verification_sent_at TIMESTAMPTZ,
  google_id TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_token_hash ON users(verification_token_hash);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

DROP TRIGGER IF EXISTS set_timestamp_users ON users;
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- 2. Pending Registrations (Single-use SHA-256 tokens for email verification)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pending_registrations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  prayer_calculation_method TEXT NOT NULL DEFAULT 'Karachi',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_email ON pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_token ON pending_registrations(token_hash);

DROP TRIGGER IF EXISTS set_timestamp_pending ON pending_registrations;
CREATE TRIGGER set_timestamp_pending
BEFORE UPDATE ON pending_registrations
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- 3. Prayer Logs (Daily completion status, prime window evaluation, notes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prayer_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prayer_name TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  prayer_start_time TEXT,
  prayer_end_time TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, prayer_name, date)
);

CREATE INDEX IF NOT EXISTS idx_prayer_logs_user_date ON prayer_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_prayer_logs_status ON prayer_logs(status);

DROP TRIGGER IF EXISTS set_timestamp_prayer_logs ON prayer_logs;
CREATE TRIGGER set_timestamp_prayer_logs
BEFORE UPDATE ON prayer_logs
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- 4. Deed Logs (Quran reading, dhikr, daily Islamic deeds)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deed_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  deed_type TEXT NOT NULL,
  title TEXT,
  completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, deed_type, date)
);

CREATE INDEX IF NOT EXISTS idx_deed_logs_user_date ON deed_logs(user_id, date);

-- ----------------------------------------------------------------------------
-- 5. Notification Preferences (Per-user prayer reminders & calculation method)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY,
  prayer_start_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_30min_enabled BOOLEAN NOT NULL DEFAULT true,
  browser_push_enabled BOOLEAN NOT NULL DEFAULT false,
  fajr_enabled BOOLEAN NOT NULL DEFAULT true,
  dhuhr_enabled BOOLEAN NOT NULL DEFAULT true,
  asr_enabled BOOLEAN NOT NULL DEFAULT true,
  maghrib_enabled BOOLEAN NOT NULL DEFAULT true,
  isha_enabled BOOLEAN NOT NULL DEFAULT true,
  latitude DOUBLE PRECISION DEFAULT 28.6139,
  longitude DOUBLE PRECISION DEFAULT 77.2090,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  calculation_method TEXT DEFAULT 'Karachi',
  madhab TEXT DEFAULT 'Hanafi',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_timestamp_notif_prefs ON notification_preferences;
CREATE TRIGGER set_timestamp_notif_prefs
BEFORE UPDATE ON notification_preferences
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- 6. Web Push Subscriptions (Browser Push registration tokens & keys)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

DROP TRIGGER IF EXISTS set_timestamp_push_subs ON push_subscriptions;
CREATE TRIGGER set_timestamp_push_subs
BEFORE UPDATE ON push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- 7. Notification Logs (Delivery History & Idempotent Deduplication)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  prayer_name TEXT NOT NULL,
  date TEXT NOT NULL,
  reminder_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  prayer_time TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  push_sent BOOLEAN NOT NULL DEFAULT false,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, prayer_name, date, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_notif_logs_user_date ON notification_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_notif_logs_user_unread ON notification_logs(user_id, is_read);
