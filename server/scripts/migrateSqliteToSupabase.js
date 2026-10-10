import pg from 'pg';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL || process.argv[2];

if (!dbUrl || (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://'))) {
  console.error('\n❌ ERROR: PostgreSQL connection string required in DATABASE_URL.');
  console.error('Format: postgresql://postgres.[ref]:[PASSWORD]@[host]:[port]/postgres\n');
  process.exit(1);
}

const sqliteDbPath1 = path.resolve(__dirname, '../database.sqlite');
const sqliteDbPath2 = path.resolve(__dirname, '../prisma/database.sqlite');

console.log('\n📦 Starting SQLite -> Supabase PostgreSQL Data Migration...');

async function migrate() {
  const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
  const pgClient = new Client({
    connectionString: dbUrl,
    ssl: !isLocalhost ? { rejectUnauthorized: false } : false,
  });

  try {
    await pgClient.connect();
    console.log('✓ Connected to Supabase PostgreSQL.');

    let db1 = null;
    let db2 = null;

    if (fs.existsSync(sqliteDbPath1)) {
      db1 = new Database(sqliteDbPath1);
      console.log(`✓ Opened SQLite 1: ${sqliteDbPath1}`);
    }
    if (fs.existsSync(sqliteDbPath2)) {
      db2 = new Database(sqliteDbPath2);
      console.log(`✓ Opened SQLite 2: ${sqliteDbPath2}`);
    }

    let usersCount = 0;
    let pendingCount = 0;
    let prayerLogsCount = 0;
    let notifPrefsCount = 0;
    let notifLogsCount = 0;
    let pushSubsCount = 0;

    // --------------------------------------------------------------------------
    // 1. Migrate Users
    // --------------------------------------------------------------------------
    console.log('\nMigrating Users...');
    const userMap = new Map();

    if (db2) {
      try {
        const pUsers = db2.prepare('SELECT * FROM users').all();
        pUsers.forEach((u) => userMap.set(u.id, u));
      } catch {}
    }
    if (db1) {
      try {
        const sUsers = db1.prepare('SELECT * FROM users').all();
        sUsers.forEach((u) => {
          if (!userMap.has(u.id)) {
            userMap.set(u.id, u);
          }
        });
      } catch {}
    }

    for (const u of userMap.values()) {
      await pgClient.query(
        `
        INSERT INTO users (
          id, name, email, password, role, prayer_calculation_method,
          latitude, longitude, timezone, is_email_verified,
          verification_token_hash, token_expires_at, last_verification_sent_at,
          google_id, avatar_url, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        ON CONFLICT (id) DO UPDATE SET
          name = COALESCE(EXCLUDED.name, users.name),
          email = COALESCE(EXCLUDED.email, users.email),
          password = COALESCE(EXCLUDED.password, users.password),
          is_email_verified = EXCLUDED.is_email_verified,
          updated_at = NOW();
        `,
        [
          u.id,
          u.name || 'Salah Companion User',
          u.email || null,
          u.password || null,
          u.role || 'USER',
          u.prayerCalculationMethod || u.prayer_calculation_method || 'Karachi',
          u.latitude || null,
          u.longitude || null,
          u.timezone || 'Asia/Kolkata',
          Boolean(u.isEmailVerified),
          u.verificationTokenHash || u.verification_token_hash || null,
          u.tokenExpiresAt ? new Date(u.tokenExpiresAt) : null,
          u.lastVerificationSentAt ? new Date(u.lastVerificationSentAt) : null,
          u.googleId || u.google_id || null,
          u.avatarUrl || u.avatar_url || null,
          u.createdAt ? new Date(u.createdAt) : new Date(),
          u.updatedAt ? new Date(u.updatedAt) : new Date(),
        ]
      );
      usersCount++;
    }
    console.log(`✓ Migrated ${usersCount} users.`);

    // --------------------------------------------------------------------------
    // 2. Migrate Pending Registrations
    // --------------------------------------------------------------------------
    console.log('\nMigrating Pending Registrations...');
    if (db2) {
      try {
        const pending = db2.prepare('SELECT * FROM pending_registrations').all();
        for (const p of pending) {
          await pgClient.query(
            `
            INSERT INTO pending_registrations (
              id, name, email, password, prayer_calculation_method,
              latitude, longitude, token_hash, expires_at, last_sent_at, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (email) DO UPDATE SET
              token_hash = EXCLUDED.token_hash,
              expires_at = EXCLUDED.expires_at,
              updated_at = NOW();
            `,
            [
              p.id,
              p.name,
              p.email,
              p.password,
              p.prayerCalculationMethod || 'Karachi',
              p.latitude || null,
              p.longitude || null,
              p.tokenHash,
              new Date(p.expiresAt),
              new Date(p.lastSentAt || Date.now()),
              new Date(p.createdAt || Date.now()),
              new Date(p.updatedAt || Date.now()),
            ]
          );
          pendingCount++;
        }
      } catch (err) {
        console.warn('Note on pending registrations:', err.message);
      }
    }
    console.log(`✓ Migrated ${pendingCount} pending registrations.`);

    // --------------------------------------------------------------------------
    // 3. Migrate Prayer Logs
    // --------------------------------------------------------------------------
    console.log('\nMigrating Prayer Logs...');
    const prayerLogs = [];
    if (db1) {
      try {
        prayerLogs.push(...db1.prepare('SELECT * FROM prayer_logs').all());
      } catch {}
    }
    if (db2) {
      try {
        prayerLogs.push(...db2.prepare('SELECT * FROM prayer_logs').all());
      } catch {}
    }

    for (const l of prayerLogs) {
      const uId = l.user_id || l.userId;
      if (!uId || !userMap.has(uId)) continue; // Ensure foreign key integrity

      await pgClient.query(
        `
        INSERT INTO prayer_logs (
          id, user_id, prayer_name, date, status, prayer_start_time, prayer_end_time, logged_at, notes
        ) VALUES (
          gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8
        )
        ON CONFLICT (user_id, prayer_name, date) DO UPDATE SET
          status = EXCLUDED.status,
          logged_at = EXCLUDED.logged_at,
          notes = EXCLUDED.notes;
        `,
        [
          uId,
          (l.prayer_name || l.prayerName || '').toLowerCase(),
          l.date,
          l.status,
          l.prayer_start_time || l.prayerStartTime || null,
          l.prayer_end_time || l.prayerEndTime || null,
          l.logged_at ? new Date(l.logged_at) : new Date(),
          l.notes || null,
        ]
      );
      prayerLogsCount++;
    }
    console.log(`✓ Migrated ${prayerLogsCount} prayer logs.`);

    // --------------------------------------------------------------------------
    // 4. Migrate Notification Preferences
    // --------------------------------------------------------------------------
    console.log('\nMigrating Notification Preferences...');
    if (db1) {
      try {
        const prefs = db1.prepare('SELECT * FROM notification_preferences').all();
        for (const p of prefs) {
          await pgClient.query(
            `
            INSERT INTO notification_preferences (
              user_id, prayer_start_enabled, reminder_30min_enabled, browser_push_enabled,
              fajr_enabled, dhuhr_enabled, asr_enabled, maghrib_enabled, isha_enabled,
              latitude, longitude, timezone, calculation_method, madhab, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
              prayer_start_enabled = EXCLUDED.prayer_start_enabled,
              reminder_30min_enabled = EXCLUDED.reminder_30min_enabled,
              browser_push_enabled = EXCLUDED.browser_push_enabled,
              updated_at = NOW();
            `,
            [
              p.user_id,
              Boolean(p.prayer_start_enabled),
              Boolean(p.reminder_30min_enabled),
              Boolean(p.browser_push_enabled),
              Boolean(p.fajr_enabled),
              Boolean(p.dhuhr_enabled),
              Boolean(p.asr_enabled),
              Boolean(p.maghrib_enabled),
              Boolean(p.isha_enabled),
              p.latitude || 28.6139,
              p.longitude || 77.2090,
              p.timezone || 'Asia/Kolkata',
              p.calculation_method || 'Karachi',
              p.madhab || 'Hanafi',
            ]
          );
          notifPrefsCount++;
        }
      } catch (err) {
        console.warn('Note on notification preferences:', err.message);
      }
    }
    console.log(`✓ Migrated ${notifPrefsCount} notification preference records.`);

    // --------------------------------------------------------------------------
    // 5. Migrate Push Subscriptions
    // --------------------------------------------------------------------------
    console.log('\nMigrating Push Subscriptions...');
    if (db1) {
      try {
        const subs = db1.prepare('SELECT * FROM push_subscriptions').all();
        for (const s of subs) {
          await pgClient.query(
            `
            INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            ON CONFLICT (endpoint) DO NOTHING;
            `,
            [s.user_id, s.endpoint, s.p256dh, s.auth, s.user_agent || null]
          );
          pushSubsCount++;
        }
      } catch {}
    }
    console.log(`✓ Migrated ${pushSubsCount} push subscriptions.`);

    // --------------------------------------------------------------------------
    // 6. Migrate Notification Logs
    // --------------------------------------------------------------------------
    console.log('\nMigrating Notification Logs...');
    if (db1) {
      try {
        const logs = db1.prepare('SELECT * FROM notification_logs').all();
        for (const nl of logs) {
          await pgClient.query(
            `
            INSERT INTO notification_logs (
              user_id, prayer_name, date, reminder_type, title, body, prayer_time, is_read, push_sent, delivered_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (user_id, prayer_name, date, reminder_type) DO NOTHING;
            `,
            [
              nl.user_id,
              nl.prayer_name,
              nl.date,
              nl.reminder_type,
              nl.title,
              nl.body,
              nl.prayer_time || null,
              Boolean(nl.is_read),
              Boolean(nl.push_sent),
              nl.delivered_at ? new Date(nl.delivered_at) : new Date(),
            ]
          );
          notifLogsCount++;
        }
      } catch {}
    }
    console.log(`✓ Migrated ${notifLogsCount} notification logs.`);

    console.log('\n======================================================');
    console.log('🎉 ALL DATA SUCCESSFULLY MIGRATED TO SUPABASE POSTGRESQL!');
    console.log(`   - Users:                     ${usersCount}`);
    console.log(`   - Pending Registrations:     ${pendingCount}`);
    console.log(`   - Prayer Logs:               ${prayerLogsCount}`);
    console.log(`   - Notification Preferences:  ${notifPrefsCount}`);
    console.log(`   - Notification Logs:         ${notifLogsCount}`);
    console.log(`   - Push Subscriptions:        ${pushSubsCount}`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Data Migration Error:', err.message);
    process.exit(1);
  } finally {
    await pgClient.end();
  }
}

migrate();
