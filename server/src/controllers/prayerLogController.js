import { prisma } from '../db/prisma.js';
import { getHadithByStatus } from '../services/hadithService.js';
import { formatDateKey, isValidDateKey, getIsoWeekRange, addDays } from '../utils/dateUtils.js';
import { validatePrayerTiming } from '../services/prayerService.js';

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
    const targetDate = date || formatDateKey(new Date());

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

    // Check for existing record / duplicate completion first
    const existingLog = await prisma.prayerLog.findUnique({
      where: {
        userId_prayerName_date: {
          userId,
          prayerName: normalizedPrayer,
          date: targetDate,
        },
      },
    });

    const isCompletedStatus = (s) => ['on_time', 'late', 'qada', 'completed'].includes(s?.toLowerCase());
    if (existingLog && isCompletedStatus(existingLog.status) && isCompletedStatus(status)) {
      return res.status(409).json({
        success: false,
        code: 'PRAYER_ALREADY_COMPLETED',
        error: `${normalizedPrayer} has already been recorded as completed for today. Duplicate completion is not permitted.`,
        message: `${normalizedPrayer} has already been recorded as completed for today. Duplicate completion is not permitted.`,
        data: {
          log: existingLog,
        },
      });
    }

    // Authoritative prayer start and window timing validation:
    // A user can mark a Salah as completed only when:
    // 1. Current local calendar date (today)
    // 2. Start time has arrived
    // 3. Valid completion window has not ended
    const timingValidation = validatePrayerTiming({
      prayerName: normalizedPrayer,
      date: targetDate,
      status,
      latitude: lat,
      longitude: lng,
      method,
      madhab: madhabName,
      now: new Date(),
    });

    if (!timingValidation.isValid) {
      return res.status(timingValidation.statusCode || 409).json({
        success: false,
        code: timingValidation.code || 'PRAYER_TIME_NOT_STARTED',
        error: timingValidation.message,
        message: timingValidation.message,
        availableAt: timingValidation.availableAt || null,
        currentTime: timingValidation.currentTime || new Date().toISOString(),
      });
    }

    if (existingLog && existingLog.status === status) {
      const hadithInfo = getHadithByStatus(status);
      return res.status(200).json({
        success: true,
        message: `Prayer ${normalizedPrayer} is already recorded as "${status}".`,
        data: {
          log: existingLog,
          hadith: hadithInfo.hadith,
        },
      });
    }

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
        prayerStartTime: timingValidation.prayerStartTime || undefined,
        prayerEndTime: timingValidation.prayerEndTime || undefined,
        notes: typeof notes !== 'undefined' ? notes : undefined,
      },
      create: {
        userId,
        prayerName: normalizedPrayer,
        date: targetDate,
        status,
        prayerStartTime: timingValidation.prayerStartTime || null,
        prayerEndTime: timingValidation.prayerEndTime || null,
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

/**
 * GET /api/prayers/weekly
 * Returns structured 7-day weekly Salah overview for the selected week.
 * Supports week navigation via ?startDate=YYYY-MM-DD or ?date=YYYY-MM-DD.
 */
export async function getWeeklyPrayers(req, res, next) {
  try {
    const userId = req.user.id;
    const { startDate, date } = req.query;

    const requestedDate = (startDate || date || formatDateKey(new Date())).trim();

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

    const todayStr = formatDateKey(new Date());
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
      logsMap[log.date][log.prayerName.toLowerCase()] = log;
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

      let dayCompleted = 0;

      const prayers = prayerDefinitions.map((pDef) => {
        const log = dayLogs[pDef.id];
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
          name: pDef.name,
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
        error: 'Forbidden. You do not have permission to update this prayer log.',
      });
    }

    if (status) {
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
        now: new Date(),
      });

      if (!timingValidation.isValid) {
        return res.status(timingValidation.statusCode || 409).json({
          success: false,
          code: timingValidation.code || 'PRAYER_TIME_NOT_STARTED',
          error: timingValidation.message,
          message: timingValidation.message,
          availableAt: timingValidation.availableAt || null,
          currentTime: timingValidation.currentTime || new Date().toISOString(),
        });
      }
    }

    const updated = await prisma.prayerLog.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(typeof notes !== 'undefined' ? { notes } : {}),
        loggedAt: new Date(),
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
