import { db } from '../db/connection.js';

/**
 * Generates an array of YYYY-MM-DD strings for the past N days up to today
 */
function getLastNDates(daysCount = 7, referenceDate = new Date()) {
  const dates = [];
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

/**
 * Calculates user's prayer completion history for the last 7 days and active streak
 * @param {string} userId
 */
export function getUserPrayerStats(userId) {
  if (!userId) {
    throw new Error('userId is required.');
  }

  // Ensure user exists
  const ensureUserStmt = db.prepare(`
    INSERT OR IGNORE INTO users (id, name) VALUES (?, ?)
  `);
  ensureUserStmt.run(userId, `User-${userId.slice(0, 6)}`);

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);

  const PRAYER_NAMES = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const last7DaysList = getLastNDates(7); // [today, yesterday, ..., 6 days ago]
  const oldestDate = last7DaysList[last7DaysList.length - 1];
  const newestDate = last7DaysList[0];

  // Fetch all prayer logs in the 7-day window
  const logsQuery = db.prepare(`
    SELECT * FROM prayer_logs
    WHERE user_id = ? AND date >= ? AND date <= ?
    ORDER BY date DESC, prayer_start_time ASC
  `);
  const logs = logsQuery.all(userId, oldestDate, newestDate);

  // Group logs by date
  const logsByDate = {};
  for (const log of logs) {
    if (!logsByDate[log.date]) {
      logsByDate[log.date] = {};
    }
    logsByDate[log.date][log.prayer_name] = log;
  }

  let totalLogged = 0;
  let onTimeCount = 0;
  let lateCount = 0;
  let missedCount = 0;

  // Build daily breakdown
  const dailyHistory = last7DaysList.map((dateStr) => {
    const dayLogs = logsByDate[dateStr] || {};
    let dayCompleted = 0;

    const prayers = PRAYER_NAMES.map((name) => {
      const record = dayLogs[name];
      if (record) {
        totalLogged++;
        if (record.status === 'on_time') {
          onTimeCount++;
          dayCompleted++;
        } else if (record.status === 'late') {
          lateCount++;
          dayCompleted++;
        } else if (record.status === 'missed') {
          missedCount++;
        }
        return {
          prayer: name,
          status: record.status,
          loggedAt: record.logged_at,
          startTime: record.prayer_start_time,
          endTime: record.prayer_end_time,
        };
      }
      return {
        prayer: name,
        status: 'unlogged',
        loggedAt: null,
        startTime: null,
        endTime: null,
      };
    });

    const completionRate = Math.round((dayCompleted / 5) * 100);

    return {
      date: dateStr,
      dayCompletedCount: dayCompleted,
      completionRate,
      prayers,
    };
  });

  // Calculate Streak:
  // Streak = consecutive calendar days ending today (or yesterday if today has no logs yet)
  // where the user logged at least one completed prayer (on_time or late).
  const allUserCompletedDatesQuery = db.prepare(`
    SELECT DISTINCT date
    FROM prayer_logs
    WHERE user_id = ? AND (status = 'on_time' OR status = 'late')
    ORDER BY date DESC
  `);
  const completedDateRows = allUserCompletedDatesQuery.all(userId);
  const completedDatesSet = new Set(completedDateRows.map((r) => r.date));

  let currentStreak = 0;
  const checkDate = new Date();
  const todayStr = checkDate.toISOString().split('T')[0];

  checkDate.setDate(checkDate.getDate() - 1);
  const yesterdayStr = checkDate.toISOString().split('T')[0];

  // Start streak check either from today if today has prayer, or from yesterday
  let anchor = new Date();
  if (!completedDatesSet.has(todayStr)) {
    // If today has no completed prayer yet, check if yesterday was active to preserve streak
    if (completedDatesSet.has(yesterdayStr)) {
      anchor.setDate(anchor.getDate() - 1);
    } else {
      anchor = null; // Streak broken
    }
  }

  if (anchor) {
    while (true) {
      const dStr = anchor.toISOString().split('T')[0];
      if (completedDatesSet.has(dStr)) {
        currentStreak++;
        anchor.setDate(anchor.getDate() - 1);
      } else {
        break;
      }
    }
  }

  const completedTotal = onTimeCount + lateCount;
  const onTimePercentage = completedTotal > 0 ? Math.round((onTimeCount / completedTotal) * 100) : 0;
  const weeklyCompletionRate = Math.round((completedTotal / 35) * 100); // 35 prayers total in 7 days

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    streak: {
      currentStreakDays: currentStreak,
      description: currentStreak === 1 ? '1 day streak' : `${currentStreak} days streak`,
    },
    weeklySummary: {
      totalLogged,
      completedTotal,
      onTimeCount,
      lateCount,
      missedCount,
      onTimePercentage,
      weeklyCompletionRate,
    },
    last7Days: dailyHistory,
  };
}
