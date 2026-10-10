import { db } from '../db/connection.js';
import { config } from '../config/env.js';

/**
 * Evaluates whether a prayer was on_time, late, or missed based on timestamps
 *
 * Rules:
 *  - "on_time": Logged within the prime window (first 30-40 mins) of prayer start time.
 *  - "late":    Logged after the prime window, but before prayer end time (next prayer start).
 *  - "missed":  Logged after prayer end time has already elapsed.
 *
 * @param {object} params
 * @param {string|Date} params.prayerStartTime
 * @param {string|Date} params.prayerEndTime
 * @param {string|Date} [params.logTimestamp]
 * @param {number}      [params.primeWindowMinutes=35]
 * @returns {object} { status, minutesSinceStart, minutesUntilEnd, isPrimeWindow }
 */
export function evaluatePrayerStatus({
  prayerStartTime,
  prayerEndTime,
  logTimestamp = new Date(),
  primeWindowMinutes = config.primeWindowMinutes,
}) {
  const start = new Date(prayerStartTime).getTime();
  const end = new Date(prayerEndTime).getTime();
  const logged = new Date(logTimestamp).getTime();

  if (isNaN(start) || isNaN(end) || isNaN(logged)) {
    throw new Error('Invalid date/timestamp provided for prayer evaluation.');
  }

  const primeWindowMs = primeWindowMinutes * 60 * 1000;
  const minutesSinceStart = Math.round((logged - start) / (60 * 1000));
  const minutesUntilEnd = Math.round((end - logged) / (60 * 1000));

  let status = 'on_time';
  let message = '';

  if (logged > end) {
    // Logged after the prayer window has closed
    status = 'missed';
    message = `Logged ${Math.abs(minutesUntilEnd)} minutes after the prayer window ended.`;
  } else if (logged <= start + primeWindowMs) {
    // Logged in the prime window (first 30-40 minutes)
    status = 'on_time';
    message = `Logged on time within prime ${primeWindowMinutes}-minute window.`;
  } else {
    // Logged before end, but past prime window
    status = 'late';
    message = `Logged ${minutesSinceStart} minutes after start (past ${primeWindowMinutes}m prime window, but before expiry).`;
  }

  return {
    status,
    message,
    primeWindowMinutes,
    minutesSinceStart,
    minutesUntilEnd,
    loggedAt: new Date(logged).toISOString(),
  };
}

/**
 * Persists a prayer log to the database
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.prayerName
 * @param {string} params.prayerStartTime
 * @param {string} params.prayerEndTime
 * @param {string} [params.logTimestamp]
 * @param {string} [params.overrideStatus] Optional status override
 * @param {string} [params.notes]
 */
export async function recordPrayerLog({
  userId,
  prayerName,
  prayerStartTime,
  prayerEndTime,
  logTimestamp = new Date().toISOString(),
  overrideStatus,
  notes = null,
}) {
  if (!userId) {
    throw new Error('userId is required to record a prayer log.');
  }
  if (!prayerName) {
    throw new Error('prayerName is required.');
  }
  if (!prayerStartTime || !prayerEndTime) {
    throw new Error('prayerStartTime and prayerEndTime are required.');
  }

  const normalizedPrayer = prayerName.toLowerCase().trim();
  const validPrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  if (!validPrayers.includes(normalizedPrayer)) {
    throw new Error(`Invalid prayerName: "${prayerName}". Must be one of: ${validPrayers.join(', ')}`);
  }

  // Auto-provision user if they do not exist
  const ensureUserStmt = db.prepare(`
    INSERT OR IGNORE INTO users (id, name) VALUES (?, ?)
  `);
  await ensureUserStmt.run(userId, `User-${userId.slice(0, 6)}`);

  // Evaluate status
  const evaluation = evaluatePrayerStatus({
    prayerStartTime,
    prayerEndTime,
    logTimestamp,
  });

  const finalStatus = (overrideStatus && ['on_time', 'late', 'missed'].includes(overrideStatus.toLowerCase()))
    ? overrideStatus.toLowerCase()
    : evaluation.status;

  // Extract YYYY-MM-DD from prayer start time or log timestamp
  const dateKey = new Date(prayerStartTime).toISOString().split('T')[0];

  // Upsert prayer log
  const upsertStmt = db.prepare(`
    INSERT INTO prayer_logs (
      user_id, prayer_name, date, status, prayer_start_time, prayer_end_time, logged_at, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, prayer_name, date) DO UPDATE SET
      status = excluded.status,
      prayer_start_time = excluded.prayer_start_time,
      prayer_end_time = excluded.prayer_end_time,
      logged_at = excluded.logged_at,
      notes = excluded.notes
  `);

  await upsertStmt.run(
    userId,
    normalizedPrayer,
    dateKey,
    finalStatus,
    new Date(prayerStartTime).toISOString(),
    new Date(prayerEndTime).toISOString(),
    new Date(logTimestamp).toISOString(),
    notes
  );

  // Retrieve the saved record
  const fetchStmt = db.prepare(`
    SELECT * FROM prayer_logs WHERE user_id = ? AND prayer_name = ? AND date = ?
  `);
  const savedRecord = await fetchStmt.get(userId, normalizedPrayer, dateKey);

  return {
    record: savedRecord,
    evaluation: {
      ...evaluation,
      status: finalStatus,
    },
  };
}
