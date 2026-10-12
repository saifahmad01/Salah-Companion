/**
 * Date & Week calculation utilities for Salah Companion
 * Handles ISO weeks (Monday to Sunday), timezone offsets,
 * month boundaries, and year boundaries.
 */

/**
 * Returns formatted YYYY-MM-DD string for a specific IANA timezone.
 * Uses Intl.DateTimeFormat with 'en-CA' (standard ISO YYYY-MM-DD output).
 * @param {Date} [date]
 * @param {string} [timeZone='Asia/Kolkata']
 * @returns {string}
 */
export function getLocalDateKey(date = new Date(), timeZone = 'Asia/Kolkata') {
  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const tz = (timeZone && typeof timeZone === 'string') ? timeZone : 'Asia/Kolkata';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  }
}

/**
 * Resolves the user's configured IANA timezone in order of priority:
 * 1. Explicit timezone parameter from request (header 'x-timezone', query.timezone, or body.timezone)
 * 2. User's saved timezone from NotificationPreference in the database
 * 3. Default fallback: 'Asia/Kolkata'
 * @param {string} userId
 * @param {object} [req]
 * @param {object} [prismaClient]
 * @returns {Promise<string>}
 */
export async function resolveUserTimezone(userId, req = null, prismaClient = null) {
  // 1. Check request for explicit valid IANA timezone
  const candidate = req?.headers?.['x-timezone'] || req?.body?.timezone || req?.query?.timezone;
  if (candidate && typeof candidate === 'string') {
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: candidate });
      return candidate;
    } catch {}
  }

  // 2. Lookup user preference from database
  if (userId && prismaClient) {
    try {
      const pref = await prismaClient.notificationPreference.findUnique({
        where: { userId },
        select: { timezone: true },
      });
      if (pref?.timezone) {
        try {
          new Intl.DateTimeFormat(undefined, { timeZone: pref.timezone });
          return pref.timezone;
        } catch {}
      }
    } catch {}
  }

  return 'Asia/Kolkata';
}

/**
 * Returns formatted YYYY-MM-DD string from a Date or date string
 * @param {Date|string} [date]
 * @param {string} [timeZone]
 * @returns {string}
 */
export function formatDateKey(date = new Date(), timeZone) {
  if (timeZone && typeof timeZone === 'string') {
    return getLocalDateKey(date, timeZone);
  }
  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Validates whether string is in valid YYYY-MM-DD format
 * @param {string} str
 * @returns {boolean}
 */
export function isValidDateKey(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split('-').map((v) => parseInt(v, 10));
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return (
    parsed.getUTCFullYear() === y &&
    parsed.getUTCMonth() === m - 1 &&
    parsed.getUTCDate() === d
  );
}

/**
 * Adds or subtracts N days from a YYYY-MM-DD string
 * Safe across month, leap year, and year boundaries using UTC math.
 * @param {string} dateStr
 * @param {number} days
 * @returns {string}
 */
export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const nextY = date.getUTCFullYear();
  const nextM = String(date.getUTCMonth() + 1).padStart(2, '0');
  const nextD = String(date.getUTCDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
}

/**
 * Given any reference date, returns the Monday and Sunday of that week (ISO week)
 * and an array of all 7 date strings (Monday through Sunday).
 * @param {string|Date} [referenceDate]
 * @returns {{
 *   startDate: string,
 *   endDate: string,
 *   dates: string[],
 *   prevWeekStartDate: string,
 *   nextWeekStartDate: string,
 *   weekLabel: string
 * }}
 */
export function getIsoWeekRange(referenceDate = new Date()) {
  let targetStr = formatDateKey(referenceDate);
  if (!isValidDateKey(targetStr)) {
    targetStr = formatDateKey(new Date());
  }

  const [y, m, d] = targetStr.split('-').map((v) => parseInt(v, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));

  // In UTC: 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const dayOfWeek = dt.getUTCDay();
  // Offset to Monday: if Sunday (0) -> -6, Monday (1) -> 0, Tuesday (2) -> -1, etc.
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const mondayStr = addDays(targetStr, mondayOffset);
  const sundayStr = addDays(mondayStr, 6);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(mondayStr, i));
  }

  const prevWeekStartDate = addDays(mondayStr, -7);
  const nextWeekStartDate = addDays(mondayStr, 7);

  // User-friendly week label (e.g. "06 Oct – 12 Oct 2026")
  const mParts = mondayStr.split('-').map((v) => parseInt(v, 10));
  const sParts = sundayStr.split('-').map((v) => parseInt(v, 10));
  const monDate = new Date(Date.UTC(mParts[0], mParts[1] - 1, mParts[2]));
  const sunDate = new Date(Date.UTC(sParts[0], sParts[1] - 1, sParts[2]));

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const mMonth = monthNames[monDate.getUTCMonth()];
  const sMonth = monthNames[sunDate.getUTCMonth()];
  const mDay = String(monDate.getUTCDate()).padStart(2, '0');
  const sDay = String(sunDate.getUTCDate()).padStart(2, '0');
  const mYear = monDate.getUTCFullYear();
  const sYear = sunDate.getUTCFullYear();

  let weekLabel = `${mDay} ${mMonth} – ${sDay} ${sMonth} ${sYear}`;
  if (mYear !== sYear) {
    weekLabel = `${mDay} ${mMonth} ${mYear} – ${sDay} ${sMonth} ${sYear}`;
  }

  return {
    startDate: mondayStr,
    endDate: sundayStr,
    dates,
    prevWeekStartDate,
    nextWeekStartDate,
    weekLabel,
  };
}
