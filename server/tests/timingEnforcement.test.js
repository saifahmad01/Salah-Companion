import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import { validatePrayerTiming } from '../src/services/prayerService.js';

const BASE_URL = process.env.TEST_API_URL || `http://localhost:${config.port || 8080}`;
const JWT_SECRET = config.jwtSecret;

console.log('--- Running Prayer Completion Timing Enforcement Tests ---');
console.log(`Target API: ${BASE_URL}\n`);

async function runTests() {
  // ------------------------------------------------------------------------
  // Unit Tests: validatePrayerTiming service
  // ------------------------------------------------------------------------
  console.log('1. Testing validatePrayerTiming unit logic...');

  // Future date check
  const futureDateResult = validatePrayerTiming({
    prayerName: 'fajr',
    date: '2099-01-01',
    status: 'on_time',
    now: new Date('2026-10-11T12:00:00Z'),
  });
  assert.equal(futureDateResult.isValid, false);
  assert.equal(futureDateResult.statusCode, 409);
  assert.equal(futureDateResult.code, 'PRAYER_TIME_NOT_STARTED');
  console.log('✓ Unit 1 Passed: Future date strictly rejected with 409 PRAYER_TIME_NOT_STARTED.');

  // Today's prayer before start time check
  // E.g. at 03:00 AM local time, Dhuhr (approx 12:00 PM) has not started yet
  const earlyMorningNow = new Date('2026-10-11T03:00:00+05:30');
  const unstartedDhuhrResult = validatePrayerTiming({
    prayerName: 'dhuhr',
    date: '2026-10-11',
    status: 'on_time',
    latitude: 28.6139,
    longitude: 77.2090,
    now: earlyMorningNow,
  });
  assert.equal(unstartedDhuhrResult.isValid, false);
  assert.equal(unstartedDhuhrResult.statusCode, 409);
  assert.equal(unstartedDhuhrResult.code, 'PRAYER_TIME_NOT_STARTED');
  assert.ok(unstartedDhuhrResult.availableAt, 'Must include availableAt timestamp');
  assert.ok(unstartedDhuhrResult.message.includes('not started yet'), 'Must include clear explanation');
  console.log('✓ Unit 2 Passed: Unstarted prayer for today rejected with 409 and availableAt timestamp.');

  // Today's prayer after start time check
  // E.g. at 13:00 PM local time, Dhuhr has started
  const afternoonNow = new Date('2026-10-11T13:00:00+05:30');
  const startedDhuhrResult = validatePrayerTiming({
    prayerName: 'dhuhr',
    date: '2026-10-11',
    status: 'on_time',
    latitude: 28.6139,
    longitude: 77.2090,
    now: afternoonNow,
  });
  assert.equal(startedDhuhrResult.isValid, true);
  assert.ok(startedDhuhrResult.prayerStartTime);
  assert.ok(startedDhuhrResult.prayerEndTime);
  console.log('✓ Unit 3 Passed: Started prayer for today successfully validated.');

  // Past date check (e.g. yesterday) - should allow logging historical / Qada prayers
  const pastDateResult = validatePrayerTiming({
    prayerName: 'fajr',
    date: '2026-10-10',
    status: 'qada',
    now: afternoonNow,
  });
  assert.equal(pastDateResult.isValid, true);
  console.log('✓ Unit 4 Passed: Past date historical / Qada prayer successfully validated.');

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
    // API Test 1: Attempt to log prayer for future date
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
    assert.equal(futureRes.status, 409, 'Future date must return 409 Conflict');
    const futureJson = await futureRes.json();
    assert.equal(futureJson.code, 'PRAYER_TIME_NOT_STARTED');
    console.log('✓ API Test 1 Passed: Future date returned 409 PRAYER_TIME_NOT_STARTED.');

    // API Test 2: Attempt to log Isha or Fajr for future date via update endpoint
    console.log('API Test 2: POST /api/prayers/log for yesterday (past date)...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const pastRes = await fetch(`${BASE_URL}/api/prayers/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prayerName: 'dhuhr',
        date: yesterdayStr,
        status: 'on_time',
      }),
    });
    assert.ok(pastRes.status === 200 || pastRes.status === 201, 'Past date prayer must return 200 OK or 201 Created');
    const pastJson = await pastRes.json();
    assert.ok(pastJson.data?.log?.id || pastJson.data?.id);
    console.log('✓ API Test 2 Passed: Historical prayer log created successfully.');

    // API Test 3: Idempotent duplicate completion handling
    console.log('API Test 3: POST /api/prayers/log duplicate submission...');
    const dupRes = await fetch(`${BASE_URL}/api/prayers/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prayerName: 'dhuhr',
        date: yesterdayStr,
        status: 'on_time',
      }),
    });
    assert.equal(dupRes.status, 200, 'Duplicate submission must return 200 OK (idempotent)');
    console.log('✓ API Test 3 Passed: Idempotent duplicate handled gracefully with 200 OK.');

    console.log('\n🎉 ALL PRAYER COMPLETION TIMING ENFORCEMENT TESTS PASSED! 🎉\n');
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
