import { prisma } from '../db/prisma.js';
import { config } from '../config/env.js';
import { getHadithByStatus } from '../services/hadithService.js';
import {
  formatDateKey,
  isValidDateKey,
  getIsoWeekRange,
  addDays,
  getLocalDateKey,
  resolveUserTimezone,
} from '../utils/dateUtils.js';
import { validatePrayerTiming } from '../services/prayerService.js';

const DAILY_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

/**
 * Resolves current request timestamp, respecting injectable clock header in non-production environments
 * @param {import('express').Request} req
 * @returns {Date}
 */
function getRequestNow(req) {
  if (config.nodeEnv !== 'production') {
    const testNowHeader = req.headers['x-test-now'] || req.headers['x-mock-now'];
    if (testNowHeader) {
      const parsed = new Date(testNowHeader);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }
  return new Date();
}

/**
 * Normalizes prayer names to standard capitalized format: 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', or "Jumu'ah"
 * @param {string} name
 */
function normalizePrayerName(name) {
  if (!name) return '';
  const lower = name.toLowerCase().trim();
  if (lower === 'juma' || lower === 'jumuah' || lower === "jumu'ah" || lower === 'jummah') {
    return 'Juma';
  }
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function isFridayMiddayPrayer(prayerName) {
  if (!prayerName) return false;
  const lower = prayerName.toLowerCase().trim();
  return lower === 'dhuhr' || lower === 'juma' || lower === 'jumuah' || lower === "jumu'ah" || lower === 'jummah';
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
    const {
      prayerName,
      date,
      status,
      notes,
      latitude,
      longitude,
      calculationMethod,
      madhab,
    } = req.body;

    const normalizedPrayer = normalizePrayerName(prayerName);

    // Resolve user's configured IANA timezone
    const userTimezone = await resolveUserTimezone(userId, req, prisma);
    const reqNow = getRequestNow(req);
    const todayStr = getLocalDateKey(reqNow, userTimezone);
    const targetDate = date || todayStr;

    // 1. Strictly forbid logging completion for past or future dates
    if (targetDate < todayStr) {
      return res.status(409).json({
        success: false,
        code: 'PRAYER_DATE_NOT_TODAY',
        error: `Cannot mark Salah as completed for past dates (${targetDate}). Salah completion is strictly permitted only for today's local calendar date (${todayStr}). Previous records are read-only.`,
        message: `Cannot mark Salah as completed for past dates (${targetDate}). Salah completion is strictly permitted only for today's local calendar date (${todayStr}). Previous records are read-only.`,
      });
    }

    if (targetDate > todayStr) {
      return res.status(409).json({
        success: false,
        code: 'PRAYER_DATE_NOT_TODAY',
        error: `Cannot mark ${normalizedPrayer} as completed for future dates (${targetDate}). Prayer time has not started yet.`,
        message: `Cannot mark ${normalizedPrayer} as completed for future dates (${targetDate}). Prayer time has not started yet.`,
      });
    }

    // Retrieve user's saved location & calculation preferences if not explicitly in request
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        latitude: true,
        longitude: true,
        prayerCalculationMethod: true,
      },
    });

    const lat = typeof latitude === 'number' ? latitude : user?.latitude;
    const lng = typeof longitude === 'number' ? longitude : user?.longitude;
    const method = calculationMethod || user?.prayerCalculationMethod || 'Karachi';
    const madhabName = madhab || 'Hanafi';

    // Check if target date is Friday
    const [y, m, d] = targetDate.split('-').map(Number);
    const isFriday = new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 5;

    // Check for existing record
    // On Friday: Dhuhr and Jumu'ah represent the same midday slot to keep 5 daily slots consistent
    let existingLog = null;
    if (isFriday && isFridayMiddayPrayer(normalizedPrayer)) {
      existingLog = await prisma.prayerLog.findFirst({
        where: {
          userId,
          date: targetDate,
          prayerName: { in: ['Dhuhr', 'Juma', "Jumu'ah", 'Jumuah'] },
        },
      });
    } else {
      existingLog = await prisma.prayerLog.findUnique({
        where: {
          userId_prayerName_date: {
            userId,
            prayerName: normalizedPrayer,
            date: targetDate,
          },
        },
      });
    }

    // Idempotent: repeated identical submissions return 200 OK with the existing record
    if (existingLog && existingLog.status === status) {
      const hadithInfo = getHadithByStatus(status);
      return res.status(200).json({
        success: true,
        message: `Prayer ${existingLog.prayerName} is already recorded as "${status}".`,
        data: {
          log: existingLog,
          hadith: hadithInfo.hadith,
        },
      });
    }

    // Prevent duplicate completions without prior undo
    const isCompletedStatus = (s) => ['on_time', 'late', 'qada', 'completed'].includes(s?.toLowerCase());
    if (existingLog && isCompletedStatus(existingLog.status) && isCompletedStatus(status)) {
      const dupMessage = isFriday && isFridayMiddayPrayer(normalizedPrayer)
        ? `Friday midday prayer (Juma / Dhuhr) has already been recorded for today. You cannot record both Dhuhr and Juma as separate slots.`
        : `${normalizedPrayer} has already been recorded as completed for today. Duplicate completion is not permitted.`;

      return res.status(409).json({
        success: false,
        code: 'PRAYER_ALREADY_COMPLETED',
        error: dupMessage,
        message: dupMessage,
        data: {
          log: existingLog,
        },
      });
    }

    // Authoritative prayer start and window timing validation
    const timingValidation = validatePrayerTiming({
      prayerName: normalizedPrayer,
      date: targetDate,
      status,
      latitude: lat,
      longitude: lng,
      method,
      madhab: madhabName,
      now: reqNow,
      timezone: userTimezone,
      jumuahTime: req.body.jumuahTime,
    });

    if (!timingValidation.isValid) {
      return res.status(timingValidation.statusCode || 409).json({
        success: false,
        code: timingValidation.code || 'PRAYER_TIME_NOT_STARTED',
        error: timingValidation.message,
        message: timingValidation.message,
        availableAt: timingValidation.availableAt || null,
        currentTime: timingValidation.currentTime || reqNow.toISOString(),
      });
    }

    let log = null;
    if (existingLog) {
      log = await prisma.prayerLog.update({
        where: { id: existingLog.id },
        data: {
          status: status || 'on_time',
          prayerName: (isFriday && isFridayMiddayPrayer(normalizedPrayer)) ? normalizedPrayer : existingLog.prayerName,
          loggedAt: reqNow,
          prayerStartTime: timingValidation.prayerStartTime || undefined,
          prayerEndTime: timingValidation.prayerEndTime || undefined,
          notes: typeof notes !== 'undefined' ? notes : undefined,
        },
      });
    } else {
      log = await prisma.prayerLog.create({
        data: {
          userId,
          prayerName: normalizedPrayer,
          date: targetDate,
          status: status || 'on_time',
          notes: notes || null,
          prayerStartTime: timingValidation.prayerStartTime || null,
          prayerEndTime: timingValidation.prayerEndTime || null,
          loggedAt: reqNow,
        },
      });
    }

    // Retrieve tailored authentic Hadith for the logged status
    const hadithInfo = getHadithByStatus(status || 'on_time');

    return res.status(200).json({
      success: true,
      message: `Prayer ${log.prayerName} successfully recorded as "${log.status}".`,
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
    const userTimezone = await resolveUserTimezone(userId, req, prisma);
    const reqNow = getRequestNow(req);
    const todayStr = getLocalDateKey(reqNow, userTimezone);
    const targetDate = (req.query.date && typeof req.query.date === 'string')
      ? req.query.date
      : todayStr;

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

    // Check if target date is Friday
    const [y, m, d] = targetDate.split('-').map(Number);
    const isFriday = new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 5;

    const prayers = DAILY_PRAYERS.map((prayerName) => {
      const isMiddaySlot = prayerName === 'Dhuhr';
      const slotDisplayName = (isFriday && isMiddaySlot) ? 'Juma' : prayerName;

      let record = logsByPrayer[prayerName];
      if (isFriday && isMiddaySlot && !record) {
        record = logsByPrayer['Juma'] || logsByPrayer["Jumu'ah"] || logsByPrayer['Jumuah'];
      }

      if (record) {
        const isCompleted = record.status === 'on_time' || record.status === 'late' || record.status === 'qada';
        if (isCompleted) completedCount++;
        else if (record.status === 'missed') missedCount++;

        return {
          prayerName: slotDisplayName,
          status: record.status,
          isLogged: true,
          isCompleted,
          loggedAt: record.loggedAt,
          notes: record.notes,
          id: record.id,
        };
      }

      return {
        prayerName: slotDisplayName,
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
    const userTimezone = await resolveUserTimezone(userId, req, prisma);
    const reqNow = getRequestNow(req);
    const todayStr = getLocalDateKey(reqNow, userTimezone);

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
 * DELETE /api/prayers/log/:id (or /api/prayers/:id, or query/body prayerName + date)
 * Deletes/resets an eligible prayer log for today, strictly verifying ownership, active date, and open window
 */
export async function deletePrayerLog(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { prayerName, date } = { ...req.query, ...req.body };

    const userTimezone = await resolveUserTimezone(userId, req, prisma);
    const reqNow = getRequestNow(req);
    const todayStr = getLocalDateKey(reqNow, userTimezone);

    const targetDate = date || todayStr;
    const [y, m, d] = targetDate.split('-').map(Number);
    const isFriday = new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 5;

    // Past / Future date restriction: Only today's records can be undone
    if (targetDate < todayStr) {
      return res.status(409).json({
        success: false,
        code: 'PRAYER_DATE_NOT_TODAY',
        error: `Cannot undo or delete past prayer records (${targetDate}). Historical records are read-only.`,
        message: `Cannot undo or delete past prayer records (${targetDate}). Historical records are read-only.`,
      });
    }

    if (targetDate > todayStr) {
      return res.status(409).json({
        success: false,
        code: 'PRAYER_DATE_NOT_TODAY',
        error: `Cannot modify future prayer records (${targetDate}). Future days are read-only.`,
        message: `Cannot modify future prayer records (${targetDate}). Future days are read-only.`,
      });
    }

    let existingLog = null;

    if (id) {
      if (id.length > 20 || id.includes('-')) {
        existingLog = await prisma.prayerLog.findUnique({
          where: { id },
        });
      }
      if (!existingLog) {
        const normName = normalizePrayerName(id);
        const searchNames = isFriday && isFridayMiddayPrayer(normName)
          ? ['Dhuhr', 'dhuhr', 'DHUHR', 'Juma', 'juma', 'JUMA', "Jumu'ah", "jumu'ah", 'Jumuah', 'jumuah']
          : [normName, normName.toLowerCase(), normName.toUpperCase()];
        existingLog = await prisma.prayerLog.findFirst({
          where: {
            userId,
            date: targetDate,
            prayerName: { in: searchNames },
          },
        });
      }
    } else if (prayerName) {
      const normName = normalizePrayerName(prayerName);
      const searchNames = isFriday && isFridayMiddayPrayer(normName)
        ? ['Dhuhr', 'dhuhr', 'DHUHR', 'Juma', 'juma', 'JUMA', "Jumu'ah", "jumu'ah", 'Jumuah', 'jumuah']
        : [normName, normName.toLowerCase(), normName.toUpperCase()];
      existingLog = await prisma.prayerLog.findFirst({
        where: {
          userId,
          date: targetDate,
          prayerName: { in: searchNames },
        },
      });
    }

    // Idempotent: If record is not found in database for today, it is already cleared!
    if (!existingLog) {
      return res.status(200).json({
        success: true,
        message: `Prayer log for ${id || prayerName || 'prayer'} on ${targetDate} is already cleared.`,
        data: null,
        date: targetDate,
      });
    }

    // Strict ownership verification
    if (existingLog.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden. You do not have permission to delete this prayer log.',
      });
    }

    // Secondary date verification on existing record
    if (existingLog.date < todayStr) {
      return res.status(409).json({
        success: false,
        code: 'PRAYER_DATE_NOT_TODAY',
        error: `Cannot undo or delete past prayer records (${existingLog.date}). Historical records are read-only.`,
        message: `Cannot undo or delete past prayer records (${existingLog.date}). Historical records are read-only.`,
      });
    }

    if (existingLog.date > todayStr) {
      return res.status(409).json({
        success: false,
        code: 'PRAYER_DATE_NOT_TODAY',
        error: `Cannot modify future prayer records (${existingLog.date}). Future days are read-only.`,
        message: `Cannot modify future prayer records (${existingLog.date}). Future days are read-only.`,
      });
    }

    // Safe delete: users can undo completed records at any time during the active calendar day
    await prisma.prayerLog.delete({
      where: { id: existingLog.id },
    });

    return res.status(200).json({
      success: true,
      message: `Prayer log for ${existingLog.prayerName} on ${existingLog.date} has been reset/undone.`,
      deletedLogId: existingLog.id,
      prayerName: existingLog.prayerName,
      date: existingLog.date,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/prayers/weekly
 * Returns structured 7-day weekly Salah overview for the selected week.
 * Supports week navigation via ?startDate=YYYY-MM-DD or ?date=YYYY-MM-DD.
 */
export async function getWeeklyPrayers(req, res, next) {
  try {
    const userId = req.user.id;
    const { startDate, date } = req.query;

    const userTimezone = await resolveUserTimezone(userId, req, prisma);
    const reqNow = getRequestNow(req);
    const todayStr = getLocalDateKey(reqNow, userTimezone);
    const requestedDate = (startDate || date || todayStr).trim();

    if (startDate && !isValidDateKey(startDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid startDate parameter. Expected YYYY-MM-DD.',
      });
    }

    if (date && !isValidDateKey(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date parameter. Expected YYYY-MM-DD.',
      });
    }

    const {
      startDate: weekStart,
      endDate: weekEnd,
      dates,
      prevWeekStartDate,
      nextWeekStartDate,
      weekLabel,
    } = getIsoWeekRange(requestedDate);

    const isCurrentWeek = dates.includes(todayStr);

    // Fetch all logs for this user in the 7-day range
    const logs = await prisma.prayerLog.findMany({
      where: {
        userId,
        date: { in: dates },
      },
      orderBy: [
        { date: 'asc' },
        { loggedAt: 'asc' },
      ],
    });

    // Map logs by "YYYY-MM-DD" -> "prayerName" (lowercase)
    const logsMap = {};
    for (const log of logs) {
      if (!logsMap[log.date]) {
        logsMap[log.date] = {};
      }
      const lowerName = log.prayerName.toLowerCase();
      logsMap[log.date][lowerName] = log;
      if (lowerName === 'juma' || lowerName === "jumu'ah" || lowerName === 'jumuah' || lowerName === 'jummah') {
        logsMap[log.date]['dhuhr'] = log;
        logsMap[log.date]['juma'] = log;
      }
    }

    const dayShortNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayFullNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const prayerDefinitions = [
      { id: 'fajr', name: 'Fajr' },
      { id: 'dhuhr', name: 'Dhuhr' },
      { id: 'asr', name: 'Asr' },
      { id: 'maghrib', name: 'Maghrib' },
      { id: 'isha', name: 'Isha' },
    ];

    let totalCompleted = 0;
    let onTimeCount = 0;
    let lateCount = 0;
    let qadaCount = 0;
    let missedCount = 0;
    let activeDaysCount = 0;

    const days = dates.map((dStr, idx) => {
      const isToday = dStr === todayStr;
      const isPast = dStr < todayStr;
      const isFuture = dStr > todayStr;
      const dayLogs = logsMap[dStr] || {};
      const [y, m, d] = dStr.split('-').map(Number);
      const isDayFriday = new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 5;

      let dayCompleted = 0;

      const prayers = prayerDefinitions.map((pDef) => {
        const isMiddaySlot = pDef.id === 'dhuhr';
        const slotName = (isDayFriday && isMiddaySlot) ? 'Juma' : pDef.name;
        const log = (isDayFriday && isMiddaySlot)
          ? (dayLogs['juma'] || dayLogs["jumu'ah"] || dayLogs['jumuah'] || dayLogs['dhuhr'])
          : dayLogs[pDef.id];

        let status = 'pending';
        let isCompleted = false;

        if (log) {
          status = log.status; // 'on_time' | 'late' | 'qada' | 'missed'
          isCompleted = status === 'on_time' || status === 'late' || status === 'qada';
          if (status === 'on_time') onTimeCount++;
          else if (status === 'late') lateCount++;
          else if (status === 'qada') qadaCount++;
          else if (status === 'missed') missedCount++;
        } else {
          status = isFuture ? 'future' : 'pending';
        }

        if (isCompleted) {
          dayCompleted++;
          totalCompleted++;
        }

        return {
          id: pDef.id,
          name: slotName,
          status,
          isCompleted,
          loggedAt: log?.loggedAt || null,
          logId: log?.id || null,
          notes: log?.notes || null,
        };
      });

      if (dayCompleted > 0) {
        activeDaysCount++;
      }

      const dailyPercentage = Math.round((dayCompleted / 5) * 100);

      return {
        date: dStr,
        day: dayShortNames[idx],
        fullDay: dayFullNames[idx],
        isToday,
        isPast,
        isFuture,
        completedCount: dayCompleted,
        total: 5,
        dailyPercentage,
        prayers,
      };
    });

    const weeklyCompletionRate = Math.min(100, Math.round((totalCompleted / 35) * 100));
    const pendingCount = 35 - totalCompleted - missedCount;

    return res.status(200).json({
      success: true,
      data: {
        startDate: weekStart,
        endDate: weekEnd,
        weekLabel,
        isCurrentWeek,
        prevWeekStartDate,
        nextWeekStartDate,
        statistics: {
          totalPossiblePrayers: 35,
          completedPrayers: totalCompleted,
          weeklyCompletionRate,
          activeDaysCount,
          onTimeCount,
          lateCount,
          qadaCount,
          missedCount,
          pendingCount: Math.max(0, pendingCount),
        },
        days,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/prayers/log/:id
 * Updates an existing prayer log status or notes with strict ownership check
 */
export async function updatePrayerLog(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing prayer log id parameter.',
      });
    }

    if (status && !['on_time', 'late', 'qada', 'missed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'status must be one of: on_time, late, qada, missed',
      });
    }

    const userTimezone = await resolveUserTimezone(userId, req, prisma);
    const reqNow = getRequestNow(req);
    const todayStr = getLocalDateKey(reqNow, userTimezone);

    let existingLog = null;
    if (id.length > 20 || id.includes('-')) {
      existingLog = await prisma.prayerLog.findUnique({
        where: { id },
      });
    }

    if (!existingLog) {
      const normName = normalizePrayerName(id);
      const searchNames = [normName, normName.toLowerCase(), normName.toUpperCase()];
      existingLog = await prisma.prayerLog.findFirst({
        where: {
          userId,
          date: todayStr,
          prayerName: { in: searchNames },
        },
      });
    }

    if (!existingLog) {
      // Auto-upsert new prayer log if not exists yet
      const normName = normalizePrayerName(id) || id;
      const created = await prisma.prayerLog.create({
        data: {
          userId,
          prayerName: normName,
          date: todayStr,
          status: status || 'on_time',
          notes: typeof notes !== 'undefined' ? notes : null,
          loggedAt: reqNow,
        },
      });
      return res.status(200).json({
        success: true,
        message: `Prayer log for ${created.prayerName} on ${created.date} created successfully.`,
        data: created,
      });
    }

    if (existingLog.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden. You do not have permission to update this prayer log.',
      });
    }


    // Strict date restriction: only today's records can be edited
    if (existingLog.date !== todayStr) {
      return res.status(409).json({
        success: false,
        code: 'PRAYER_DATE_NOT_TODAY',
        error: `Cannot edit prayer records for ${existingLog.date}. Historical and future dates are read-only.`,
        message: `Cannot edit prayer records for ${existingLog.date}. Historical and future dates are read-only.`,
      });
    }

    // Only validate timing if status is being updated or changed
    if (status && status !== existingLog.status) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          latitude: true,
          longitude: true,
          prayerCalculationMethod: true,
        },
      });

      const timingValidation = validatePrayerTiming({
        prayerName: existingLog.prayerName,
        date: existingLog.date,
        status,
        latitude: user?.latitude,
        longitude: user?.longitude,
        method: user?.prayerCalculationMethod || 'Karachi',
        now: reqNow,
        timezone: userTimezone,
      });

      if (!timingValidation.isValid) {
        return res.status(timingValidation.statusCode || 409).json({
          success: false,
          code: timingValidation.code || 'PRAYER_TIME_NOT_STARTED',
          error: timingValidation.message,
          message: timingValidation.message,
          availableAt: timingValidation.availableAt || null,
          currentTime: timingValidation.currentTime || reqNow.toISOString(),
        });
      }
    }

    const updated = await prisma.prayerLog.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(typeof notes !== 'undefined' ? { notes } : {}),
        loggedAt: reqNow,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Prayer log for ${updated.prayerName} on ${updated.date} updated successfully.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}
