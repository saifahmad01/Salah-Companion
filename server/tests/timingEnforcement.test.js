import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import { validatePrayerTiming } from '../src/services/prayerService.js';

const BASE_URL = process.env.TEST_API_URL || `http://localhost:${config.port || 8080}`;
const JWT_SECRET = config.jwtSecret;

console.log('--- Running Strict Same-Day Prayer Completion Timing Enforcement Tests ---');
console.log(`Target API: ${BASE_URL}\n`);

async function runTests() {
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

  // ------------------------------------------------------------------------
  // Unit Tests: validatePrayerTiming service
  // ------------------------------------------------------------------------
  console.log('1. Testing validatePrayerTiming unit logic...');

  // Future date check
  const futureDateResult = validatePrayerTiming({
    prayerName: 'fajr',
    date: '2099-01-01',
    status: 'on_time',
    now,
  });
  assert.equal(futureDateResult.isValid, false);
  assert.equal(futureDateResult.statusCode, 409);
  assert.equal(futureDateResult.code, 'PRAYER_DATE_NOT_TODAY');
  console.log('✓ Unit 1 Passed: Future date strictly rejected with 409 PRAYER_DATE_NOT_TODAY.');

  // Past date check
  const pastDateResult = validatePrayerTiming({
    prayerName: 'fajr',
    date: '2020-01-01',
    status: 'on_time',
    now,
  });
  assert.equal(pastDateResult.isValid, false);
  assert.equal(pastDateResult.statusCode, 409);
  assert.equal(pastDateResult.code, 'PRAYER_DATE_NOT_TODAY');
  console.log('✓ Unit 2 Passed: Past date strictly rejected with 409 PRAYER_DATE_NOT_TODAY.');

  // Today's prayer before start time check (e.g. 03:00 AM for Dhuhr at ~12:00 PM)
  const earlyMorningNow = new Date(`${todayStr}T03:00:00+05:30`);
  const unstartedDhuhrResult = validatePrayerTiming({
    prayerName: 'dhuhr',
    date: todayStr,
    status: 'on_time',
    latitude: 28.6139,
    longitude: 77.2090,
    now: earlyMorningNow,
  });
  assert.equal(unstartedDhuhrResult.isValid, false);
  assert.equal(unstartedDhuhrResult.statusCode, 409);
  assert.equal(unstartedDhuhrResult.code, 'PRAYER_TIME_NOT_STARTED');
  assert.ok(unstartedDhuhrResult.availableAt, 'Must include availableAt timestamp');
  console.log('✓ Unit 3 Passed: Unstarted prayer for today rejected with 409 PRAYER_TIME_NOT_STARTED.');

  // Today's prayer after window expired check (e.g. 23:00 PM for Fajr at ~05:00 AM)
  const lateNightNow = new Date(`${todayStr}T23:00:00+05:30`);
  const expiredFajrResult = validatePrayerTiming({
    prayerName: 'fajr',
    date: todayStr,
    status: 'on_time',
    latitude: 28.6139,
    longitude: 77.2090,
    now: lateNightNow,
  });
  assert.equal(expiredFajrResult.isValid, false);
  assert.equal(expiredFajrResult.statusCode, 409);
  assert.equal(expiredFajrResult.code, 'PRAYER_WINDOW_EXPIRED');
  console.log('✓ Unit 4 Passed: Expired prayer window rejected with 409 PRAYER_WINDOW_EXPIRED.');

  // Today's prayer within active window check (e.g. 13:00 PM for Dhuhr)
  const afternoonNow = new Date(`${todayStr}T13:00:00+05:30`);
  const startedDhuhrResult = validatePrayerTiming({
    prayerName: 'dhuhr',
    date: todayStr,
    status: 'on_time',
    latitude: 28.6139,
    longitude: 77.2090,
    now: afternoonNow,
  });
  assert.equal(startedDhuhrResult.isValid, true);
  assert.ok(startedDhuhrResult.prayerStartTime);
  assert.ok(startedDhuhrResult.prayerEndTime);
  console.log('✓ Unit 5 Passed: Active prayer for today successfully validated.');

  // ------------------------------------------------------------------------
  // Integration Tests: Live HTTP API Endpoints
  // ------------------------------------------------------------------------
  console.log('\n2. Testing Live HTTP API Endpoints...');
  const timestamp = Date.now();
  const testUserEmail = `timing.tester.${timestamp}@example.com`;

  const user = await prisma.user.create({
    data: {
      name: 'Timing Tester',
      email: testUserEmail,
      role: 'USER',
      isEmailVerified: true,
      prayerCalculationMethod: 'Karachi',
    },
  });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  try {
    // API Test 1: Future date completion rejected with 409 PRAYER_DATE_NOT_TODAY
    console.log('API Test 1: POST /api/prayers/log with future date...');
    const futureRes = await fetch(`${BASE_URL}/api/prayers/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prayerName: 'fajr',
        date: '2099-05-15',
        status: 'on_time',
      }),
    });
    assert.equal(futureRes.status, 409);
    const futureJson = await futureRes.json();
    assert.equal(futureJson.code, 'PRAYER_DATE_NOT_TODAY');
    console.log('✓ API Test 1 Passed: Future date returned 409 PRAYER_DATE_NOT_TODAY.');

    // API Test 2: Previous date completion rejected with 409 PRAYER_DATE_NOT_TODAY
    console.log('API Test 2: POST /api/prayers/log with past date...');
    const pastRes = await fetch(`${BASE_URL}/api/prayers/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prayerName: 'fajr',
        date: '2026-01-01',
        status: 'on_time',
      }),
    });
    assert.equal(pastRes.status, 409);
    const pastJson = await pastRes.json();
    assert.equal(pastJson.code, 'PRAYER_DATE_NOT_TODAY');
    console.log('✓ API Test 2 Passed: Past date returned 409 PRAYER_DATE_NOT_TODAY.');

    // API Test 3: Duplicate completion rejection with 409 PRAYER_ALREADY_COMPLETED
    console.log('API Test 3: POST /api/prayers/log duplicate completion rejection...');
    // Seed an already completed prayer for today
    await prisma.prayerLog.create({
      data: {
        userId: user.id,
        prayerName: 'Fajr',
        date: todayStr,
        status: 'on_time',
      },
    });

    const dupRes = await fetch(`${BASE_URL}/api/prayers/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prayerName: 'fajr',
        date: todayStr,
        status: 'on_time',
      }),
    });
    assert.equal(dupRes.status, 409);
    const dupJson = await dupRes.json();
    assert.equal(dupJson.code, 'PRAYER_ALREADY_COMPLETED');
    console.log('✓ API Test 3 Passed: Re-completing already completed prayer returned 409 PRAYER_ALREADY_COMPLETED.');

    console.log('\n🎉 ALL STRICT SAME-DAY TIMING ENFORCEMENT TESTS PASSED! 🎉\n');
  } finally {
    // Cleanup test user and logs
    await prisma.prayerLog.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
