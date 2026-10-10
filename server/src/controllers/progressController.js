import { prisma } from '../db/prisma.js';

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
 * Returns formatted YYYY-MM-DD
 */
function formatDateKey(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Calculates current consecutive streak and all-time best streak
 * @param {string[]} sortedDates Unique date strings sorted descending
 */
function calculateStreaks(sortedDates, todayStr) {
  if (!sortedDates || sortedDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const dateSet = new Set(sortedDates);

  // 1. Current Streak calculation
  let currentStreak = 0;
  const checkDate = new Date();
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

  // Convert all unique dates to timestamps and sort ascending
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
 * Consolidated progress and analytics payload matching the Progress screen UI exactly
 */
export async function getProgressSummary(req, res, next) {
  try {
    const userId = req.user.id;
    const now = new Date();
    const todayStr = formatDateKey(now);

    // 1. Determine "This Week" (Monday through Sunday)
    const { monday, sunday } = getThisWeekRange(now);
    const mondayStr = formatDateKey(monday);
    const sundayStr = formatDateKey(sunday);

    // 2. Fetch all user's prayer logs for This Week
    const weekPrayerLogs = await prisma.prayerLog.findMany({
      where: {
        userId,
        date: {
          gte: mondayStr,
          lte: sundayStr,
        },
      },
    });

    // Group week logs by date and prayerName
    const weekLogsByDate = {};
    for (const log of weekPrayerLogs) {
      if (!weekLogsByDate[log.date]) {
        weekLogsByDate[log.date] = {};
      }
      weekLogsByDate[log.date][log.prayerName.toLowerCase()] = log;
    }

    // 3. Count statuses for "Prayer Status Breakdown"
    let onTimeCount = 0;
    let lateCount = 0;
    let qadaCount = 0;
    let missedCount = 0;

    for (const log of weekPrayerLogs) {
      const status = log.status.toLowerCase();
      if (status === 'on_time') onTimeCount++;
      else if (status === 'late') lateCount++;
      else if (status === 'qada') qadaCount++;
      else if (status === 'missed') missedCount++;
    }

    const totalLoggedWeek = weekPrayerLogs.length;

    // 4. Calculate Breakdown Per Prayer (e.g., Fajr: 3/7, Dhuhr: 4/7)
    const prayerCounts = {
      Fajr: 0,
      Dhuhr: 0,
      Asr: 0,
      Maghrib: 0,
      Isha: 0,
    };

    for (const log of weekPrayerLogs) {
      const isCompleted =
        log.status === 'on_time' || log.status === 'late' || log.status === 'qada';
      if (isCompleted) {
        const capitalName =
          log.prayerName.charAt(0).toUpperCase() + log.prayerName.slice(1).toLowerCase();
        if (prayerCounts[capitalName] !== undefined) {
          prayerCounts[capitalName]++;
        }
      }
    }

    const totalOfferedWeek =
      prayerCounts.Fajr +
      prayerCounts.Dhuhr +
      prayerCounts.Asr +
      prayerCounts.Maghrib +
      prayerCounts.Isha;

    // Elapsed days in current week so far (Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=7)
    const dayOfWeek = now.getDay();
    const elapsedDays = dayOfWeek === 0 ? 7 : dayOfWeek;
    const elapsedPossiblePrayers = elapsedDays * 5;

    // Completion percentage based on elapsed possible prayer slots (e.g. 19/20 = 95%)
    const completionPercent =
      elapsedPossiblePrayers > 0
        ? Math.min(100, Math.round((totalOfferedWeek / elapsedPossiblePrayers) * 100))
        : 0;

    const prayerBreakdown = PRAYER_NAMES.map((name) => {
      const count = prayerCounts[name] || 0;
      return {
        name,
        count: `${count}/7`,
        offered: count,
        total: 7,
        percent: Math.round((count / 7) * 100),
        icon: PRAYER_ICONS[name] || '🕌',
      };
    });

    // 5. Weekly Prayer Overview Matrix (Mon-Sun columns x 5 prayer rows)
    const matrixDays = [];
    for (let i = 0; i < 7; i++) {
      const colDate = new Date(monday);
      colDate.setDate(monday.getDate() + i);
      const colDateStr = formatDateKey(colDate);
      const dayLogs = weekLogsByDate[colDateStr] || {};

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

      matrixDays.push({
        day: DAY_NAMES[i],
        date: colDateStr,
        isToday: colDateStr === todayStr,
        count: `${dayCompleted}/5`,
        completed: dayCompleted,
        prayers,
      });
    }

    // 6. Streaks and Last 30 Days Total
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const thirtyDaysAgoStr = formatDateKey(thirtyDaysAgo);

    // All-time completed logs for streak calculation
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

    // Count total prayers in the last 30 days
    const last30DaysCount = await prisma.prayerLog.count({
      where: {
        userId,
        date: { gte: thirtyDaysAgoStr, lte: todayStr },
        status: { in: ['on_time', 'late', 'qada'] },
      },
    });

    // 7. Habits (Quran & Daily Deeds this week)
    const quranDaysCount = await prisma.deedLog.count({
      where: {
        userId,
        deedType: 'quran',
        date: { gte: mondayStr, lte: sundayStr },
        completed: true,
      },
    });

    const deedsCompletedCount = await prisma.deedLog.count({
      where: {
        userId,
        deedType: { in: ['deed', 'dhikr', 'charity'] },
        date: { gte: mondayStr, lte: sundayStr },
        completed: true,
      },
    });

    // Fallbacks if user hasn't logged deeds separately (defaults to 0)
    const displayQuranDays = quranDaysCount;
    const displayDeedsCompleted = deedsCompletedCount;

    // 8. Overall Activity percentages (Last 30 Days / This Week)
    const salahActivityPercent = Math.min(
      100,
      Math.round((last30DaysCount / (30 * 5)) * 100)
    );
    const quranActivityPercent = Math.min(
      100,
      Math.round((quranDaysCount / 7) * 100)
    );
    const deedsActivityPercent = Math.min(
      100,
      Math.round((deedsCompletedCount / 21) * 100)
    );

    return res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
      },
      salahThisWeek: {
        label: 'Salah This Week',
        tag: 'Live Tracker',
        offeredCount: totalOfferedWeek,
        totalPrayers: 35,
        elapsedPrayers: elapsedPossiblePrayers,
        completionPercent,
        prayerBreakdown,
      },
      statusBreakdown: {
        title: 'Prayer Status Breakdown (کیفیت کا جائزہ)',
        tag: 'Real-time',
        onTime: {
          count: onTimeCount,
          label: 'ON TIME',
          urdu: 'وقت پر ادا کی',
        },
        late: {
          count: lateCount,
          label: 'LATE',
          urdu: 'تاخیر سے',
        },
        qada: {
          count: qadaCount,
          label: 'QADA',
          urdu: 'قضاء ادا کی',
        },
        missed: {
          count: missedCount,
          label: 'MISSED',
          urdu: 'قضاء ہو گئی',
        },
        totalLogged: totalLoggedWeek,
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
        title: 'Weekly Prayer Overview',
        weekLabel: 'This Week',
        days: matrixDays,
      },
      habits: {
        quranThisWeek: {
          title: 'Quran This Week',
          daysCount: displayQuranDays,
          subtitle:
            displayQuranDays > 0
              ? `You read Quran on ${displayQuranDays} days this week.`
              : 'No Quran reading logged this week yet.',
        },
        dailyDeeds: {
          title: 'Daily Deeds',
          completedCount: displayDeedsCompleted,
          subtitle:
            displayDeedsCompleted > 0
              ? 'Small actions make a big difference.'
              : 'No daily deeds logged this week yet.',
        },
      },
      overallActivity: {
        title: 'Overall Activity',
        period: 'Last 30 Days',
        categories: [
          { name: 'Salah', percent: salahActivityPercent, color: '#0E543F' },
          { name: 'Quran', percent: quranActivityPercent, color: '#2563EB' },
          { name: 'Daily Deeds', percent: deedsActivityPercent, color: '#D97706' },
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
