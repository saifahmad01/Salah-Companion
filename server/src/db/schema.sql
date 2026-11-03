-- ============================================================================
-- Salah Companion Database Schema (SQLite)
-- Optimized for lightweight, production-ready local/embedded deployment
-- ============================================================================

-- 1. Users table (Supports initial 10-20 users, extensible for scale)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Salah Companion User',
  email TEXT UNIQUE,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Prayer Logs table
-- Tracks prayer completions, timestamps, and evaluated statuses (on_time, late, missed)
CREATE TABLE IF NOT EXISTS prayer_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  prayer_name TEXT NOT NULL,                  -- 'fajr', 'dhuhr', 'asr', 'maghrib', 'isha'
  date TEXT NOT NULL,                         -- 'YYYY-MM-DD'
  status TEXT NOT NULL,                       -- 'on_time', 'late', 'missed'
  prayer_start_time TEXT,                     -- ISO-8601 string
  prayer_end_time TEXT,                       -- ISO-8601 string
  logged_at TEXT NOT NULL,                    -- ISO-8601 string
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, prayer_name, date)
);

-- 3. Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_prayer_logs_user_date ON prayer_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_prayer_logs_status ON prayer_logs(status);

-- 4. Notification Preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY,
  prayer_start_enabled INTEGER NOT NULL DEFAULT 1,
  reminder_30min_enabled INTEGER NOT NULL DEFAULT 1,
  browser_push_enabled INTEGER NOT NULL DEFAULT 0,
  fajr_enabled INTEGER NOT NULL DEFAULT 1,
  dhuhr_enabled INTEGER NOT NULL DEFAULT 1,
  asr_enabled INTEGER NOT NULL DEFAULT 1,
  maghrib_enabled INTEGER NOT NULL DEFAULT 1,
  isha_enabled INTEGER NOT NULL DEFAULT 1,
  latitude REAL DEFAULT 28.6139,
  longitude REAL DEFAULT 77.2090,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  calculation_method TEXT DEFAULT 'Karachi',
  madhab TEXT DEFAULT 'Hanafi',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Web Push Subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

-- 6. Notification Logs table (Delivery History & Idempotency)
CREATE TABLE IF NOT EXISTS notification_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  prayer_name TEXT NOT NULL,         -- 'fajr', 'dhuhr', 'asr', 'maghrib', 'isha'
  date TEXT NOT NULL,                -- 'YYYY-MM-DD'
  reminder_type TEXT NOT NULL,       -- 'start' | 'reminder_30min'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  prayer_time TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  push_sent INTEGER NOT NULL DEFAULT 0,
  delivered_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, prayer_name, date, reminder_type)
);
CREATE INDEX IF NOT EXISTS idx_notif_logs_user_date ON notification_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_notif_logs_user_unread ON notification_logs(user_id, is_read);

-- 7. Personal Quran Reading Logs table
CREATE TABLE IF NOT EXISTS quran_reading_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  surah_name TEXT NOT NULL,
  start_page INTEGER NOT NULL,
  end_page INTEGER NOT NULL,
  start_ruku INTEGER NOT NULL,
  end_ruku INTEGER NOT NULL,
  pages_read INTEGER NOT NULL,
  rukus_read INTEGER NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_quran_reading_user_date ON quran_reading_logs(user_id, date);

-- 8. User Vocabulary Progress (Top 600 Words)
CREATE TABLE IF NOT EXISTS user_word_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  word_id INTEGER NOT NULL,
  is_learned INTEGER NOT NULL DEFAULT 0,
  is_bookmarked INTEGER NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, word_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_word_progress_user ON user_word_progress(user_id);


