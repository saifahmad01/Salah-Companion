import {
  Coordinates,
  CalculationMethod,
  PrayerTimes,
  Madhab,
  Prayer,
} from 'adhan';

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
