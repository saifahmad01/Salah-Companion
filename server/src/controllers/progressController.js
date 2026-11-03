import { prisma } from '../db/prisma.js';
import { isValidDateKey } from '../utils/dateUtils.js';

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_ICONS = {
  Fajr: '🌙',
  Dhuhr: '☀️',
  Asr: '⛅',
  Maghrib: '🌅',
  Isha: '🌌',
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Normalizes status strings to uppercase format (e.g., 'on_time' -> 'ON_TIME')
 */
function normalizeStatusUpper(status) {
  if (!status) return null;
  const s = status.toUpperCase().trim();
  if (s === 'ON_TIME' || s === 'ONTIME' || s === 'ON TIME') return 'ON_TIME';
  if (s === 'LATE') return 'LATE';
  if (s === 'QADA') return 'QADA';
  if (s === 'MISSED') return 'MISSED';
  return s;
}

/**
 * Returns formatted YYYY-MM-DD
 */
function formatDateKey(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Returns the Monday and Sunday dates of the current week (ISO week)
 */
function getThisWeekRange(referenceDate = new Date()) {
  const now = new Date(referenceDate);
  const day = now.getDay(); // 0 is Sunday, 1 is Monday, ...
  const diffToMonday = (day === 0 ? -6 : 1) - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

/**
 * Determines date range based on period
 */
function getDateRangeForPeriod(period, referenceDate, customStart, customEnd) {
  const ref = new Date(referenceDate);
  ref.setHours(12, 0, 0, 0);

  if (period === 'daily') {
    const dStr = formatDateKey(ref);
    return { startDate: dStr, endDate: dStr, label: dStr };
  }

  if (period === 'monthly') {
    const year = ref.getFullYear();
    const month = ref.getMonth(); // 0-indexed
    const firstDay = new Date(year, month, 1, 12, 0, 0);
    const lastDay = new Date(year, month + 1, 0, 12, 0, 0);
    const monthName = ref.toLocaleString('default', { month: 'long', year: 'numeric' });
    return {
      startDate: formatDateKey(firstDay),
      endDate: formatDateKey(lastDay),
      label: monthName,
    };
  }

  if (period === 'yearly') {
    const year = ref.getFullYear();
    const firstDay = new Date(year, 0, 1, 12, 0, 0);
    const lastDay = new Date(year, 11, 31, 12, 0, 0);
    return {
      startDate: formatDateKey(firstDay),
      endDate: formatDateKey(lastDay),
      label: `Year ${year}`,
    };
  }

  if (period === 'custom' && customStart && customEnd && isValidDateKey(customStart) && isValidDateKey(customEnd)) {
    return {
      startDate: customStart,
      endDate: customEnd,
      label: `${customStart} to ${customEnd}`,
    };
  }

  // Default: weekly
  const { monday, sunday } = getThisWeekRange(ref);
  return {
    startDate: formatDateKey(monday),
    endDate: formatDateKey(sunday),
    label: 'This Week',
  };
}

/**
 * Estimates number of elapsed prayers today based on local time
 * (Ensures future prayers today are NOT counted as missed)
 */
function getElapsedPrayersToday(dateStr, todayStr, now = new Date()) {
  if (dateStr < todayStr) return 5;
  if (dateStr > todayStr) return 0;

  // Date is today: check hour
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeVal = hours + minutes / 60;

  if (timeVal < 5.5) return 0;   // Before Fajr (~05:30)
  if (timeVal < 12.5) return 1;  // Fajr has started/passed (~12:30)
  if (timeVal < 16.0) return 2;  // Dhuhr has started/passed (~16:00)
  if (timeVal < 18.25) return 3; // Asr has started/passed (~18:15)
  if (timeVal < 19.75) return 4; // Maghrib has started/passed (~19:45)
  return 5;                      // Isha has started/passed
}

/**
 * Calculates current consecutive streak and all-time best streak
 */
function calculateStreaks(sortedDates, todayStr) {
  if (!sortedDates || sortedDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const dateSet = new Set(sortedDates);

  // 1. Current Streak calculation
  let currentStreak = 0;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateKey(yesterday);

  let anchor = new Date();
  if (!dateSet.has(todayStr)) {
    // If today has no completed prayer yet, preserve streak from yesterday
    if (dateSet.has(yesterdayStr)) {
      anchor.setDate(anchor.getDate() - 1);
    } else {
      anchor = null; // Streak broken
    }
  }

  if (anchor) {
    while (true) {
      const dStr = formatDateKey(anchor);
      if (dateSet.has(dStr)) {
        currentStreak++;
        anchor.setDate(anchor.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // 2. Best Streak calculation across all time
  let bestStreak = 0;
  let runningStreak = 0;

  const ascendingTimestamps = Array.from(dateSet)
    .map((d) => new Date(`${d}T00:00:00Z`).getTime())
    .sort((a, b) => a - b);

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  for (let i = 0; i < ascendingTimestamps.length; i++) {
    if (i === 0) {
      runningStreak = 1;
    } else {
      const diff = ascendingTimestamps[i] - ascendingTimestamps[i - 1];
      if (diff === ONE_DAY_MS) {
        runningStreak++;
      } else if (diff > ONE_DAY_MS) {
        runningStreak = 1;
      }
    }
    if (runningStreak > bestStreak) {
      bestStreak = runningStreak;
    }
  }

  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }

  return { currentStreak, bestStreak };
}

/**
 * GET /api/progress/summary
 * Production-ready real user statistics across daily, weekly, monthly, and yearly scopes
 */
export async function getProgressSummary(req, res, next) {
  try {
    const userId = req.user.id;
    const now = new Date();
    const todayStr = formatDateKey(now);

    const period = (req.query.period || 'weekly').toLowerCase();
    const dateParam = req.query.startDate || req.query.date;
    const referenceDate = dateParam && isValidDateKey(dateParam)
      ? new Date(`${dateParam}T12:00:00Z`)
      : now;

    // Determine target range
    const { startDate, endDate, label: periodLabel } = getDateRangeForPeriod(
      period,
      referenceDate,
      req.query.customStart || req.query.startDate,
      req.query.customEnd || req.query.endDate
    );

    // Fetch user's prayer logs in range
    const periodPrayerLogs = await prisma.prayerLog.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: [{ date: 'asc' }, { prayerName: 'asc' }],
    });

    // Group logs by date and prayer
    const logsByDate = {};
    for (const log of periodPrayerLogs) {
      if (!logsByDate[log.date]) {
        logsByDate[log.date] = {};
      }
      logsByDate[log.date][log.prayerName.toLowerCase()] = log;
    }

    // Status counts
    let onTimeCount = 0;
    let lateCount = 0;
    let qadaCount = 0;
    let explicitMissedCount = 0;

    for (const log of periodPrayerLogs) {
      const s = log.status.toLowerCase();
      if (s === 'on_time') onTimeCount++;
      else if (s === 'late') lateCount++;
      else if (s === 'qada') qadaCount++;
      else if (s === 'missed') explicitMissedCount++;
    }

    const totalOffered = onTimeCount + lateCount + qadaCount;

    // Calculate total possible elapsed prayers (never count future prayers as missed)
    let totalPossibleElapsed = 0;
    let totalScheduledSlots = 0;

    const startObj = new Date(`${startDate}T12:00:00Z`);
    const endObj = new Date(`${endDate}T12:00:00Z`);
    const diffDays = Math.round((endObj.getTime() - startObj.getTime()) / (24 * 60 * 60 * 1000)) + 1;

    for (let i = 0; i < diffDays; i++) {
      const cur = new Date(startObj);
      cur.setDate(startObj.getDate() + i);
      const curStr = formatDateKey(cur);
      const elapsed = getElapsedPrayersToday(curStr, todayStr, now);
      totalPossibleElapsed += elapsed;
      totalScheduledSlots += 5;
    }

    // Unoffered past prayers are missed
    const unofferedPast = Math.max(0, totalPossibleElapsed - totalOffered - explicitMissedCount);
    const totalMissed = explicitMissedCount + unofferedPast;
    const totalPending = Math.max(0, totalScheduledSlots - totalPossibleElapsed);

    const completionPercent =
      totalPossibleElapsed > 0
        ? Math.min(100, Math.round((totalOffered / totalPossibleElapsed) * 100))
        : 0;

    // Breakdown per prayer (Fajr, Dhuhr, Asr, Maghrib, Isha)
    const prayerStats = {
      Fajr: { offered: 0, onTime: 0, late: 0, qada: 0, missed: 0 },
      Dhuhr: { offered: 0, onTime: 0, late: 0, qada: 0, missed: 0 },
      Asr: { offered: 0, onTime: 0, late: 0, qada: 0, missed: 0 },
      Maghrib: { offered: 0, onTime: 0, late: 0, qada: 0, missed: 0 },
      Isha: { offered: 0, onTime: 0, late: 0, qada: 0, missed: 0 },
    };

    for (const log of periodPrayerLogs) {
      const capital = log.prayerName.charAt(0).toUpperCase() + log.prayerName.slice(1).toLowerCase();
      if (prayerStats[capital]) {
        const s = log.status.toLowerCase();
        if (s === 'on_time') {
          prayerStats[capital].offered++;
          prayerStats[capital].onTime++;
        } else if (s === 'late') {
          prayerStats[capital].offered++;
          prayerStats[capital].late++;
        } else if (s === 'qada') {
          prayerStats[capital].offered++;
          prayerStats[capital].qada++;
        } else if (s === 'missed') {
          prayerStats[capital].missed++;
        }
      }
    }

    const prayerBreakdown = PRAYER_NAMES.map((name) => {
      const st = prayerStats[name];
      const maxSlots = diffDays;
      const pct = maxSlots > 0 ? Math.min(100, Math.round((st.offered / maxSlots) * 100)) : 0;
      return {
        name,
        count: `${st.offered}/${maxSlots}`,
        offered: st.offered,
        onTime: st.onTime,
        late: st.late,
        qada: st.qada,
        missed: st.missed,
        total: maxSlots,
        percent: pct,
        icon: PRAYER_ICONS[name] || '🕌',
      };
    });

    // Calendar history cells for this period
    const calendarHistory = [];
    for (let i = 0; i < diffDays; i++) {
      const cur = new Date(startObj);
      cur.setDate(startObj.getDate() + i);
      const curStr = formatDateKey(cur);
      const dayLogs = logsByDate[curStr] || {};

      let dayCompleted = 0;
      const prayers = PRAYER_NAMES.map((pName) => {
        const record = dayLogs[pName.toLowerCase()];
        const status = record ? normalizeStatusUpper(record.status) : null;
        if (status === 'ON_TIME' || status === 'LATE' || status === 'QADA') {
          dayCompleted++;
        }
        return {
          id: pName.toLowerCase(),
          name: pName,
          status,
        };
      });

      const dayIndex = cur.getDay(); // 0 = Sun
      const dayName = DAY_NAMES[(dayIndex + 6) % 7];

      calendarHistory.push({
        day: dayName,
        date: curStr,
        isToday: curStr === todayStr,
        count: `${dayCompleted}/5`,
        completed: dayCompleted,
        total: 5,
        prayers,
      });
    }

    // Completion Trends (Daily data points for line/bar charts)
    const trends = calendarHistory.map((ch) => ({
      date: ch.date,
      label: ch.day,
      completed: ch.completed,
      total: ch.total,
      percent: Math.round((ch.completed / 5) * 100),
    }));

    // Streaks across all time
    const allCompletedLogs = await prisma.prayerLog.findMany({
      where: {
        userId,
        status: { in: ['on_time', 'late', 'qada'] },
      },
      select: { date: true },
      orderBy: { date: 'desc' },
    });

    const uniqueCompletedDates = Array.from(new Set(allCompletedLogs.map((l) => l.date)));
    const { currentStreak, bestStreak } = calculateStreaks(uniqueCompletedDates, todayStr);

    // Monthly Comparison (Current month vs Previous month)
    let monthlyComparison = null;
    if (period === 'monthly' || period === 'weekly') {
      const curYear = referenceDate.getFullYear();
      const curMonth = referenceDate.getMonth();
      const prevMonthFirst = new Date(curYear, curMonth - 1, 1, 12, 0, 0);
      const prevMonthLast = new Date(curYear, curMonth, 0, 12, 0, 0);
      const prevStartStr = formatDateKey(prevMonthFirst);
      const prevEndStr = formatDateKey(prevMonthLast);

      const prevMonthLogsCount = await prisma.prayerLog.count({
        where: {
          userId,
          date: { gte: prevStartStr, lte: prevEndStr },
          status: { in: ['on_time', 'late', 'qada'] },
        },
      });

      const prevMonthDays = prevMonthLast.getDate();
      const prevMonthPossible = prevMonthDays * 5;
      const prevMonthPercent = Math.min(100, Math.round((prevMonthLogsCount / prevMonthPossible) * 100));

      monthlyComparison = {
        currentMonthCount: totalOffered,
        previousMonthCount: prevMonthLogsCount,
        currentMonthPercent: completionPercent,
        previousMonthPercent: prevMonthPercent,
        diffPercent: completionPercent - prevMonthPercent,
      };
    }

    // Habits (Quran & Daily Deeds in range)
    const quranDaysCount = await prisma.deedLog.count({
      where: {
        userId,
        deedType: 'quran',
        date: { gte: startDate, lte: endDate },
        completed: true,
      },
    });

    const deedsCompletedCount = await prisma.deedLog.count({
      where: {
        userId,
        deedType: { in: ['deed', 'dhikr', 'charity'] },
        date: { gte: startDate, lte: endDate },
        completed: true,
      },
    });

    // Last 30 days total
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const thirtyDaysAgoStr = formatDateKey(thirtyDaysAgo);

    const last30DaysCount = await prisma.prayerLog.count({
      where: {
        userId,
        date: { gte: thirtyDaysAgoStr, lte: todayStr },
        status: { in: ['on_time', 'late', 'qada'] },
      },
    });

    return res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
      },
      period,
      dateRange: {
        startDate,
        endDate,
        label: periodLabel,
        totalDays: diffDays,
      },
      summary: {
        totalScheduled: totalScheduledSlots,
        totalPossibleElapsed,
        totalCompleted: totalOffered,
        totalPending,
        onTimeCount,
        lateCount,
        qadaCount,
        missedCount: totalMissed,
        completionPercent,
      },
      prayerBreakdown,
      calendarHistory,
      trends,
      monthlyComparison,
      salahThisWeek: {
        label: periodLabel,
        tag: 'Live Tracker',
        offeredCount: totalOffered,
        totalPrayers: totalScheduledSlots,
        elapsedPrayers: totalPossibleElapsed,
        completionPercent,
        prayerBreakdown,
      },
      statusBreakdown: {
        title: 'Prayer Status Breakdown (کیفیت کا جائزہ)',
        tag: 'Real-time',
        onTime: { count: onTimeCount, label: 'ON TIME', urdu: 'وقت پر ادا کی' },
        late: { count: lateCount, label: 'LATE', urdu: 'تاخیر سے' },
        qada: { count: qadaCount, label: 'QADA', urdu: 'قضاء ادا کی' },
        missed: { count: totalMissed, label: 'MISSED', urdu: 'قضاء ہو گئی' },
        totalLogged: periodPrayerLogs.length,
        hadith: {
          title: 'فضیلتِ وقت: الصَّلَاةُ عَلَى وَقْتِهَا (Hadith on On-Time Prayer)',
          arabic: 'رسول اللہ ﷺ سے پوچھا گیا: کون سا عمل اللہ کو سب سے زیادہ محبوب ہے؟ آپ ﷺ نے فرمایا: ”نماز کو اس کے اول وقت پر ادا کرنا۔“ (صحیح البخاری #527)',
          romanHindi: 'Rasoolullah ﷺ se poocha gaya: Kaun sa amal Allah ko sabse zyada mehboob hai? Farmaya: "Namaz ko uske awal waqt par ada karna."',
          reference: 'صحیح البخاری #527 • Sahih al-Bukhari #527',
        },
      },
      streaks: {
        currentStreak: {
          days: currentStreak,
          label: 'Current Streak',
          note: currentStreak > 0 ? 'Keep it going! MashaAllah.' : 'Start your streak today with your next prayer.',
        },
        bestStreak: {
          days: bestStreak,
          label: 'Best Streak',
          note: bestStreak > 0 ? 'Your best achievement.' : 'No streak recorded yet.',
        },
        totalPrayersLast30Days: {
          count: last30DaysCount,
          label: 'Total Prayers',
          note: 'In the last 30 days.',
        },
      },
      weeklyOverview: {
        title: period === 'weekly' ? 'Weekly Prayer Overview' : `${periodLabel} Overview`,
        weekLabel: periodLabel,
        days: calendarHistory.slice(0, 7),
      },
      habits: {
        quranThisWeek: {
          title: 'Quran Reading',
          daysCount: quranDaysCount,
          subtitle: quranDaysCount > 0 ? `You read Quran on ${quranDaysCount} days in this period.` : 'No Quran reading logged in this period.',
        },
        dailyDeeds: {
          title: 'Daily Deeds',
          completedCount: deedsCompletedCount,
          subtitle: deedsCompletedCount > 0 ? `${deedsCompletedCount} Sunnah deeds completed.` : 'No daily deeds logged in this period.',
        },
      },
      overallActivity: {
        title: 'Overall Activity',
        period: periodLabel,
        categories: [
          { name: 'Salah', percent: completionPercent, color: '#0E543F' },
          { name: 'Quran', percent: Math.min(100, Math.round((quranDaysCount / Math.max(1, diffDays)) * 100)), color: '#2563EB' },
          { name: 'Daily Deeds', percent: Math.min(100, Math.round((deedsCompletedCount / Math.max(1, diffDays * 3)) * 100)), color: '#D97706' },
          { name: 'Learning', percent: 0, color: '#7C3AED' },
        ],
      },
      motivation: {
        title: 'Keep Going',
        quote: 'Every small step you take towards Allah is valuable. Consistency is better than perfection.',
        citation: 'Quran 11:112',
      },
    });
  } catch (err) {
    next(err);
  }
}
