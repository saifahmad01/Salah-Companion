import { prisma } from '../db/prisma.js';
import { calculatePrayers } from './prayerService.js';
import { getLocalDateKey } from '../utils/dateUtils.js';
import {
  getUserPreferences,
  sendMissedPrayerNotification,
} from './notificationService.js';

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/**
 * Checks whether prayer is Friday Midday (Dhuhr or Jumu'ah)
 */
function isFridayMidday(prayerName) {
  const p = (prayerName || '').toLowerCase().trim();
  return p === 'dhuhr' || p === 'juma' || p === 'jumuah' || p === "jumu'ah" || p === 'jummah';
}

/**
 * Evaluates whether prayer is Friday
 */
function isDateFriday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCDay() === 5;
}

/**
 * Core Automation Service:
 * Automatically marks pending/unlogged prayers as 'missed' once their authoritative prayer deadline elapses.
 *
 * Invariants:
 * 1. Completed prayers ('on_time', 'late', 'qada') NEVER become 'missed'.
 * 2. Active or future prayer windows are NEVER marked as 'missed'.
 * 3. Records with 'isAdminOverride: true' are NEVER modified or reverted.
 * 4. Friday midday unifies Dhuhr and Jumu'ah so completing either prevents the other from being missed.
 *
 * @param {Date} [simulatedNow] Optional custom timestamp for deterministic testing
 * @returns {Promise<{ processedUsers: number, newlyMissedCount: number, errors: string[] }>}
 */
export async function processOverduePrayers(simulatedNow = null) {
  const now = simulatedNow instanceof Date ? simulatedNow : new Date();
  const summary = {
    processedUsers: 0,
    newlyMissedCount: 0,
    errors: [],
  };

  try {
    // 1. Fetch all registered users with their location and calculation settings
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        latitude: true,
        longitude: true,
        prayerCalculationMethod: true,
      },
    });

    for (const user of users) {
      try {
        summary.processedUsers++;

        // 2. Resolve user's notification preferences, timezone & coordinates
        const prefs = await getUserPreferences(user.id);
        const timezone = prefs?.timezone || 'Asia/Kolkata';
        const lat = typeof user.latitude === 'number' ? user.latitude : (prefs?.latitude || 28.6139);
        const lng = typeof user.longitude === 'number' ? user.longitude : (prefs?.longitude || 77.2090);
        const method = user.prayerCalculationMethod || prefs?.calculationMethod || 'Karachi';
        const madhab = prefs?.madhab || 'Hanafi';

        // 3. Resolve user local date keys
        const todayStr = getLocalDateKey(now, timezone);

        // Calculate yesterday string mathematically from local today
        const [ty, tm, td] = todayStr.split('-').map(Number);
        const prevDayUtc = new Date(Date.UTC(ty, tm - 1, td - 1, 12, 0, 0));
        const yesterdayStr = prevDayUtc.toISOString().split('T')[0];

        // Fetch existing prayer logs for yesterday and today
        const existingLogs = await prisma.prayerLog.findMany({
          where: {
            userId: user.id,
            date: { in: [yesterdayStr, todayStr] },
          },
        });

        // Map logs by `${date}_${prayerName.toLowerCase()}`
        const logMap = new Map();
        for (const log of existingLogs) {
          logMap.set(`${log.date}_${log.prayerName.toLowerCase()}`, log);
        }

        // ====================================================================
        // A. PAST DATE (YESTERDAY) OVERDUE EVALUATION
        // All unlogged prayers for past dates have definitively expired
        // ====================================================================
        const isYesterdayFriday = isDateFriday(yesterdayStr);
        for (const prayer of PRAYERS) {
          const key = `${yesterdayStr}_${prayer}`;
          let log = logMap.get(key);

          // On Friday, check if Jumu'ah was recorded instead of Dhuhr
          if (!log && isYesterdayFriday && prayer === 'dhuhr') {
            log = logMap.get(`${yesterdayStr}_jumu'ah`) || logMap.get(`${yesterdayStr}_juma`);
          }

          if (!log) {
            // Unlogged past prayer -> Mark as missed
            try {
              await prisma.prayerLog.create({
                data: {
                  userId: user.id,
                  prayerName: prayer.charAt(0).toUpperCase() + prayer.slice(1),
                  date: yesterdayStr,
                  status: 'missed',
                  isAdminOverride: false,
                  notes: 'Automatically marked as missed after prayer day window expired.',
                  loggedAt: now,
                },
              });
              summary.newlyMissedCount++;
            } catch (err) {
              // Ignore unique constraint conflict if concurrently logged
              if (!err?.message?.includes('Unique constraint')) {
                throw err;
              }
            }
          }
        }

        // ====================================================================
        // B. CURRENT DATE (TODAY) OVERDUE EVALUATION
        // Evaluates astronomical deadlines for today's prayers
        // ====================================================================
        const todayTimes = calculatePrayers({
          latitude: lat,
          longitude: lng,
          method,
          madhab,
          targetDate: now,
        });

        const times = todayTimes.times || {};
        const isTodayFriday = isDateFriday(todayStr);

        // Deadlines definitions:
        // Fajr ends at Sunrise
        // Dhuhr ends at Asr start
        // Asr ends at Maghrib start (Sunset)
        // Maghrib ends at Isha start
        const prayerDeadlines = [
          {
            name: 'fajr',
            displayName: 'Fajr',
            deadline: times.sunrise ? new Date(times.sunrise) : null,
            startTime: times.fajr ? new Date(times.fajr) : null,
          },
          {
            name: 'dhuhr',
            displayName: 'Dhuhr',
            deadline: times.asr ? new Date(times.asr) : null,
            startTime: times.dhuhr ? new Date(times.dhuhr) : null,
          },
          {
            name: 'asr',
            displayName: 'Asr',
            deadline: times.maghrib ? new Date(times.maghrib) : null,
            startTime: times.asr ? new Date(times.asr) : null,
          },
          {
            name: 'maghrib',
            displayName: 'Maghrib',
            deadline: times.isha ? new Date(times.isha) : null,
            startTime: times.maghrib ? new Date(times.maghrib) : null,
          },
        ];

        for (const { name, displayName, deadline, startTime } of prayerDeadlines) {
          // If current time is past the deadline, prayer window has expired
          if (deadline && now > deadline) {
            const key = `${todayStr}_${name}`;
            let log = logMap.get(key);

            // On Friday, check if Jumu'ah was recorded instead of Dhuhr
            if (!log && isTodayFriday && name === 'dhuhr') {
              log = logMap.get(`${todayStr}_jumu'ah`) || logMap.get(`${todayStr}_juma`);
            }

            if (!log) {
              // Prayer was not logged before its window expired -> Mark missed
              try {
                await prisma.prayerLog.create({
                  data: {
                    userId: user.id,
                    prayerName: displayName,
                    date: todayStr,
                    status: 'missed',
                    isAdminOverride: false,
                    prayerStartTime: startTime ? startTime.toISOString() : null,
                    prayerEndTime: deadline ? deadline.toISOString() : null,
                    notes: `Automatically marked as missed after ${displayName} window expired at ${deadline.toLocaleTimeString()}.`,
                    loggedAt: now,
                  },
                });

                summary.newlyMissedCount++;

                // Send missed notification if enabled
                await sendMissedPrayerNotification({
                  userId: user.id,
                  prayerName: name,
                  date: todayStr,
                }).catch((e) => console.warn('[SalahAutomation] Missed notification error:', e.message));
              } catch (err) {
                if (!err?.message?.includes('Unique constraint')) {
                  throw err;
                }
              }
            }
          }
        }
      } catch (userErr) {
        summary.errors.push(`User ${user.id}: ${userErr.message}`);
        console.error(`[SalahAutomation] Error processing user ${user.id}:`, userErr.message);
      }
    }

    if (summary.newlyMissedCount > 0) {
      console.log(
        `[SalahAutomation] Completed: Processed ${summary.processedUsers} users. Marked ${summary.newlyMissedCount} overdue prayers as missed.`
      );
    }
  } catch (globalErr) {
    console.error('[SalahAutomation] Global automation processing error:', globalErr);
    summary.errors.push(globalErr.message);
  }

  return summary;
}

let automationInterval = null;

/**
 * Initializes the background scheduler running every 5 minutes and once on startup
 */
export function startSalahAutomationScheduler(intervalMs = 5 * 60 * 1000) {
  if (automationInterval) {
    clearInterval(automationInterval);
  }

  console.log('[SalahAutomation] Starting automated overdue prayer background scheduler (interval: 5m)...');

  // Run initial pass after brief 5-second warmup
  setTimeout(() => {
    processOverduePrayers().catch((err) =>
      console.error('[SalahAutomation] Initial startup run failed:', err.message)
    );
  }, 5000);

  // Periodic recurring check
  automationInterval = setInterval(() => {
    processOverduePrayers().catch((err) =>
      console.error('[SalahAutomation] Scheduled run failed:', err.message)
    );
  }, intervalMs);

  return automationInterval;
}

/**
 * Stops the background scheduler
 */
export function stopSalahAutomationScheduler() {
  if (automationInterval) {
    clearInterval(automationInterval);
    automationInterval = null;
    console.log('[SalahAutomation] Stopped automated overdue prayer background scheduler.');
  }
}
