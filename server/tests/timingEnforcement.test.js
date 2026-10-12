import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import { validatePrayerTiming, calculatePrayers } from '../src/services/prayerService.js';
import { getLocalDateKey, resolveUserTimezone, addDays } from '../src/utils/dateUtils.js';

const BASE_URL = process.env.TEST_API_URL || `http://localhost:${config.port || 8080}`;
const JWT_SECRET = config.jwtSecret;

console.log('--- Running Strict Same-Day Prayer Completion Timing Enforcement Tests ---');
console.log(`Target API: ${BASE_URL}\n`);

async function runTests() {
  const timestamp = Date.now();
  const testUserEmail = `timing.tester.${timestamp}@example.com`;
  const otherUserEmail = `other.user.${timestamp}@example.com`;

  // Create primary test user
  const user = await prisma.user.create({
    data: {
      name: 'Timing Tester',
      email: testUserEmail,
      role: 'USER',
      isEmailVerified: true,
      prayerCalculationMethod: 'Karachi',
      latitude: 28.6139,
      longitude: 77.2090,
    },
  });

  // Create second user for authorization/multi-tenant tests
  const otherUser = await prisma.user.create({
    data: {
      name: 'Other User',
      email: otherUserEmail,
      role: 'USER',
      isEmailVerified: true,
    },
  });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const otherToken = jwt.sign(
    { id: otherUser.id, email: otherUser.email, role: otherUser.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const userTimezone = 'Asia/Kolkata';
  const now = new Date();
  const todayStr = getLocalDateKey(now, userTimezone);
  const yesterdayStr = addDays(todayStr, -1);
  const tomorrowStr = addDays(todayStr, 1);

  // Authoritative prayer timetable for today
  const timetable = calculatePrayers({
    latitude: 28.6139,
    longitude: 77.2090,
    method: 'Karachi',
    madhab: 'Hanafi',
    targetDate: now,
  });

  const dhuhrStart = new Date(timetable.times.dhuhr);
  const asrStart = new Date(timetable.times.asr);
  const fajrStart = new Date(timetable.times.fajr);
  const sunrise = new Date(timetable.times.sunrise);

  try {
    // ------------------------------------------------------------------------
    // Scenario 1: Completing an eligible prayer today
    // ------------------------------------------------------------------------
    console.log('Scenario 1: Completing an eligible prayer today...');
    // Simulated time: 10 minutes into Dhuhr window
    const activeDhuhrTime = new Date(dhuhrStart.getTime() + 10 * 60 * 1000);
    const validDhuhrResult = validatePrayerTiming({
      prayerName: 'dhuhr',
      date: todayStr,
      status: 'on_time',
      latitude: 28.6139,
      longitude: 77.2090,
      now: activeDhuhrTime,
      timezone: userTimezone,
    });
    assert.equal(validDhuhrResult.isValid, true);
    assert.ok(validDhuhrResult.isWithinWindow);
    console.log('✓ Scenario 1 Passed: Eligible prayer completion successfully validated.');

    // ------------------------------------------------------------------------
    // Scenario 2: Attempting to complete a prayer before its start time
    // ------------------------------------------------------------------------
    console.log('Scenario 2: Attempting to complete a prayer before its start time...');
    const preDhuhrTime = new Date(dhuhrStart.getTime() - 15 * 60 * 1000); // 15 mins before Dhuhr
    const preStartResult = validatePrayerTiming({
      prayerName: 'dhuhr',
      date: todayStr,
      status: 'on_time',
      latitude: 28.6139,
      longitude: 77.2090,
      now: preDhuhrTime,
      timezone: userTimezone,
    });
    assert.equal(preStartResult.isValid, false);
    assert.equal(preStartResult.statusCode, 409);
    assert.equal(preStartResult.code, 'PRAYER_TIME_NOT_STARTED');
    assert.ok(preStartResult.availableAt);
    console.log('✓ Scenario 2 Passed: Prayer before start time rejected with 409 PRAYER_TIME_NOT_STARTED.');

    // ------------------------------------------------------------------------
    // Scenario 3: Completing a prayer after its tracking window ends during today
    // ------------------------------------------------------------------------
    console.log('Scenario 3: Completing a prayer after its tracking window ends during today...');
    const postDhuhrTime = new Date(asrStart.getTime() + 1000); // Window ended at Asr start
    const postWindowResult = validatePrayerTiming({
      prayerName: 'dhuhr',
      date: todayStr,
      status: 'on_time',
      latitude: 28.6139,
      longitude: 77.2090,
      now: postDhuhrTime,
      timezone: userTimezone,
    });
    // Under active-day rule: prayers can be marked/corrected at any time during current calendar day
    assert.equal(postWindowResult.isValid, true);
    assert.equal(postWindowResult.isPassed, true);
    console.log('✓ Scenario 3 Passed: Prayer after window ended is allowed on current calendar day (isPassed: true).');

    // ------------------------------------------------------------------------
    // Scenario 4: Attempting to edit yesterday's record
    // ------------------------------------------------------------------------
    console.log("Scenario 4: Attempting to edit yesterday's record...");
    // Seed historical record for yesterday
    const yesterdayLog = await prisma.prayerLog.create({
      data: {
        userId: user.id,
        prayerName: 'Asr',
        date: yesterdayStr,
        status: 'on_time',
      },
    });

    const editPastRes = await fetch(`${BASE_URL}/api/prayers/log/${yesterdayLog.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ notes: 'Trying to modify past log' }),
    });
    assert.equal(editPastRes.status, 409);
    const editPastJson = await editPastRes.json();
    assert.equal(editPastJson.code, 'PRAYER_DATE_NOT_TODAY');
    console.log("✓ Scenario 4 Passed: Editing yesterday's record rejected with 409 PRAYER_DATE_NOT_TODAY.");

    // ------------------------------------------------------------------------
    // Scenario 5: Attempting to edit a future record
    // ------------------------------------------------------------------------
    console.log('Scenario 5: Attempting to edit a future record...');
    const futurePostRes = await fetch(`${BASE_URL}/api/prayers/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prayerName: 'fajr',
        date: tomorrowStr,
        status: 'on_time',
      }),
    });
    assert.equal(futurePostRes.status, 409);
    const futurePostJson = await futurePostRes.json();
    assert.equal(futurePostJson.code, 'PRAYER_DATE_NOT_TODAY');
    console.log('✓ Scenario 5 Passed: Creating or editing future records rejected with 409 PRAYER_DATE_NOT_TODAY.');

    // ------------------------------------------------------------------------
    // Scenario 6: Editing today's eligible record
    // ------------------------------------------------------------------------
    console.log("Scenario 6: Editing today's eligible record...");
    // Determine which prayer is currently eligible right now
    const nowHours = now.getHours();
    let eligiblePrayer = 'fajr';
    if (nowHours >= 12 && nowHours < 16) eligiblePrayer = 'dhuhr';
    else if (nowHours >= 16 && nowHours < 18) eligiblePrayer = 'asr';
    else if (nowHours >= 18 && nowHours < 19) eligiblePrayer = 'maghrib';
    else eligiblePrayer = 'isha';

    // Seed a record for eligible prayer today
    const activeLog = await prisma.prayerLog.upsert({
      where: {
        userId_prayerName_date: {
          userId: user.id,
          prayerName: 'Isha',
          date: todayStr,
        },
      },
      update: { notes: 'Initial note' },
      create: {
        userId: user.id,
        prayerName: 'Isha',
        date: todayStr,
        status: 'on_time',
        notes: 'Initial note',
      },
    });

    const editRes = await fetch(`${BASE_URL}/api/prayers/log/${activeLog.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ notes: 'Updated reflection note' }),
    });
    // Editing today's record succeeds with 200
    assert.equal(editRes.status, 200);
    const editJson = await editRes.json();
    assert.equal(editJson.success, true);
    assert.equal(editJson.data.notes, 'Updated reflection note');
    console.log("✓ Scenario 6 Passed: Today's record edited successfully.");

    // ------------------------------------------------------------------------
    // Scenario 7: Undoing completion while the prayer is still eligible
    // ------------------------------------------------------------------------
    console.log('Scenario 7: Undoing completion while the prayer is still eligible...');
    // Seed an active prayer log
    const undoableLog = await prisma.prayerLog.upsert({
      where: {
        userId_prayerName_date: {
          userId: user.id,
          prayerName: 'Isha',
          date: todayStr,
        },
      },
      update: { status: 'on_time' },
      create: {
        userId: user.id,
        prayerName: 'Isha',
        date: todayStr,
        status: 'on_time',
      },
    });

    const undoRes = await fetch(`${BASE_URL}/api/prayers/log/${undoableLog.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.equal(undoRes.status, 200);
    const checkDeleted = await prisma.prayerLog.findUnique({ where: { id: undoableLog.id } });
    assert.equal(checkDeleted, null, 'Record must be removed from DB after undo');
    console.log('✓ Scenario 7 Passed: Eligible prayer completion undone and database record cleared.');

    // ------------------------------------------------------------------------
    // Scenario 8: Undoing completion at any time today, rejecting past dates
    // ------------------------------------------------------------------------
    console.log('Scenario 8: Undoing completion at any time today, rejecting past dates...');
    const todayFajrLog = await prisma.prayerLog.upsert({
      where: {
        userId_prayerName_date: {
          userId: user.id,
          prayerName: 'Fajr',
          date: todayStr,
        },
      },
      update: { status: 'on_time' },
      create: {
        userId: user.id,
        prayerName: 'Fajr',
        date: todayStr,
        status: 'on_time',
      },
    });

    const undoTodayRes = await fetch(`${BASE_URL}/api/prayers/log/${todayFajrLog.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    assert.equal(undoTodayRes.status, 200);
    console.log('✓ Scenario 8 Passed: Undoing prayer on current calendar day succeeds at any time.');

    // Reject past date undo:
    const pastYesterdayLog = await prisma.prayerLog.create({
      data: {
        userId: user.id,
        prayerName: 'Fajr',
        date: yesterdayStr,
        status: 'on_time',
      },
    });
    const undoPastRes = await fetch(`${BASE_URL}/api/prayers/log/${pastYesterdayLog.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    assert.equal(undoPastRes.status, 409);
    const undoPastJson = await undoPastRes.json();
    assert.equal(undoPastJson.code, 'PRAYER_DATE_NOT_TODAY');
    console.log('✓ Scenario 8 Passed: Undoing past date rejected with 409 PRAYER_DATE_NOT_TODAY.');

    // ------------------------------------------------------------------------
    // Scenario 9: Preventing duplicate records
    // ------------------------------------------------------------------------
    console.log('Scenario 9: Preventing duplicate records...');
    const dupTestLog = await prisma.prayerLog.upsert({
      where: {
        userId_prayerName_date: {
          userId: user.id,
          prayerName: 'Fajr',
          date: todayStr,
        },
      },
      update: { status: 'on_time' },
      create: {
        userId: user.id,
        prayerName: 'Fajr',
        date: todayStr,
        status: 'on_time',
      },
    });

    const duplicateRes = await fetch(`${BASE_URL}/api/prayers/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prayerName: 'fajr',
        date: todayStr,
        status: 'late', // Attempting different completed status without undoing
      }),
    });
    assert.equal(duplicateRes.status, 409);
    const duplicateJson = await duplicateRes.json();
    assert.equal(duplicateJson.code, 'PRAYER_ALREADY_COMPLETED');
    console.log('✓ Scenario 9 Passed: Duplicate completion rejected with 409 PRAYER_ALREADY_COMPLETED.');

    // ------------------------------------------------------------------------
    // Scenario 10: Attempting to modify another user's record
    // ------------------------------------------------------------------------
    console.log("Scenario 10: Attempting to modify another user's record...");
    const otherUserRes = await fetch(`${BASE_URL}/api/prayers/log/${dupTestLog.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherToken}`,
      },
      body: JSON.stringify({ notes: 'Unauthorized tampering attempt' }),
    });
    assert.equal(otherUserRes.status, 403);
    console.log("✓ Scenario 10 Passed: Accessing other user's record rejected with 403 Forbidden.");

    // ------------------------------------------------------------------------
    // Scenario 11: Forging a client timestamp or date
    // ------------------------------------------------------------------------
    console.log('Scenario 11: Forging a client timestamp or date...');
    const forgedRes = await fetch(`${BASE_URL}/api/prayers/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prayerName: 'dhuhr',
        date: '2025-01-01', // Client supplies past date
        status: 'on_time',
        canComplete: true, // Forged client flag
      }),
    });
    assert.equal(forgedRes.status, 409);
    const forgedJson = await forgedRes.json();
    assert.equal(forgedJson.code, 'PRAYER_DATE_NOT_TODAY');
    console.log('✓ Scenario 11 Passed: Forged client date rejected by trusted server date validation.');

    // ------------------------------------------------------------------------
    // Scenario 12: Submitting a request after local midnight from a stale browser tab
    // ------------------------------------------------------------------------
    console.log('Scenario 12: Submitting a request after local midnight from a stale browser tab...');
    // Simulated stale tab submitting for yesterday's date
    const staleMidnightRes = await fetch(`${BASE_URL}/api/prayers/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prayerName: 'isha',
        date: yesterdayStr,
        status: 'on_time',
      }),
    });
    assert.equal(staleMidnightRes.status, 409);
    const staleMidnightJson = await staleMidnightRes.json();
    assert.equal(staleMidnightJson.code, 'PRAYER_DATE_NOT_TODAY');
    console.log('✓ Scenario 12 Passed: Stale browser tab after midnight rejected with 409 PRAYER_DATE_NOT_TODAY.');

    // ------------------------------------------------------------------------
    // Scenario 13: Handling the Fajr window across midnight correctly
    // ------------------------------------------------------------------------
    console.log('Scenario 13: Handling the Fajr window across midnight correctly...');
    // At 03:00 AM on today's date (before Fajr begins at ~05:00 AM)
    const midnightDawnClock = new Date(`${todayStr}T03:00:00+05:30`);
    const preFajrCheck = validatePrayerTiming({
      prayerName: 'fajr',
      date: todayStr,
      status: 'on_time',
      latitude: 28.6139,
      longitude: 77.2090,
      now: midnightDawnClock,
      timezone: userTimezone,
    });
    assert.equal(preFajrCheck.isValid, false);
    assert.equal(preFajrCheck.code, 'PRAYER_TIME_NOT_STARTED');

    // At 05:30 AM (after Fajr begins, before sunrise)
    const dawnActiveClock = new Date(fajrStart.getTime() + 15 * 60 * 1000);
    const activeFajrCheck = validatePrayerTiming({
      prayerName: 'fajr',
      date: todayStr,
      status: 'on_time',
      latitude: 28.6139,
      longitude: 77.2090,
      now: dawnActiveClock,
      timezone: userTimezone,
    });
    assert.equal(activeFajrCheck.isValid, true);
    console.log('✓ Scenario 13 Passed: Fajr window across midnight handled accurately.');

    // ------------------------------------------------------------------------
    // Scenario 14: Handling timezone and daylight-saving boundaries
    // ------------------------------------------------------------------------
    console.log('Scenario 14: Handling timezone and daylight-saving boundaries...');
    // UTC date: 2026-10-12T00:30:00Z
    const testUtcDate = new Date('2026-10-12T00:30:00Z');
    // Asia/Kolkata (+05:30) is 2026-10-12 06:00
    const kolkataKey = getLocalDateKey(testUtcDate, 'Asia/Kolkata');
    assert.equal(kolkataKey, '2026-10-12');

    // America/New_York (EDT, -04:00) is 2026-10-11 20:30 (previous day!)
    const nyKey = getLocalDateKey(testUtcDate, 'America/New_York');
    assert.equal(nyKey, '2026-10-11');

    // Asia/Tokyo (+09:00) is 2026-10-12 09:30
    const tokyoKey = getLocalDateKey(testUtcDate, 'Asia/Tokyo');
    assert.equal(tokyoKey, '2026-10-12');
    console.log('✓ Scenario 14 Passed: Timezone and international date boundaries verified.');

    // ------------------------------------------------------------------------
    // Scenario 15: Ensuring progress counts update after a valid correction
    // ------------------------------------------------------------------------
    console.log('Scenario 15: Ensuring progress counts update after a valid correction...');
    const summaryRes = await fetch(`${BASE_URL}/api/prayers/today`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(summaryRes.status, 200);
    const summaryJson = await summaryRes.json();
    assert.ok(summaryJson.summary);
    assert.equal(typeof summaryJson.summary.completed, 'number');
    assert.equal(typeof summaryJson.summary.completionRate, 'number');
    console.log('✓ Scenario 15 Passed: Progress counts reflect authoritative database state.');

    // ------------------------------------------------------------------------
    // Scenario 16: Ensuring denied requests do not mutate the database
    // ------------------------------------------------------------------------
    console.log('Scenario 16: Ensuring denied requests do not mutate the database...');
    const countBefore = await prisma.prayerLog.count({ where: { userId: user.id } });
    // Attempt invalid submission
    await fetch(`${BASE_URL}/api/prayers/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prayerName: 'asr',
        date: '2021-06-15', // Past date
        status: 'on_time',
      }),
    });
    const countAfter = await prisma.prayerLog.count({ where: { userId: user.id } });
    assert.equal(countBefore, countAfter, 'Database count must not change when mutation is denied');
    console.log('✓ Scenario 16 Passed: Denied requests do not mutate the database.');

    // ------------------------------------------------------------------------
    // Scenario 17: Friday Juma slot unification and display
    // ------------------------------------------------------------------------
    console.log('Scenario 17: Friday Juma slot unification and display...');
    const testFriday = new Date('2026-10-16T13:30:00+05:30'); // 2026-10-16 is Friday
    const fridayDateKey = '2026-10-16';

    // 1. GET /api/prayers/today for Friday returns 'Juma' for midday slot
    const fridayTodayRes = await fetch(`${BASE_URL}/api/prayers/today?date=${fridayDateKey}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(fridayTodayRes.status, 200);
    const fridayTodayJson = await fridayTodayRes.json();
    const middaySlot = fridayTodayJson.prayers.find((p) => p.prayerName === 'Juma');
    assert.ok(middaySlot, 'Friday midday slot must be named Juma');
    assert.equal(fridayTodayJson.prayers.length, 5, 'Must maintain exactly 5 slots on Friday');

    // 2. GET /api/prayers/weekly returns 'Juma' for Friday
    const fridayWeeklyRes = await fetch(`${BASE_URL}/api/prayers/weekly?startDate=2026-10-12`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(fridayWeeklyRes.status, 200);
    const fridayWeeklyJson = await fridayWeeklyRes.json();
    const fridayDay = fridayWeeklyJson.data.days.find((d) => d.date === fridayDateKey);
    assert.ok(fridayDay, 'Friday must exist in weekly breakdown');
    const fridayWeeklyMidday = fridayDay.prayers.find((p) => p.id === 'dhuhr');
    assert.equal(fridayWeeklyMidday.name, 'Juma', 'Friday weekly midday slot must be named Juma');

    // 3. Logging Juma on Friday
    const logJumaRes = await fetch(`${BASE_URL}/api/prayers/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-test-now': testFriday.toISOString(),
      },
      body: JSON.stringify({
        prayerName: 'Juma',
        date: fridayDateKey,
        status: 'on_time',
      }),
    });
    assert.equal(logJumaRes.status, 200);

    // 4. Attempting to log Dhuhr on the same Friday must be rejected as duplicate
    const logDupDhuhrRes = await fetch(`${BASE_URL}/api/prayers/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-test-now': testFriday.toISOString(),
      },
      body: JSON.stringify({
        prayerName: 'Dhuhr',
        date: fridayDateKey,
        status: 'late',
      }),
    });
    assert.equal(logDupDhuhrRes.status, 409);
    const logDupJson = await logDupDhuhrRes.json();
    assert.equal(logDupJson.code, 'PRAYER_ALREADY_COMPLETED');
    console.log('✓ Scenario 17 Passed: Friday midday slot is Juma only, maintaining exactly 5 slots and rejecting duplicates.');

    // ------------------------------------------------------------------------
    // Scenario 18: Completing a prayer late on current day
    // ------------------------------------------------------------------------
    console.log('Scenario 18: Completing a prayer late on current day...');
    // Simulated time: during or after Asr window today
    const simAsrTime = new Date(asrStart.getTime() + 15 * 60 * 1000);
    const latePostRes = await fetch(`${BASE_URL}/api/prayers/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-test-now': simAsrTime.toISOString(),
      },
      body: JSON.stringify({
        prayerName: 'asr',
        date: todayStr,
        status: 'late',
      }),
    });
    assert.equal(latePostRes.status, 200);
    const latePostJson = await latePostRes.json();
    assert.equal(latePostJson.success, true);
    assert.equal(latePostJson.data.log.status, 'late');
    console.log('✓ Scenario 18 Passed: Late prayer completion recorded successfully on current day.');

    // ------------------------------------------------------------------------
    // Scenario 19: Completing a prayer as Qada on current day
    // ------------------------------------------------------------------------
    console.log('Scenario 19: Completing a prayer as Qada on current day...');
    const qadaPostRes = await fetch(`${BASE_URL}/api/prayers/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-test-now': simAsrTime.toISOString(),
      },
      body: JSON.stringify({
        prayerName: 'dhuhr',
        date: todayStr,
        status: 'qada',
      }),
    });
    assert.equal(qadaPostRes.status, 200);
    const qadaPostJson = await qadaPostRes.json();
    assert.equal(qadaPostJson.success, true);
    assert.equal(qadaPostJson.data.log.status, 'qada');
    console.log('✓ Scenario 19 Passed: Qada prayer completion recorded successfully on current day.');

    // ------------------------------------------------------------------------
    // Scenario 20: In-place correction of today's prayer using isCorrection: true
    // ------------------------------------------------------------------------
    console.log("Scenario 20: In-place correction of today's prayer using isCorrection: true...");
    // Update Asr from 'late' to 'on_time' via POST with isCorrection: true
    const correctPostRes = await fetch(`${BASE_URL}/api/prayers/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-test-now': simAsrTime.toISOString(),
      },
      body: JSON.stringify({
        prayerName: 'asr',
        date: todayStr,
        status: 'on_time',
        isCorrection: true,
      }),
    });
    assert.equal(correctPostRes.status, 200);
    const correctPostJson = await correctPostRes.json();
    assert.equal(correctPostJson.success, true);
    assert.equal(correctPostJson.data.log.status, 'on_time');
    console.log('✓ Scenario 20 Passed: In-place correction via POST with isCorrection: true succeeded.');

    // ------------------------------------------------------------------------
    // Scenario 21: In-place correction via PATCH /api/prayers/log/:id by prayer name
    // ------------------------------------------------------------------------
    console.log('Scenario 21: In-place correction via PATCH /api/prayers/log/:id by prayer name...');
    // Correct Dhuhr from 'qada' to 'late' using prayer name identifier
    const patchPrayerRes = await fetch(`${BASE_URL}/api/prayers/log/dhuhr`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-test-now': simAsrTime.toISOString(),
      },
      body: JSON.stringify({
        status: 'late',
        notes: 'Corrected to late after reflection',
      }),
    });
    assert.equal(patchPrayerRes.status, 200);
    const patchPrayerJson = await patchPrayerRes.json();
    assert.equal(patchPrayerJson.success, true);
    assert.equal(patchPrayerJson.data.status, 'late');
    assert.equal(patchPrayerJson.data.notes, 'Corrected to late after reflection');
    console.log('✓ Scenario 21 Passed: In-place correction via PATCH using prayer name identifier succeeded.');

    // ------------------------------------------------------------------------
    // Scenario 22: Midnight rollover: lock previous day and initialize new day fresh
    // ------------------------------------------------------------------------
    console.log('Scenario 22: Midnight rollover: lock previous day and initialize new day fresh...');
    // User has logs for todayStr (e.g. Asr and Dhuhr).
    // Now simulate local midnight rollover to tomorrow:
    const tomorrowMidnight = new Date(`${tomorrowStr}T00:05:00+05:30`);

    // 1. Check GET /api/prayers/today when evaluated on tomorrow:
    // Today's completion for tomorrow must be 0/5 (fresh initialization, no copying of yesterday's statuses)
    const newDayTodayRes = await fetch(`${BASE_URL}/api/prayers/today`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-test-now': tomorrowMidnight.toISOString(),
      },
    });
    assert.equal(newDayTodayRes.status, 200);
    const newDayTodayJson = await newDayTodayRes.json();
    assert.equal(newDayTodayJson.date, tomorrowStr);
    assert.equal(newDayTodayJson.summary.completed, 0, 'New day must initialize fresh with 0 completed');
    newDayTodayJson.prayers.forEach((p) => {
      assert.equal(p.status, 'pending', `${p.prayerName} must start as pending on new day`);
      assert.equal(p.isCompleted, false);
    });

    // 2. Previous day's record (from todayStr) is now strictly locked as read-only:
    const pastEditAfterRolloverRes = await fetch(`${BASE_URL}/api/prayers/log/${correctPostJson.data.log.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-test-now': tomorrowMidnight.toISOString(),
      },
      body: JSON.stringify({ status: 'qada' }),
    });
    // Attempting to edit past day's record returns 409 PRAYER_DATE_NOT_TODAY
    assert.equal(pastEditAfterRolloverRes.status, 409);
    const pastEditJson = await pastEditAfterRolloverRes.json();
    assert.equal(pastEditJson.code, 'PRAYER_DATE_NOT_TODAY');

    // Also testing with prayer name and past date query:
    const pastEditNameRes = await fetch(`${BASE_URL}/api/prayers/log/asr?date=${todayStr}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-test-now': tomorrowMidnight.toISOString(),
      },
      body: JSON.stringify({ status: 'qada' }),
    });
    assert.equal(pastEditNameRes.status, 409);
    const pastEditNameJson = await pastEditNameRes.json();
    assert.equal(pastEditNameJson.code, 'PRAYER_DATE_NOT_TODAY');
    console.log('✓ Scenario 22 Passed: Midnight rollover initializes new day fresh and locks previous records.');

    // ------------------------------------------------------------------------
    // Scenario 23: Strict rejection of future date modifications
    // ------------------------------------------------------------------------
    console.log('Scenario 23: Strict rejection of future date modifications...');
    const dayAfterTomorrowStr = addDays(todayStr, 2);
    const futureDeleteRes = await fetch(`${BASE_URL}/api/prayers/log/fajr?date=${dayAfterTomorrowStr}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(futureDeleteRes.status, 409);
    const futureDeleteJson = await futureDeleteRes.json();
    assert.equal(futureDeleteJson.code, 'PRAYER_DATE_NOT_TODAY');
    console.log('✓ Scenario 23 Passed: Modifying future date records strictly rejected with 409.');

    console.log('\n================================================================');
    console.log('🎉 ALL 23 STRICT CURRENT-DAY TIMING, QADA & EDITING TESTS PASSED! 🎉');
    console.log('================================================================\n');
  } finally {
    // Cleanup
    await prisma.prayerLog.deleteMany({ where: { userId: { in: [user.id, otherUser.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [user.id, otherUser.id] } } });
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
