import { db } from '../db/connection.js';
import { calculatePrayers } from './prayerService.js';
import {
  PRAYER_START_REMINDERS,
  PRAYER_PENDING_REMINDERS,
  isPrayerCompleted,
  hasNotificationBeenDelivered,
  recordNotificationLog,
  sendPushToUser,
} from './notificationService.js';

let schedulerInterval = null;
const CHECK_INTERVAL_MS = 30 * 1000; // Check every 30 seconds for punctuality
const FRESHNESS_WINDOW_MS = 15 * 60 * 1000; // 15-minute maximum tolerance for start reminder

/**
 * Capitalizes string
 */
function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Format time to 12-hour format string (e.g. "5:12 AM")
 */
function formatTime12(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Evaluates and delivers due notifications across all configured users/preferences
 * @param {object} [options]
 * @param {Date} [options.now] Custom date for testing scenarios
 */
export async function checkAndSendDueNotifications({ now = new Date() } = {}) {
  // 1. Fetch all user notification preferences
  const prefStmt = db.prepare(`SELECT * FROM notification_preferences`);
  let preferencesList = prefStmt.all();

  // If no preferences are stored yet, provide a default profile for guest_user
  if (!preferencesList || preferencesList.length === 0) {
    preferencesList = [
      {
        user_id: 'guest_user',
        prayer_start_enabled: 1,
        reminder_30min_enabled: 1,
        browser_push_enabled: 0,
        fajr_enabled: 1,
        dhuhr_enabled: 1,
        asr_enabled: 1,
        maghrib_enabled: 1,
        isha_enabled: 1,
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: 'Asia/Kolkata',
        calculation_method: 'Karachi',
        madhab: 'Hanafi',
      },
    ];
  }

  const results = {
    startDelivered: 0,
    remindersDelivered: 0,
    skipped: 0,
  };

  for (const pref of preferencesList) {
    const userId = pref.user_id;
    const lat = pref.latitude ?? 28.6139;
    const lng = pref.longitude ?? 77.2090;
    const method = pref.calculation_method || 'Karachi';
    const madhab = pref.madhab || 'Hanafi';

    // Compute prayer times for current date
    const timetable = calculatePrayers({
      latitude: lat,
      longitude: lng,
      method,
      madhab,
      targetDate: now,
    });

    // Also compute tomorrow's timetable to accurately calculate Isha window end
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowTimetable = calculatePrayers({
      latitude: lat,
      longitude: lng,
      method,
      madhab,
      targetDate: tomorrowDate,
    });

    const dateKey = now.toISOString().split('T')[0];

    const prayerWindows = [
      {
        name: 'fajr',
        enabled: Boolean(pref.fajr_enabled),
        start: new Date(timetable.times.fajr),
        end: new Date(timetable.times.sunrise),
        date: dateKey,
      },
      {
        name: 'dhuhr',
        enabled: Boolean(pref.dhuhr_enabled),
        start: new Date(timetable.times.dhuhr),
        end: new Date(timetable.times.asr),
        date: dateKey,
      },
      {
        name: 'asr',
        enabled: Boolean(pref.asr_enabled),
        start: new Date(timetable.times.asr),
        end: new Date(timetable.times.maghrib),
        date: dateKey,
      },
      {
        name: 'maghrib',
        enabled: Boolean(pref.maghrib_enabled),
        start: new Date(timetable.times.maghrib),
        end: new Date(timetable.times.isha),
        date: dateKey,
      },
      {
        name: 'isha',
        enabled: Boolean(pref.isha_enabled),
        start: new Date(timetable.times.isha),
        end: new Date(tomorrowTimetable.times.fajr),
        date: dateKey,
      },
    ];

    // Check each prayer window
    for (const prayer of prayerWindows) {
      if (!prayer.enabled) {
        results.skipped++;
        continue;
      }

      // ======================================================================
      // 1. PRAYER-START NOTIFICATION
      // ======================================================================
      if (pref.prayer_start_enabled) {
        const isPastStart = now.getTime() >= prayer.start.getTime();
        const isFresh = now.getTime() <= prayer.start.getTime() + FRESHNESS_WINDOW_MS;

        if (isPastStart && isFresh) {
          const alreadySent = hasNotificationBeenDelivered(
            userId,
            prayer.name,
            prayer.date,
            'start'
          );

          if (!alreadySent) {
            const template = PRAYER_START_REMINDERS[prayer.name];
            const formattedTime = formatTime12(prayer.start);
            const title = `${capitalize(prayer.name)} Prayer Time (${formattedTime})`;
            const body = template.reminder;

            const inserted = recordNotificationLog({
              userId,
              prayerName: prayer.name,
              date: prayer.date,
              reminderType: 'start',
              title,
              body,
              prayerTime: prayer.start.toISOString(),
              pushSent: Boolean(pref.browser_push_enabled),
            });

            if (inserted) {
              results.startDelivered++;
              if (pref.browser_push_enabled) {
                await sendPushToUser(userId, {
                  title,
                  body,
                  prayerName: prayer.name,
                  reminderType: 'start',
                });
              }
            }
          }
        }
      }

      // ======================================================================
      // 2. 30-MINUTES BEFORE WINDOW CLOSES (PENDING PRAYER REMINDER)
      // ======================================================================
      if (pref.reminder_30min_enabled) {
        const windowDurationMs = prayer.end.getTime() - prayer.start.getTime();
        const thirtyMinMs = 30 * 60 * 1000;

        // Only send if the prayer interval is long enough (> 30 mins)
        if (windowDurationMs > thirtyMinMs) {
          const reminderTriggerTime = new Date(prayer.end.getTime() - thirtyMinMs);
          const isAtOrPastReminder = now.getTime() >= reminderTriggerTime.getTime();
          const isBeforeWindowCloses = now.getTime() < prayer.end.getTime();

          if (isAtOrPastReminder && isBeforeWindowCloses) {
            // Check if user already offered/completed this prayer
            const completed = isPrayerCompleted(userId, prayer.name, prayer.date);

            if (!completed) {
              const alreadySent = hasNotificationBeenDelivered(
                userId,
                prayer.name,
                prayer.date,
                'reminder_30min'
              );

              if (!alreadySent) {
                const template = PRAYER_PENDING_REMINDERS[prayer.name];
                const title = `Gentle Reminder: ${capitalize(prayer.name)} (30 min remaining)`;
                const body = template.reminder;

                const inserted = recordNotificationLog({
                  userId,
                  prayerName: prayer.name,
                  date: prayer.date,
                  reminderType: 'reminder_30min',
                  title,
                  body,
                  prayerTime: prayer.start.toISOString(),
                  pushSent: Boolean(pref.browser_push_enabled),
                });

                if (inserted) {
                  results.remindersDelivered++;
                  if (pref.browser_push_enabled) {
                    await sendPushToUser(userId, {
                      title,
                      body,
                      prayerName: prayer.name,
                      reminderType: 'reminder_30min',
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return results;
}

/**
 * Start the persistent background notification scheduler
 */
export function startNotificationScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  console.log('[Scheduler] Salah Prayer Notification scheduler initialized (checking every 30s)');

  // Run initial check immediately on server start (safely checks without duplicate hazard)
  checkAndSendDueNotifications().catch((err) => {
    console.error('[Scheduler] Initial notification check failed:', err);
  });

  schedulerInterval = setInterval(() => {
    checkAndSendDueNotifications().catch((err) => {
      console.error('[Scheduler] Error in periodic notification check:', err);
    });
  }, CHECK_INTERVAL_MS);
}

/**
 * Stop scheduler on server shutdown
 */
export function stopNotificationScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Notification scheduler stopped.');
  }
}
