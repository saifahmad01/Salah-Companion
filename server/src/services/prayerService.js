import {
  Coordinates,
  CalculationMethod,
  PrayerTimes,
  Madhab,
  Prayer,
} from 'adhan';
import { formatDateKey, isValidDateKey } from '../utils/dateUtils.js';

/**
 * Resolves CalculationMethod object from string identifier
 * @param {string} methodStr
 * @returns {object} adhan calculation parameters
 */
function getCalculationParameters(methodStr = 'Karachi') {
  const normalized = (methodStr || '').toLowerCase();
  switch (normalized) {
    case 'karachi':
    case 'hanafi':
    case 'india':
      return CalculationMethod.Karachi();
    case 'mwl':
    case 'muslimworldleague':
      return CalculationMethod.MuslimWorldLeague();
    case 'egypt':
    case 'egyptian':
      return CalculationMethod.Egyptian();
    case 'makkah':
    case 'ummalqura':
      return CalculationMethod.UmmAlQura();
    case 'isna':
    case 'northamerica':
      return CalculationMethod.NorthAmerica();
    case 'dubai':
      return CalculationMethod.Dubai();
    case 'qatar':
      return CalculationMethod.Qatar();
    case 'kuwait':
      return CalculationMethod.Kuwait();
    case 'turkey':
      return CalculationMethod.Turkey();
    case 'singapore':
      return CalculationMethod.Singapore();
    case 'moonsightingcommittee':
    case 'moonsighting':
      return CalculationMethod.MoonsightingCommittee();
    default:
      return CalculationMethod.Karachi();
  }
}

/**
 * Capitalizes string for display (e.g. 'fajr' -> 'Fajr')
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats a duration in milliseconds to human readable (e.g., '1h 24m' or '35m')
 */
function formatRemaining(ms) {
  if (ms <= 0) return '0m';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Computes prayer times, current prayer, next prayer and remaining countdown
 * @param {object} params
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @param {string} [params.method='Karachi']
 * @param {string} [params.madhab='Hanafi']
 * @param {Date}   [params.targetDate=new Date()]
 */
export function calculatePrayers({
  latitude,
  longitude,
  method = 'Karachi',
  madhab = 'Hanafi',
  targetDate = new Date(),
}) {
  const coordinates = new Coordinates(latitude, longitude);
  const calculationParams = getCalculationParameters(method);

  // Set Madhab (Hanafi vs Shafi/Standard)
  if (madhab.toLowerCase() === 'hanafi') {
    calculationParams.madhab = Madhab.Hanafi;
  } else {
    calculationParams.madhab = Madhab.Shafi;
  }

  const now = targetDate instanceof Date ? targetDate : new Date(targetDate);
  const todayTimes = new PrayerTimes(coordinates, now, calculationParams);

  // Determine tomorrow's prayer times for after-Isha rollover
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimes = new PrayerTimes(coordinates, tomorrow, calculationParams);

  // Raw prayer timestamps for today
  const rawTimes = {
    fajr: todayTimes.fajr,
    sunrise: todayTimes.sunrise,
    dhuhr: todayTimes.dhuhr,
    asr: todayTimes.asr,
    maghrib: todayTimes.maghrib,
    isha: todayTimes.isha,
  };

  // Determine current & next prayer
  const currentKey = todayTimes.currentPrayer(); // 'none', 'fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'
  const nextKey = todayTimes.nextPrayer();

  let currentPrayerName = 'None';
  let currentStartTime = null;
  let currentEndTime = null;

  let nextPrayerName = 'Fajr';
  let nextPrayerTime = null;

  // Handle current prayer window
  if (currentKey !== Prayer.None && currentKey !== 'none') {
    currentPrayerName = capitalize(currentKey);
    currentStartTime = todayTimes.timeForPrayer(currentKey);

    // End time is when the subsequent phase starts
    if (currentKey === 'fajr') currentEndTime = todayTimes.sunrise;
    else if (currentKey === 'sunrise') currentEndTime = todayTimes.dhuhr;
    else if (currentKey === 'dhuhr') currentEndTime = todayTimes.asr;
    else if (currentKey === 'asr') currentEndTime = todayTimes.maghrib;
    else if (currentKey === 'maghrib') currentEndTime = todayTimes.isha;
    else if (currentKey === 'isha') currentEndTime = tomorrowTimes.fajr;
  } else {
    // Before Fajr or after midnight: current is previous day's Isha
    if (now < todayTimes.fajr) {
      currentPrayerName = 'Isha';
      // Yesterday's Isha
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayTimes = new PrayerTimes(coordinates, yesterday, calculationParams);
      currentStartTime = yesterdayTimes.isha;
      currentEndTime = todayTimes.fajr;
    }
  }

  // Handle next prayer calculation & rollover
  if (nextKey !== Prayer.None && nextKey !== 'none') {
    nextPrayerName = capitalize(nextKey);
    nextPrayerTime = todayTimes.timeForPrayer(nextKey);
  } else {
    // If next prayer is none for today, it rolls over to Tomorrow's Fajr
    nextPrayerName = 'Fajr';
    nextPrayerTime = tomorrowTimes.fajr;
  }

  const timeRemainingMs = Math.max(0, nextPrayerTime.getTime() - now.getTime());
  const timeRemainingSeconds = Math.floor(timeRemainingMs / 1000);

  return {
    date: now.toISOString().split('T')[0],
    calculationMethod: method,
    madhab: madhab,
    coordinates: {
      latitude,
      longitude,
    },
    times: {
      fajr: rawTimes.fajr.toISOString(),
      sunrise: rawTimes.sunrise.toISOString(),
      dhuhr: rawTimes.dhuhr.toISOString(),
      asr: rawTimes.asr.toISOString(),
      maghrib: rawTimes.maghrib.toISOString(),
      isha: rawTimes.isha.toISOString(),
    },
    currentPrayer: {
      name: currentPrayerName,
      startTime: currentStartTime ? currentStartTime.toISOString() : null,
      endTime: currentEndTime ? currentEndTime.toISOString() : null,
    },
    nextPrayer: {
      name: nextPrayerName,
      time: nextPrayerTime.toISOString(),
      timeRemainingSeconds,
      timeRemainingFormatted: formatRemaining(timeRemainingMs),
    },
  };
}

/**
 * Authoritatively validates whether a prayer can be marked as completed or logged.
 * Enforces the rule: A user must not be able to mark a prayer as completed before that prayer's valid time window begins.
 *
 * @param {object} params
 * @param {string} params.prayerName e.g. 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'
 * @param {string} [params.date] target date in 'YYYY-MM-DD'
 * @param {string} [params.status] 'on_time' | 'late' | 'qada' | 'missed'
 * @param {number} [params.latitude]
 * @param {number} [params.longitude]
 * @param {string} [params.method]
 * @param {string} [params.madhab]
 * @param {Date}   [params.now=new Date()] trusted server timestamp
 * @returns {object} { isValid: boolean, code?: string, statusCode?: number, message?: string, availableAt?: string, prayerStartTime?: string, prayerEndTime?: string, isWithinWindow?: boolean, isPassed?: boolean }
 */
export function validatePrayerTiming({
  prayerName,
  date,
  status,
  latitude,
  longitude,
  method = 'Karachi',
  madhab = 'Hanafi',
  now = new Date(),
}) {
  const normPrayer = (prayerName || '').toLowerCase().trim();
  const validPrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  if (!validPrayers.includes(normPrayer)) {
    return {
      isValid: false,
      code: 'INVALID_PRAYER_NAME',
      statusCode: 400,
      message: `Invalid prayer name "${prayerName}". Must be one of: Fajr, Dhuhr, Asr, Maghrib, Isha.`,
    };
  }

  // Trusted server date
  const todayStr = formatDateKey(now);
  const targetDateStr = date || todayStr;

  if (!isValidDateKey(targetDateStr)) {
    return {
      isValid: false,
      code: 'INVALID_DATE',
      statusCode: 400,
      message: `Invalid date format "${targetDateStr}". Expected YYYY-MM-DD format.`,
    };
  }

  // 1. Strictly forbid logging any completion for future dates (e.g. tomorrow or beyond)
  if (targetDateStr > todayStr) {
    return {
      isValid: false,
      code: 'PRAYER_TIME_NOT_STARTED',
      statusCode: 409,
      message: `Cannot mark ${capitalize(normPrayer)} as completed for future dates. Prayer time has not started yet.`,
      availableAt: null,
      currentTime: now.toISOString(),
    };
  }

  // Resolve coordinates (fallback to standard coordinates if not provided)
  const lat = typeof latitude === 'number' && !isNaN(latitude) ? latitude : 28.6139;
  const lng = typeof longitude === 'number' && !isNaN(longitude) ? longitude : 77.2090;

  // Calculate authoritative prayer timetable for the target date
  const [y, m, d] = targetDateStr.split('-').map(Number);
  const targetDateObj = new Date(y, m - 1, d, 12, 0, 0);

  const timetable = calculatePrayers({
    latitude: lat,
    longitude: lng,
    method,
    madhab,
    targetDate: targetDateObj,
  });

  const prayerStartTimeStr = timetable.times[normPrayer];
  const prayerStartTime = new Date(prayerStartTimeStr);

  let prayerEndTimeStr = null;
  if (normPrayer === 'fajr') prayerEndTimeStr = timetable.times.sunrise;
  else if (normPrayer === 'dhuhr') prayerEndTimeStr = timetable.times.asr;
  else if (normPrayer === 'asr') prayerEndTimeStr = timetable.times.maghrib;
  else if (normPrayer === 'maghrib') prayerEndTimeStr = timetable.times.isha;
  else if (normPrayer === 'isha') {
    const nextDay = new Date(targetDateObj);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayTimetable = calculatePrayers({
      latitude: lat,
      longitude: lng,
      method,
      madhab,
      targetDate: nextDay,
    });
    prayerEndTimeStr = nextDayTimetable.times.fajr;
  }
  const prayerEndTime = new Date(prayerEndTimeStr);

  const nowMs = now.getTime();
  const startMs = prayerStartTime.getTime();
  const endMs = prayerEndTime.getTime();

  // 2. If the prayer is for TODAY:
  if (targetDateStr === todayStr) {
    // If current time is strictly before the prayer start time:
    if (nowMs < startMs) {
      const timeFormatted = prayerStartTime.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      return {
        isValid: false,
        code: 'PRAYER_TIME_NOT_STARTED',
        statusCode: 409,
        message: `${capitalize(normPrayer)} prayer time has not started yet. You can mark this prayer as completed once its prayer time begins at ${timeFormatted}.`,
        availableAt: prayerStartTime.toISOString(),
        currentTime: now.toISOString(),
        prayerStartTime: prayerStartTime.toISOString(),
        prayerEndTime: prayerEndTime.toISOString(),
      };
    }
  }

  return {
    isValid: true,
    prayerStartTime: prayerStartTime.toISOString(),
    prayerEndTime: prayerEndTime.toISOString(),
    isWithinWindow: nowMs >= startMs && nowMs < endMs,
    isPassed: nowMs >= endMs,
  };
}
