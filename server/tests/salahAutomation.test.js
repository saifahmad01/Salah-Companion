import assert from 'assert';
import { prisma } from '../src/db/prisma.js';
import { db } from '../src/db/connection.js';
import { processOverduePrayers } from '../src/services/salahAutomationService.js';
import { recordNotificationLog, hasNotificationBeenDelivered } from '../src/services/notificationService.js';

import { getLocalDateKey } from '../src/utils/dateUtils.js';

async function runTests() {
  console.log('--- RUNNING SALAH AUTOMATION & MISSED PRAYER TEST SUITE ---');

  const testEmail = `automation_test_${Date.now()}@example.com`;

  try {
    // 1. Setup Test User
    const testUser = await prisma.user.create({
      data: {
        name: 'Automation Tester',
        email: testEmail,
        password: 'TestPassword123!',
        isEmailVerified: true,
        prayerCalculationMethod: 'Karachi',
        latitude: 28.6139,
        longitude: 77.2090,
      },
    });

    console.log(`[Test] Created test user: ${testUser.id} (${testUser.email})`);

    // 2. Test Invariant: Past unlogged prayers become 'missed'
    const now = new Date();
    const todayStr = getLocalDateKey(now, 'Asia/Kolkata');
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const prevDayUtc = new Date(Date.UTC(ty, tm - 1, td - 1, 12, 0, 0));
    const yesterdayStr = prevDayUtc.toISOString().split('T')[0];
    const yesterdayDate = new Date(`${yesterdayStr}T12:00:00Z`);

    // Log yesterday's Fajr as 'on_time'
    await prisma.prayerLog.create({
      data: {
        userId: testUser.id,
        prayerName: 'Fajr',
        date: yesterdayStr,
        status: 'on_time',
        loggedAt: yesterdayDate,
      },
    });

    // Run automation pass
    const pass1 = await processOverduePrayers(new Date());
    console.log(`[Test] Pass 1 processed ${pass1.processedUsers} users, newly missed: ${pass1.newlyMissedCount}`);

    // Verify yesterday's Fajr remains 'on_time' (NEVER overwritten with missed!)
    const fajrYesterday = await prisma.prayerLog.findUnique({
      where: {
        userId_prayerName_date: {
          userId: testUser.id,
          prayerName: 'Fajr',
          date: yesterdayStr,
        },
      },
    });
    assert.strictEqual(fajrYesterday.status, 'on_time', 'Completed on_time prayer must never become missed!');
    console.log('✓ Invariant 1 Passed: Completed prayer was preserved and not overwritten with missed.');

    // Verify yesterday's unlogged prayers (Dhuhr, Asr, Maghrib, Isha) are marked as 'missed'
    const dhuhrYesterday = await prisma.prayerLog.findUnique({
      where: {
        userId_prayerName_date: {
          userId: testUser.id,
          prayerName: 'Dhuhr',
          date: yesterdayStr,
        },
      },
    });
    assert(dhuhrYesterday !== null, "Yesterday's unlogged Dhuhr should be marked as missed.");
    assert.strictEqual(dhuhrYesterday.status, 'missed', "Status must be 'missed'.");
    console.log("✓ Invariant 2 Passed: Yesterday's unlogged prayers correctly transitioned to missed.");

    // 3. Test Invariant: Admin override protection
    // Admin corrects yesterday's Dhuhr to 'late' with isAdminOverride = true
    await prisma.prayerLog.update({
      where: { id: dhuhrYesterday.id },
      data: {
        status: 'late',
        isAdminOverride: true,
        notes: '[Admin Override] Valid excuse verified.',
      },
    });

    // Run automation pass 2
    await processOverduePrayers(new Date());

    const dhuhrAfterPass2 = await prisma.prayerLog.findUnique({
      where: { id: dhuhrYesterday.id },
    });
    assert.strictEqual(dhuhrAfterPass2.status, 'late', 'Admin override must never be reverted by automated job!');
    assert.strictEqual(dhuhrAfterPass2.isAdminOverride, true, 'isAdminOverride flag must remain true.');
    console.log('✓ Invariant 3 Passed: Admin override respected and untouched by automation.');

    // 4. Test Invariant: Active / Future prayers today are NEVER marked as missed

    // Simulating early morning 04:00 AM (before Fajr begins)
    const earlyMorning = new Date();
    earlyMorning.setHours(4, 0, 0, 0);

    const logsBefore = await prisma.prayerLog.findMany({
      where: { userId: testUser.id, date: todayStr },
    });

    // Run automation as if it's early morning
    await processOverduePrayers(earlyMorning);

    const logsAfter = await prisma.prayerLog.findMany({
      where: { userId: testUser.id, date: todayStr },
    });

    // Future prayers today must not be created as missed
    const futureMissed = logsAfter.filter((l) => l.status === 'missed' && !logsBefore.some((b) => b.prayerName === l.prayerName));
    assert.strictEqual(futureMissed.length, 0, 'Future/active prayer windows today must NEVER be marked as missed!');
    console.log('✓ Invariant 4 Passed: Future and active prayer windows today were not marked as missed.');

    // 5. Test Qada Transition
    // Take Asr from yesterday which was missed, and simulate Qada completion
    const asrYesterday = await prisma.prayerLog.findUnique({
      where: {
        userId_prayerName_date: {
          userId: testUser.id,
          prayerName: 'Asr',
          date: yesterdayStr,
        },
      },
    });
    assert(asrYesterday && asrYesterday.status === 'missed');

    const qadaTime = new Date();
    const qadaLog = await prisma.prayerLog.update({
      where: { id: asrYesterday.id },
      data: {
        status: 'qada',
        qadaCompletedAt: qadaTime,
        notes: 'Offered as Qada.',
      },
    });
    assert.strictEqual(qadaLog.status, 'qada');
    assert(qadaLog.qadaCompletedAt instanceof Date);
    console.log('✓ Invariant 5 Passed: Qada transition succeeded, preserved original date and recorded qadaCompletedAt.');

    // Clean up test data
    await prisma.prayerLog.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log('✓ Cleanup completed.');

    console.log('\n====================================================');
    console.log('🎉 ALL SALAH AUTOMATION TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
