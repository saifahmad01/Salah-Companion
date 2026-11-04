import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load production environment configuration
const envPath = path.resolve(__dirname, '../.env.production');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

let dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!dbUrl || (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://'))) {
  console.error('❌ Error: Valid PostgreSQL connection string required in DIRECT_URL or DATABASE_URL.');
  process.exit(1);
}

// Clean up sslmode if present
try {
  const parsed = new URL(dbUrl);
  parsed.searchParams.delete('sslmode');
  dbUrl = parsed.toString();
} catch {}

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

export const MIGRATION_SQL = `
-- 1. Ensure prayer_logs has is_admin_override and qada_completed_at
ALTER TABLE "prayer_logs" ADD COLUMN IF NOT EXISTS "is_admin_override" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "prayer_logs" ADD COLUMN IF NOT EXISTS "qada_completed_at" TIMESTAMPTZ;

-- 2. Ensure composite indexes on prayer_logs
CREATE INDEX IF NOT EXISTS "prayer_logs_user_id_status_idx" ON "prayer_logs"("user_id", "status");
CREATE INDEX IF NOT EXISTS "idx_prayer_logs_user_status" ON "prayer_logs"("user_id", "status");

-- 3. Ensure quran_reading_logs table exists
CREATE TABLE IF NOT EXISTS "quran_reading_logs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" TEXT NOT NULL,
  "surah_name" TEXT NOT NULL,
  "start_page" INTEGER NOT NULL,
  "end_page" INTEGER NOT NULL,
  "start_ruku" INTEGER NOT NULL,
  "end_ruku" INTEGER NOT NULL,
  "pages_read" INTEGER NOT NULL,
  "rukus_read" INTEGER NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "quran_reading_logs_user_id_date_idx" ON "quran_reading_logs"("user_id", "date");

-- 4. Ensure user_word_progress table exists
CREATE TABLE IF NOT EXISTS "user_word_progress" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "word_id" INTEGER NOT NULL,
  "is_learned" BOOLEAN NOT NULL DEFAULT false,
  "is_bookmarked" BOOLEAN NOT NULL DEFAULT false,
  "review_count" INTEGER NOT NULL DEFAULT 0,
  "last_reviewed" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("user_id", "word_id")
);
CREATE INDEX IF NOT EXISTS "user_word_progress_user_id_idx" ON "user_word_progress"("user_id");

-- 5. Ensure salah_correction_requests table exists
CREATE TABLE IF NOT EXISTS "salah_correction_requests" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "prayer_log_id" TEXT REFERENCES "prayer_logs"("id") ON DELETE SET NULL,
  "prayer_name" TEXT NOT NULL,
  "prayer_date" TEXT NOT NULL,
  "previous_status" TEXT NOT NULL DEFAULT 'missed',
  "requested_status" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
  "reviewed_by" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewed_at" TIMESTAMPTZ,
  "rejection_reason" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_salah_corrections_user" ON "salah_correction_requests"("user_id", "status");
CREATE INDEX IF NOT EXISTS "idx_salah_corrections_status" ON "salah_correction_requests"("status", "created_at");
CREATE INDEX IF NOT EXISTS "idx_salah_corrections_prayer_date" ON "salah_correction_requests"("prayer_date");

`;

export async function applyProductionMigrations() {
  console.log('🚀 Connecting to Supabase PostgreSQL for idempotent schema migration...');
  await client.connect();
  console.log('✓ Connected to database.');

  try {
    console.log('Executing safe schema migration DDL...');
    await client.query(MIGRATION_SQL);
    console.log('✓ Schema migration DDL applied successfully without altering existing records!');

    // Verify columns on prayer_logs
    const colRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'prayer_logs'
      ORDER BY ordinal_position;
    `);

    console.log('\n--- Verified prayer_logs columns ---');
    console.table(colRes.rows.map(c => ({
      column: c.column_name,
      type: c.data_type,
      default: c.column_default
    })));

    // Verify all 13 tables
    const tabRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('\n--- Verified Public Tables in Database ---');
    tabRes.rows.forEach(r => console.log(`  ✓ ${r.table_name}`));

    console.log('\n🎉 Production schema synchronization completed safely!\n');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  applyProductionMigrations().catch(() => process.exit(1));
}
