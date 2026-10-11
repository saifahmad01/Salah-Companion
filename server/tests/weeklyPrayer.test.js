import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';

const BASE_URL = process.env.TEST_API_URL || `http://localhost:${config.port || 8080}`;
const JWT_SECRET = config.jwtSecret;

console.log('--- Running Weekly Prayer Overview Integration Tests ---');
console.log(`Target API: ${BASE_URL}\n`);

async function runTests() {
  const timestamp = Date.now();
  const testUserAEmail = `weekly.tester.a.${timestamp}@example.com`;
  const testUserBEmail = `weekly.tester.b.${timestamp}@example.com`;

  // Create two distinct test users in database
  const userA = await prisma.user.create({
    data: {
      name: 'Tester A',
      email: testUserAEmail,
      role: 'USER',
      isEmailVerified: true,
      prayerCalculationMethod: 'Karachi',
    },
  });

  const userB = await prisma.user.create({
    data: {
      name: 'Tester B',
      email: testUserBEmail,
      role: 'USER',
      isEmailVerified: true,
      prayerCalculationMethod: 'Karachi',
    },
  });

  const tokenA = jwt.sign(
    { id: userA.id, email: userA.email, role: userA.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const tokenB = jwt.sign(
    { id: userB.id, email: userB.email, role: userB.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  try {
    // ------------------------------------------------------------------------
    // Test 1: Unauthenticated request rejection
    // ------------------------------------------------------------------------
    console.log('1. Testing route protection on GET /api/prayers/weekly...');
    const unauthRes = await fetch(`${BASE_URL}/api/prayers/weekly`);
    assert.equal(unauthRes.status, 401, 'Unauthenticated request must return 401 Unauthorized');
    console.log('✓ Test 1 Passed: Unauthenticated request rejected with 401.');

    // ------------------------------------------------------------------------
    // Test 2: Empty week state for newly registered user
    // ------------------------------------------------------------------------
    console.log('\n2. Testing empty week state for newly created user...');
    const emptyRes = await fetch(`${BASE_URL}/api/prayers/weekly?startDate=2026-10-05`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(emptyRes.status, 200, `Expected 200 OK, got ${emptyRes.status}`);
    const emptyJson = await emptyRes.json();
    assert.equal(emptyJson.success, true);
    assert.equal(emptyJson.data.startDate, '2026-10-05');
    assert.equal(emptyJson.data.endDate, '2026-10-11');
    assert.equal(emptyJson.data.days.length, 7, 'Must return exactly 7 days');
    assert.equal(emptyJson.data.statistics.totalPossiblePrayers, 35);
    assert.equal(emptyJson.data.statistics.completedPrayers, 0);
    assert.equal(emptyJson.data.statistics.weeklyCompletionRate, 0);

    // Each day must have 5 prayers
    for (const day of emptyJson.data.days) {
      assert.equal(day.prayers.length, 5);
      assert.equal(day.completedCount, 0);
      assert.equal(day.dailyPercentage, 0);
    }
    console.log('✓ Test 2 Passed: Empty week returns 7 days with 0/35 completed and 0% rate.');

    // ------------------------------------------------------------------------
    // Test 3: Log prayers across different days including 'qada'
    // ------------------------------------------------------------------------
    console.log('\n3. Testing logging prayers for user A (on_time, late, qada)...');
    // Log Fajr on Monday (2026-10-05) as on_time
    const log1 = await fetch(`${BASE_URL}/api/prayers/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        prayerName: 'Fajr',
        date: '2026-10-05',
        status: 'on_time',
      }),
    });
    assert.equal(log1.status, 200, 'Logging Fajr must return 200');

    // Log Dhuhr on Monday (2026-10-05) as late
    const log2 = await fetch(`${BASE_URL}/api/prayers/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        prayerName: 'Dhuhr',
        date: '2026-10-05',
        status: 'late',
      }),
    });
    assert.equal(log2.status, 200, 'Logging Dhuhr must return 200');

    // Log Asr on Monday (2026-10-05) as qada
    const log3 = await fetch(`${BASE_URL}/api/prayers/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        prayerName: 'Asr',
        date: '2026-10-05',
        status: 'qada',
      }),
    });
    assert.equal(log3.status, 200, 'Logging Asr as qada must return 200');

    // Log Maghrib on Tuesday (2026-10-06) as on_time
    const log4 = await fetch(`${BASE_URL}/api/prayers/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        prayerName: 'Maghrib',
        date: '2026-10-06',
        status: 'on_time',
      }),
    });
    assert.equal(log4.status, 200, 'Logging Maghrib must return 200');
    const log4Json = await log4.json();
    const maghribLogId = log4Json.data.log.id;
    console.log('✓ Test 3 Passed: Successfully logged 4 prayers across 2 days.');

    // ------------------------------------------------------------------------
    // Test 4: Verify weekly statistics reflect the persisted records
    // ------------------------------------------------------------------------
    console.log('\n4. Testing weekly calculation accuracy...');
    const weekRes = await fetch(`${BASE_URL}/api/prayers/weekly?startDate=2026-10-05`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(weekRes.status, 200);
    const weekJson = await weekRes.json();
    const stats = weekJson.data.statistics;

    assert.equal(stats.completedPrayers, 4, 'Must have 4 completed prayers');
    assert.equal(stats.onTimeCount, 2, '2 on_time prayers');
    assert.equal(stats.lateCount, 1, '1 late prayer');
    assert.equal(stats.qadaCount, 1, '1 qada prayer');
    assert.equal(stats.activeDaysCount, 2, '2 active days (Mon & Tue)');
    // 4 / 35 = 11.4% -> 11%
    assert.equal(stats.weeklyCompletionRate, 11);

    // Monday must have 3 completed out of 5 (60%)
    const monDay = weekJson.data.days.find((d) => d.date === '2026-10-05');
    assert(monDay, 'Monday must be present');
    assert.equal(monDay.completedCount, 3);
    assert.equal(monDay.dailyPercentage, 60);

    // Tuesday must have 1 completed out of 5 (20%)
    const tueDay = weekJson.data.days.find((d) => d.date === '2026-10-06');
    assert(tueDay, 'Tuesday must be present');
    assert.equal(tueDay.completedCount, 1);
    assert.equal(tueDay.dailyPercentage, 20);
    console.log('✓ Test 4 Passed: Accurate weekly stats and daily completion breakdown verified.');

    // ------------------------------------------------------------------------
    // Test 5: Update prayer status via PATCH /api/prayers/log/:id
    // ------------------------------------------------------------------------
    console.log('\n5. Testing PATCH /api/prayers/log/:id (updating prayer record)...');
    const patchRes = await fetch(`${BASE_URL}/api/prayers/log/${maghribLogId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        status: 'late',
        notes: 'Offered right before Isha time started',
      }),
    });
    assert.equal(patchRes.status, 200);
    const patchJson = await patchRes.json();
    assert.equal(patchJson.data.status, 'late');
    assert.equal(patchJson.data.notes, 'Offered right before Isha time started');

    // Confirm update in weekly overview
    const weekAfterPatch = await fetch(`${BASE_URL}/api/prayers/weekly?startDate=2026-10-05`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const weekAfterPatchJson = await weekAfterPatch.json();
    assert.equal(weekAfterPatchJson.data.statistics.lateCount, 2);
    assert.equal(weekAfterPatchJson.data.statistics.onTimeCount, 1);
    console.log('✓ Test 5 Passed: Successfully updated prayer status and verified in weekly stats.');

    // ------------------------------------------------------------------------
    // Test 6: User Isolation (User B cannot see or alter User A's logs)
    // ------------------------------------------------------------------------
    console.log('\n6. Testing user data isolation and authorization...');
    const userBWeek = await fetch(`${BASE_URL}/api/prayers/weekly?startDate=2026-10-05`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const userBJson = await userBWeek.json();
    assert.equal(userBJson.data.statistics.completedPrayers, 0, 'User B must see 0 completed prayers');

    // User B attempts to patch User A's log
    const forbiddenPatch = await fetch(`${BASE_URL}/api/prayers/log/${maghribLogId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ status: 'missed' }),
    });
    assert.equal(forbiddenPatch.status, 403, 'User B must be forbidden from updating User A log');
    console.log('✓ Test 6 Passed: Multi-tenant user isolation confirmed (403 Forbidden).');

    // ------------------------------------------------------------------------
    // Test 7: Week boundary navigation (month boundary & year boundary)
    // ------------------------------------------------------------------------
    console.log('\n7. Testing month and year boundary calculations...');
    // Month boundary: week of 2026-10-26 (Oct 26 - Nov 01)
    const monthBoundaryRes = await fetch(`${BASE_URL}/api/prayers/weekly?startDate=2026-10-26`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const monthBoundaryJson = await monthBoundaryRes.json();
    assert.equal(monthBoundaryJson.data.startDate, '2026-10-26');
    assert.equal(monthBoundaryJson.data.endDate, '2026-11-01');
    assert.equal(monthBoundaryJson.data.days[0].date, '2026-10-26');
    assert.equal(monthBoundaryJson.data.days[6].date, '2026-11-01');

    // Year boundary: week of 2026-12-28 (Dec 28, 2026 - Jan 03, 2027)
    const yearBoundaryRes = await fetch(`${BASE_URL}/api/prayers/weekly?startDate=2026-12-28`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const yearBoundaryJson = await yearBoundaryRes.json();
    assert.equal(yearBoundaryJson.data.startDate, '2026-12-28');
    assert.equal(yearBoundaryJson.data.endDate, '2027-01-03');
    assert.equal(yearBoundaryJson.data.days[0].date, '2026-12-28');
    assert.equal(yearBoundaryJson.data.days[6].date, '2027-01-03');
    console.log('✓ Test 7 Passed: Month boundary and Year boundary weeks calculated correctly.');

    // ------------------------------------------------------------------------
    // Test 8: Invalid date parameter rejection
    // ------------------------------------------------------------------------
    console.log('\n8. Testing invalid date parameters...');
    const invalidDateRes = await fetch(`${BASE_URL}/api/prayers/weekly?startDate=not-a-real-date`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(invalidDateRes.status, 400, 'Invalid date must return 400 Bad Request');
    console.log('✓ Test 8 Passed: Malformed dates correctly rejected with 400.');

    // ------------------------------------------------------------------------
    // Test 9: Delete / Reset prayer log
    // ------------------------------------------------------------------------
    console.log('\n9. Testing DELETE /api/prayers/log/:id...');
    const delRes = await fetch(`${BASE_URL}/api/prayers/log/${maghribLogId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(delRes.status, 200);

    const weekAfterDelete = await fetch(`${BASE_URL}/api/prayers/weekly?startDate=2026-10-05`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const weekAfterDelJson = await weekAfterDelete.json();
    assert.equal(weekAfterDelJson.data.statistics.completedPrayers, 3, 'Must have 3 prayers after delete');
    console.log('✓ Test 9 Passed: Successfully reset prayer log and confirmed stats update.');

    console.log('\n🎉 ALL 9 WEEKLY PRAYER INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
  } finally {
    // Clean up test users and their logs
    await prisma.prayerLog.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id] } },
    });
  }
}

runTests().catch((err) => {
  console.error('\n❌ Weekly Prayer Test Failed:', err);
  process.exit(1);
});
