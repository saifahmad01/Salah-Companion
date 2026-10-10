import assert from 'node:assert/strict';
import { db } from '../src/db/connection.js';
import { calculatePrayers } from '../src/services/prayerService.js';
import {
  getUserPreferences,
  saveUserPreferences,
  recordNotificationLog,
  hasNotificationBeenDelivered,
  isPrayerCompleted,
  getNotificationHistory,
  PRAYER_START_REMINDERS,
  PRAYER_PENDING_REMINDERS,
} from '../src/services/notificationService.js';
import { checkAndSendDueNotifications } from '../src/services/notificationScheduler.js';
import { recordPrayerLog } from '../src/services/logService.js';

console.log('--- Running Production Salah Notification Service Tests ---');

async function runTests() {
  const testUserId = `test_user_${Date.now()}`;

  // Cleanup test user if exists
  db.prepare(`DELETE FROM notification_preferences WHERE user_id = ?`).run(testUserId);
  db.prepare(`DELETE FROM notification_logs WHERE user_id = ?`).run(testUserId);
  db.prepare(`DELETE FROM prayer_logs WHERE user_id = ?`).run(testUserId);

  // --------------------------------------------------------------------------
  // Scenario 1: Configure user preferences and verify accurate calculation
  // --------------------------------------------------------------------------
  console.log('Test 1: Setting user location and preferences...');
  const initialPrefs = saveUserPreferences(testUserId, {
    prayerStartEnabled: true,
    reminder30MinEnabled: true,
    browserPushEnabled: false,
    fajrEnabled: true,
    dhuhrEnabled: true,
    asrEnabled: true,
    maghribEnabled: true,
    ishaEnabled: true,
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    calculationMethod: 'Karachi',
    madhab: 'Hanafi',
  });

  assert.equal(initialPrefs.userId, testUserId);
  assert.equal(initialPrefs.prayerStartEnabled, true);
  assert.equal(initialPrefs.reminder30MinEnabled, true);
  console.log('✓ Test 1: User preferences saved & retrieved correctly');

  // --------------------------------------------------------------------------
  // Scenario 2: Prayer-start notification appears at configured prayer time
  // --------------------------------------------------------------------------
  console.log('Test 2: Verifying prayer-start notification at Dhuhr time...');
  const testDate = new Date('2026-10-10T00:00:00Z');
  const timetable = calculatePrayers({
    latitude: 28.6139,
    longitude: 77.2090,
    method: 'Karachi',
    madhab: 'Hanafi',
    targetDate: testDate,
  });

  const dhuhrStart = new Date(timetable.times.dhuhr);
  // Simulate scheduler running at exactly Dhuhr start + 1 minute
  const simulationTime = new Date(dhuhrStart.getTime() + 60 * 1000);

  const result1 = await checkAndSendDueNotifications({ now: simulationTime });
  assert(result1.startDelivered >= 1, 'Should deliver at least one start notification');

  const history1 = getNotificationHistory(testUserId);
  const dhuhrStartNotif = history1.find(
    (n) => n.prayerName === 'dhuhr' && n.reminderType === 'start'
  );

  assert(dhuhrStartNotif, 'Dhuhr start notification must be recorded');
  assert(
    dhuhrStartNotif.body.includes(PRAYER_START_REMINDERS.dhuhr.reminder),
    'Notification body must match authentic reminder text'
  );
  console.log('✓ Test 2: Prayer-start notification recorded at prayer time');

  // --------------------------------------------------------------------------
  // Scenario 3: Idempotency (no duplicate notification for the same event)
  // --------------------------------------------------------------------------
  console.log('Test 3: Testing duplicate prevention (idempotency)...');
  const result2 = await checkAndSendDueNotifications({ now: simulationTime });
  assert.equal(
    result2.startDelivered,
    0,
    'Duplicate start notification must NOT be delivered on subsequent runs'
  );

  const history2 = getNotificationHistory(testUserId);
  const dhuhrCount = history2.filter(
    (n) => n.prayerName === 'dhuhr' && n.reminderType === 'start'
  ).length;
  assert.equal(dhuhrCount, 1, 'Exactly one record must exist in database');
  console.log('✓ Test 3: Idempotent deduplication verified');

  // --------------------------------------------------------------------------
  // Scenario 4: Pending prayer reminder 30 minutes before next prayer window ends
  // --------------------------------------------------------------------------
  console.log('Test 4: Verifying 30-minute reminder for pending Dhuhr...');
  const asrStart = new Date(timetable.times.asr);
  // Dhuhr window ends when Asr begins; reminder is scheduled 30 min before Asr
  const thirtyMinBeforeAsr = new Date(asrStart.getTime() - 28 * 60 * 1000); // 28 mins before Asr (within 30m window)

  const result3 = await checkAndSendDueNotifications({ now: thirtyMinBeforeAsr });
  assert(result3.remindersDelivered >= 1, 'Should deliver 30-min reminder for pending Dhuhr');

  const history3 = getNotificationHistory(testUserId);
  const dhuhr30MinNotif = history3.find(
    (n) => n.prayerName === 'dhuhr' && n.reminderType === 'reminder_30min'
  );

  assert(dhuhr30MinNotif, '30-minute pending reminder for Dhuhr must exist');
  assert(
    dhuhr30MinNotif.body.includes(PRAYER_PENDING_REMINDERS.dhuhr.reminder),
    'Pending reminder text must match'
  );
  console.log('✓ Test 4: 30-minute pending reminder triggered as scheduled');

  // --------------------------------------------------------------------------
  // Scenario 5: No pending reminder sent after prayer is marked completed
  // --------------------------------------------------------------------------
  console.log('Test 5: Verifying completed prayer does NOT receive pending reminder...');
  const maghribStart = new Date(timetable.times.maghrib);
  const dateKey = thirtyMinBeforeAsr.toISOString().split('T')[0];

  // Mark Asr as completed (on_time) before reminder window
  recordPrayerLog({
    userId: testUserId,
    prayerName: 'asr',
    prayerStartTime: asrStart.toISOString(),
    prayerEndTime: maghribStart.toISOString(),
    overrideStatus: 'on_time',
  });

  assert(
    isPrayerCompleted(testUserId, 'asr', dateKey),
    'Asr should now be registered as completed'
  );

  // Simulate time 20 mins before Maghrib
  const twentyMinBeforeMaghrib = new Date(maghribStart.getTime() - 20 * 60 * 1000);
  const result4 = await checkAndSendDueNotifications({ now: twentyMinBeforeMaghrib });

  const history4 = getNotificationHistory(testUserId);
  const asr30MinNotif = history4.find(
    (n) => n.prayerName === 'asr' && n.reminderType === 'reminder_30min'
  );
  assert.equal(asr30MinNotif, undefined, 'Completed prayer must NOT receive 30-minute reminder');
  console.log('✓ Test 5: Completed prayer correctly skipped');

  // --------------------------------------------------------------------------
  // Scenario 6: Disabled notifications are not delivered
  // --------------------------------------------------------------------------
  console.log('Test 6: Verifying disabled notification setting...');
  saveUserPreferences(testUserId, {
    maghribEnabled: false, // User disabled Maghrib notifications
  });

  const maghribSimulationTime = new Date(maghribStart.getTime() + 60 * 1000);
  await checkAndSendDueNotifications({ now: maghribSimulationTime });

  const history5 = getNotificationHistory(testUserId);
  const maghribNotif = history5.find(
    (n) => n.prayerName === 'maghrib' && n.reminderType === 'start'
  );
  assert.equal(maghribNotif, undefined, 'Disabled prayer must NOT trigger notifications');
  console.log('✓ Test 6: Disabled notification respect confirmed');

  // --------------------------------------------------------------------------
  // Scenario 7: Timezone and location changes update future calculations
  // --------------------------------------------------------------------------
  console.log('Test 7: Verifying location update recalculation...');
  // Update location to London
  saveUserPreferences(testUserId, {
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
    calculationMethod: 'MWL',
  });

  const londonPrefs = getUserPreferences(testUserId);
  assert.equal(londonPrefs.calculationMethod, 'MWL');
  assert.equal(londonPrefs.timezone, 'Europe/London');

  const londonTimetable = calculatePrayers({
    latitude: londonPrefs.latitude,
    longitude: londonPrefs.longitude,
    method: londonPrefs.calculationMethod,
    targetDate: testDate,
  });

  assert.notEqual(
    londonTimetable.times.dhuhr,
    timetable.times.dhuhr,
    'London prayer times must differ from Delhi prayer times'
  );
  console.log('✓ Test 7: Location and calculation method updates reflected');

  // --------------------------------------------------------------------------
  // Scenario 8: Midnight boundaries handled correctly (Isha to Fajr)
  // --------------------------------------------------------------------------
  console.log('Test 8: Verifying midnight boundary handling...');
  const ishaStart = new Date(timetable.times.isha);
  // Tomorrow's Fajr
  const tomorrow = new Date(testDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimetable = calculatePrayers({
    latitude: 28.6139,
    longitude: 77.2090,
    method: 'Karachi',
    targetDate: tomorrow,
  });

  const tomorrowFajr = new Date(tomorrowTimetable.times.fajr);
  assert(
    tomorrowFajr.getTime() > ishaStart.getTime(),
    'Tomorrow Fajr must be strictly after Isha'
  );
  console.log('✓ Test 8: Midnight boundary handled accurately');

  // --------------------------------------------------------------------------
  // Scenario 9: Stale schedule protection (late login / past time)
  // --------------------------------------------------------------------------
  console.log('Test 9: Verifying stale notification protection...');
  // Simulate a time 4 hours past Fajr (stale)
  const fajrStart = new Date(timetable.times.fajr);
  const fourHoursPastFajr = new Date(fajrStart.getTime() + 4 * 3600 * 1000);

  // Fresh user without notifications yet
  const staleTestUser = `stale_user_${Date.now()}`;
  saveUserPreferences(staleTestUser, {
    latitude: 28.6139,
    longitude: 77.2090,
  });

  await checkAndSendDueNotifications({ now: fourHoursPastFajr });

  const staleHistory = getNotificationHistory(staleTestUser);
  const staleFajr = staleHistory.find(
    (n) => n.prayerName === 'fajr' && n.reminderType === 'start'
  );
  assert.equal(
    staleFajr,
    undefined,
    'Stale notification must NOT be delivered when logging in late'
  );
  console.log('✓ Test 9: Stale notification protection confirmed');

  // --------------------------------------------------------------------------
  // Scenario 10: Server restart simulation (does not duplicate records)
  // --------------------------------------------------------------------------
  console.log('Test 10: Testing server restart safety...');
  const countBefore = getNotificationHistory(testUserId).filter(
    (n) => n.prayerName === 'dhuhr' && n.reminderType === 'start'
  ).length;

  // Run scheduler check again after "restart"
  await checkAndSendDueNotifications({ now: simulationTime });

  const countAfter = getNotificationHistory(testUserId).filter(
    (n) => n.prayerName === 'dhuhr' && n.reminderType === 'start'
  ).length;

  assert.equal(
    countAfter,
    countBefore,
    'Server restart must not create duplicate reminders for existing user'
  );
  assert.equal(countAfter, 1, 'Exactly one Dhuhr start notification must remain');
  console.log('✓ Test 10: Server restart safety verified');

  // Clean up test data
  db.prepare(`DELETE FROM notification_preferences WHERE user_id IN (?, ?)`).run(
    testUserId,
    staleTestUser
  );
  db.prepare(`DELETE FROM notification_logs WHERE user_id IN (?, ?)`).run(
    testUserId,
    staleTestUser
  );
  db.prepare(`DELETE FROM prayer_logs WHERE user_id = ?`).run(testUserId);

  console.log('\n--- ALL 10 Salah Notification Test Scenarios Passed! ---');
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
