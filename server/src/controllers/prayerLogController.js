import { prisma } from '../db/prisma.js';
import { getHadithByStatus } from '../services/hadithService.js';

const DAILY_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

/**
 * Normalizes prayer names to standard capitalized format: 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'
 * @param {string} name
 */
function normalizePrayerName(name) {
  if (!name) return '';
  const lower = name.toLowerCase().trim();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Generates an array of YYYY-MM-DD strings for the past N days up to reference date
 * @param {number} daysCount
 * @param {Date} [referenceDate]
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
 * POST /api/prayers/log
 * Upserts a prayer completion log for the authenticated user and returns dynamic motivational Hadith
 */
export async function logPrayer(req, res, next) {
  try {
    const userId = req.user.id;
    const { prayerName, date, status, notes } = req.body;

    const normalizedPrayer = normalizePrayerName(prayerName);
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Upsert: Create if not exists, otherwise update status and timestamp
    const log = await prisma.prayerLog.upsert({
      where: {
        userId_prayerName_date: {
          userId,
          prayerName: normalizedPrayer,
          date: targetDate,
        },
      },
      update: {
        status,
        loggedAt: new Date(),
        notes: typeof notes !== 'undefined' ? notes : undefined,
      },
      create: {
        userId,
        prayerName: normalizedPrayer,
        date: targetDate,
        status,
        notes: notes || null,
      },
    });

    // Retrieve tailored authentic Hadith for the logged status
    const hadithInfo = getHadithByStatus(status);

    return res.status(200).json({
      success: true,
      message: `Prayer ${normalizedPrayer} successfully recorded as "${status}".`,
      data: {
        log,
        hadith: hadithInfo.hadith,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/prayers/today
 * Returns all logged prayers for the logged-in user for today's date, showing completed vs pending out of 5
 */
export async function getTodayPrayers(req, res, next) {
  try {
    const userId = req.user.id;
    const targetDate = (req.query.date && typeof req.query.date === 'string')
      ? req.query.date
      : new Date().toISOString().split('T')[0];

    // Fetch existing logs for today
    const existingLogs = await prisma.prayerLog.findMany({
      where: {
        userId,
        date: targetDate,
      },
    });

    const logsByPrayer = {};
    for (const log of existingLogs) {
      logsByPrayer[log.prayerName] = log;
    }

    let completedCount = 0;
    let missedCount = 0;

    const prayers = DAILY_PRAYERS.map((prayerName) => {
      const record = logsByPrayer[prayerName];
      if (record) {
        const isCompleted = record.status === 'on_time' || record.status === 'late';
        if (isCompleted) completedCount++;
        else if (record.status === 'missed') missedCount++;

        return {
          prayerName,
          status: record.status,
          isLogged: true,
          isCompleted,
          loggedAt: record.loggedAt,
          notes: record.notes,
          id: record.id,
        };
      }

      return {
        prayerName,
        status: 'pending',
        isLogged: false,
        isCompleted: false,
        loggedAt: null,
        notes: null,
        id: null,
      };
    });

    const pendingCount = 5 - completedCount - missedCount;
    const completionRate = Math.round((completedCount / 5) * 100);

    return res.status(200).json({
      success: true,
      date: targetDate,
      summary: {
        total: 5,
        completed: completedCount,
        pending: pendingCount,
        missed: missedCount,
        completionRate,
      },
      prayers,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/prayers/history?days=7
 * Fetches prayer completion logs for the last X days (default: 7 days) grouped by date
 */
export async function getPrayerHistory(req, res, next) {
  try {
    const userId = req.user.id;
    const daysParam = parseInt(req.query.days || '7', 10);
    const daysCount = Math.max(1, Math.min(90, isNaN(daysParam) ? 7 : daysParam));

    const dateList = getLastNDates(daysCount); // [today, yesterday, ...]
    const oldestDate = dateList[dateList.length - 1];
    const newestDate = dateList[0];

    // Fetch all logs in range
    const logs = await prisma.prayerLog.findMany({
      where: {
        userId,
        date: {
          gte: oldestDate,
          lte: newestDate,
        },
      },
      orderBy: [
        { date: 'desc' },
        { loggedAt: 'asc' },
      ],
    });

    // Group logs by date
    const logsByDate = {};
    for (const log of logs) {
      if (!logsByDate[log.date]) {
        logsByDate[log.date] = {};
      }
      logsByDate[log.date][log.prayerName] = log;
    }

    // Build complete daily history array
    const history = dateList.map((dateStr) => {
      const dayLogs = logsByDate[dateStr] || {};
      let completedCount = 0;
      let onTimeCount = 0;
      let lateCount = 0;
      let missedCount = 0;

      const prayers = DAILY_PRAYERS.map((name) => {
        const item = dayLogs[name];
        if (item) {
          if (item.status === 'on_time') {
            onTimeCount++;
            completedCount++;
          } else if (item.status === 'late') {
            lateCount++;
            completedCount++;
          } else if (item.status === 'missed') {
            missedCount++;
          }
          return {
            prayerName: name,
            status: item.status,
            isLogged: true,
            loggedAt: item.loggedAt,
            id: item.id,
          };
        }
        return {
          prayerName: name,
          status: 'pending',
          isLogged: false,
          loggedAt: null,
          id: null,
        };
      });

      return {
        date: dateStr,
        completedCount,
        total: 5,
        completionRate: Math.round((completedCount / 5) * 100),
        breakdown: {
          on_time: onTimeCount,
          late: lateCount,
          missed: missedCount,
          pending: 5 - completedCount - missedCount,
        },
        prayers,
      };
    });

    return res.status(200).json({
      success: true,
      daysRequested: daysCount,
      startDate: oldestDate,
      endDate: newestDate,
      history,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/prayers/analytics
 * Calculates:
 *  1. Today's completion count (e.g. 3/5 completed).
 *  2. Breakdown percentages for the week (on_time, late, missed).
 *  3. Current consecutive streak count (continuous days user completed all 5 prayers).
 */
export async function getPrayerAnalytics(req, res, next) {
  try {
    const userId = req.user.id;
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Today's stats
    const todayLogs = await prisma.prayerLog.findMany({
      where: {
        userId,
        date: todayStr,
      },
    });

    let todayCompleted = 0;
    for (const log of todayLogs) {
      if (log.status === 'on_time' || log.status === 'late') {
        todayCompleted++;
      }
    }

    // 2. Weekly stats (last 7 days)
    const weekDates = getLastNDates(7);
    const oldestWeekDate = weekDates[weekDates.length - 1];

    const weekLogs = await prisma.prayerLog.findMany({
      where: {
        userId,
        date: {
          gte: oldestWeekDate,
          lte: todayStr,
        },
      },
    });

    let onTimeCount = 0;
    let lateCount = 0;
    let missedCount = 0;

    for (const log of weekLogs) {
      if (log.status === 'on_time') onTimeCount++;
      else if (log.status === 'late') lateCount++;
      else if (log.status === 'missed') missedCount++;
    }

    const totalLoggedWeek = weekLogs.length;
    const completedWeek = onTimeCount + lateCount;

    const onTimePercentage = totalLoggedWeek > 0 ? Math.round((onTimeCount / totalLoggedWeek) * 100) : 0;
    const latePercentage = totalLoggedWeek > 0 ? Math.round((lateCount / totalLoggedWeek) * 100) : 0;
    const missedPercentage = totalLoggedWeek > 0 ? Math.round((missedCount / totalLoggedWeek) * 100) : 0;
    const weeklyCompletionRate = Math.round((completedWeek / 35) * 100); // 35 prayers in a week

    // 3. Consecutive Streak Count (Continuous days with all 5 prayers completed)
    // Group all historical completed logs by date
    const allCompletedLogs = await prisma.prayerLog.findMany({
      where: {
        userId,
        status: { in: ['on_time', 'late'] },
      },
      select: {
        date: true,
        prayerName: true,
      },
    });

    const completedCountsByDate = {};
    for (const log of allCompletedLogs) {
      completedCountsByDate[log.date] = (completedCountsByDate[log.date] || 0) + 1;
    }

    // A day is "perfect" if completed count >= 5
    const isPerfectDay = (dateStr) => (completedCountsByDate[dateStr] || 0) >= 5;

    let perfectStreak = 0;
    let checkDate = new Date();
    const todayIsPerfect = isPerfectDay(todayStr);

    // If today is not perfect yet (day is still ongoing), anchor from yesterday if yesterday was perfect
    let anchor = new Date();
    if (!todayIsPerfect) {
      anchor.setDate(anchor.getDate() - 1);
      const yesterdayStr = anchor.toISOString().split('T')[0];
      if (!isPerfectDay(yesterdayStr)) {
        anchor = null; // Streak is 0
      }
    }

    if (anchor) {
      while (true) {
        const dStr = anchor.toISOString().split('T')[0];
        if (isPerfectDay(dStr)) {
          perfectStreak++;
          anchor.setDate(anchor.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Also calculate active habit streak (days with at least 1 prayer completed)
    let activeStreak = 0;
    let activeAnchor = new Date();
    const todayHasAny = (completedCountsByDate[todayStr] || 0) > 0;
    if (!todayHasAny) {
      activeAnchor.setDate(activeAnchor.getDate() - 1);
      const yStr = activeAnchor.toISOString().split('T')[0];
      if ((completedCountsByDate[yStr] || 0) === 0) {
        activeAnchor = null;
      }
    }
    if (activeAnchor) {
      while (true) {
        const dStr = activeAnchor.toISOString().split('T')[0];
        if ((completedCountsByDate[dStr] || 0) > 0) {
          activeStreak++;
          activeAnchor.setDate(activeAnchor.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        today: {
          date: todayStr,
          completed: todayCompleted,
          total: 5,
          completionRate: Math.round((todayCompleted / 5) * 100),
          isComplete: todayCompleted === 5,
        },
        weeklyBreakdown: {
          totalLogged: totalLoggedWeek,
          completedCount: completedWeek,
          onTime: {
            count: onTimeCount,
            percentage: onTimePercentage,
          },
          late: {
            count: lateCount,
            percentage: latePercentage,
          },
          missed: {
            count: missedCount,
            percentage: missedPercentage,
          },
          weeklyCompletionRate,
        },
        streak: {
          currentStreak: perfectStreak, // Continuous days with all 5 prayers logged
          perfectDaysStreak: perfectStreak,
          activeHabitStreak: activeStreak,
          description: perfectStreak === 1 ? '1 day perfect streak' : `${perfectStreak} days perfect streak`,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/prayers/log/:id
 * Deletes/resets a prayer log, strictly verifying ownership
 */
export async function deletePrayerLog(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing prayer log id parameter.',
      });
    }

    // Lookup log to verify existence and ownership
    const existingLog = await prisma.prayerLog.findUnique({
      where: { id },
    });

    if (!existingLog) {
      return res.status(404).json({
        success: false,
        error: 'Prayer log not found.',
      });
    }

    if (existingLog.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden. You do not have permission to delete this prayer log.',
      });
    }

    // Delete log
    await prisma.prayerLog.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: `Prayer log for ${existingLog.prayerName} on ${existingLog.date} has been reset.`,
      deletedLogId: id,
    });
  } catch (err) {
    next(err);
  }
}
