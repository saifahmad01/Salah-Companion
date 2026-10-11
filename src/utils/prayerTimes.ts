import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan'

export interface CityInfo {
  name: string
  state: string
  lat: number
  lng: number
  suburb?: string
  fullAddress?: string
  displayShort?: string
  isGPS?: boolean
  accuracy?: number
}

export const INDIAN_CITIES: CityInfo[] = [
  {
    name: 'Kapali, Jamshedpur',
    state: 'Jharkhand',
    lat: 22.8050,
    lng: 86.2030,
    suburb: 'Kapali',
    fullAddress: 'Kapali, Jamshedpur, Jharkhand, India',
    displayShort: 'Kapali, Jamshedpur',
  },
  {
    name: 'Jamshedpur',
    state: 'Jharkhand',
    lat: 22.8046,
    lng: 86.2029,
    suburb: 'Jamshedpur',
    fullAddress: 'Jamshedpur, East Singhbhum, Jharkhand, India',
    displayShort: 'Jamshedpur, Jharkhand',
  },
  { name: 'New Delhi', state: 'Delhi', lat: 28.6139, lng: 77.2090, fullAddress: 'New Delhi, Delhi, India', displayShort: 'New Delhi' },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, fullAddress: 'Mumbai, Maharashtra, India', displayShort: 'Mumbai' },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, fullAddress: 'Bengaluru, Karnataka, India', displayShort: 'Bengaluru' },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867, fullAddress: 'Hyderabad, Telangana, India', displayShort: 'Hyderabad' },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, fullAddress: 'Kolkata, West Bengal, India', displayShort: 'Kolkata' },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, fullAddress: 'Chennai, Tamil Nadu, India', displayShort: 'Chennai' },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, fullAddress: 'Ahmedabad, Gujarat, India', displayShort: 'Ahmedabad' },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, fullAddress: 'Lucknow, Uttar Pradesh, India', displayShort: 'Lucknow' },
  { name: 'Srinagar', state: 'Jammu & Kashmir', lat: 34.0837, lng: 74.7973, fullAddress: 'Srinagar, Jammu & Kashmir, India', displayShort: 'Srinagar' },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, fullAddress: 'Pune, Maharashtra, India', displayShort: 'Pune' },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, fullAddress: 'Jaipur, Rajasthan, India', displayShort: 'Jaipur' },
  { name: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376, fullAddress: 'Patna, Bihar, India', displayShort: 'Patna' },
  { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126, fullAddress: 'Bhopal, Madhya Pradesh, India', displayShort: 'Bhopal' },
  { name: 'Kozhikode', state: 'Kerala', lat: 11.2588, lng: 75.7804, fullAddress: 'Kozhikode, Kerala, India', displayShort: 'Kozhikode' },
]

export interface ComputedPrayers {
  cityName: string
  methodName: string
  madhabName: string
  lat: number
  lng: number
  fajr: Date
  sunrise: Date
  dhuhr: Date
  asr: Date
  maghrib: Date
  isha: Date
  tomorrowFajr: Date
  activePrayerId: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'none'
  activePrayerName: string
  nextPrayerName: 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'
  nextPrayerTime: Date
  currentPrayerName: string
  timeRemainingSeconds: number
  totalWindowSeconds: number
  progressPercent: number
  source: 'astronomical' | 'aladhan-verified'
}

export function getAdhanCalculationMethod(methodName: string) {
  const norm = methodName.toLowerCase()
  let params
  if (norm.includes('karachi')) {
    params = CalculationMethod.Karachi()
  } else if (norm.includes('umm') || norm.includes('makkah')) {
    params = CalculationMethod.UmmAlQura()
  } else if (norm.includes('egypt')) {
    params = CalculationMethod.Egyptian()
  } else if (norm.includes('isna') || norm.includes('north america')) {
    params = CalculationMethod.NorthAmerica()
  } else if (norm.includes('dubai')) {
    params = CalculationMethod.Dubai()
  } else if (norm.includes('league')) {
    params = CalculationMethod.MuslimWorldLeague()
  } else {
    // Default to Karachi for Indian subcontinent
    params = CalculationMethod.Karachi()
  }
  // Standardize dhuhr methodAdjustment to 0 to match true solar noon exactly (Google & Aladhan standard)
  if (params && params.methodAdjustments) {
    params.methodAdjustments.dhuhr = 0
  }
  return params
}

export function getAdhanMadhab(madhabName: string) {
  if (madhabName.toLowerCase().includes('hanafi')) {
    return Madhab.Hanafi
  }
  return Madhab.Shafi
}

export function formatPrayerTime(date: Date, is24Hour: boolean = false): string {
  if (is24Hour) {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  }
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date).toUpperCase()
}

export function formatTime12(date: Date): string {
  return formatPrayerTime(date, false)
}

export function formatISTTime(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export function formatGregorianDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatHijriDate(date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).formatToParts(date)

    const day = parts.find((p) => p.type === 'day')?.value || '16'
    let month = parts.find((p) => p.type === 'month')?.value || "Rabi' al-Thani"
    if (month.includes('Rabiʻ II') || month.includes('Rabi al-Thani') || month.includes('Rabiʻ al-Thani')) {
      month = "Rabi' al-Thani"
    }
    const year = parts.find((p) => p.type === 'year')?.value || '1448'
    return `${day} ${month} ${year}`
  } catch {
    return "16 Rabi' al-Thani 1448"
  }
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const pad = (n: number) => n.toString().padStart(2, '0')

  if (hours > 0) {
    return `${pad(hours)}h ${pad(minutes)}m`
  }
  return `${pad(minutes)}m`
}

export function calculateIndiaPrayerTimes(
  lat: number,
  lng: number,
  cityName: string,
  now: Date = new Date(),
  methodName: string = 'Islamic University, Karachi',
  madhabName: string = 'Hanafi'
): ComputedPrayers {
  const coordinates = new Coordinates(lat, lng)
  const params = getAdhanCalculationMethod(methodName)
  params.madhab = getAdhanMadhab(madhabName)

  // Calculate today's prayers
  const todayPrayers = new PrayerTimes(coordinates, now, params)

  // Calculate tomorrow's Fajr (for post-Isha overnight window)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowPrayers = new PrayerTimes(coordinates, tomorrow, params)

  // Calculate yesterday's Isha (for pre-Fajr window)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayPrayers = new PrayerTimes(coordinates, yesterday, params)

  const nowMs = now.getTime()
  const fajrMs = todayPrayers.fajr.getTime()
  const sunriseMs = todayPrayers.sunrise.getTime()
  const dhuhrMs = todayPrayers.dhuhr.getTime()
  const asrMs = todayPrayers.asr.getTime()
  const maghribMs = todayPrayers.maghrib.getTime()
  const ishaMs = todayPrayers.isha.getTime()
  const tomorrowFajrMs = tomorrowPrayers.fajr.getTime()

  let activePrayerId: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'none' = 'none'
  let activePrayerName = ''
  let nextPrayerName: 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha' = 'Fajr'
  let nextPrayerTime = todayPrayers.fajr
  let currentPrayerName = 'Isha'
  let windowStartMs = yesterdayPrayers.isha.getTime()
  let windowEndMs = fajrMs

  if (nowMs < fajrMs) {
    // Before Fajr: within late-night/Tahajjud window
    activePrayerId = 'isha'
    activePrayerName = 'Isha (Overnight)'
    currentPrayerName = 'Isha'
    nextPrayerName = 'Fajr'
    nextPrayerTime = todayPrayers.fajr
    windowStartMs = yesterdayPrayers.isha.getTime()
    windowEndMs = fajrMs
  } else if (nowMs < sunriseMs) {
    // Within Fajr window (from Fajr until Sunrise)
    activePrayerId = 'fajr'
    activePrayerName = 'Fajr'
    currentPrayerName = 'Fajr'
    nextPrayerName = 'Dhuhr'
    nextPrayerTime = todayPrayers.dhuhr
    windowStartMs = fajrMs
    windowEndMs = sunriseMs
  } else if (nowMs < dhuhrMs) {
    // Between Sunrise and Dhuhr (Shuruq / Ishraq / Duha)
    activePrayerId = 'none'
    activePrayerName = 'Sunrise'
    currentPrayerName = 'Sunrise'
    nextPrayerName = 'Dhuhr'
    nextPrayerTime = todayPrayers.dhuhr
    windowStartMs = sunriseMs
    windowEndMs = dhuhrMs
  } else if (nowMs < asrMs) {
    // Within Dhuhr window
    activePrayerId = 'dhuhr'
    activePrayerName = 'Dhuhr'
    currentPrayerName = 'Dhuhr'
    nextPrayerName = 'Asr'
    nextPrayerTime = todayPrayers.asr
    windowStartMs = dhuhrMs
    windowEndMs = asrMs
  } else if (nowMs < maghribMs) {
    // Within Asr window
    activePrayerId = 'asr'
    activePrayerName = 'Asr'
    currentPrayerName = 'Asr'
    nextPrayerName = 'Maghrib'
    nextPrayerTime = todayPrayers.maghrib
    windowStartMs = asrMs
    windowEndMs = maghribMs
  } else if (nowMs < ishaMs) {
    // Within Maghrib window
    activePrayerId = 'maghrib'
    activePrayerName = 'Maghrib'
    currentPrayerName = 'Maghrib'
    nextPrayerName = 'Isha'
    nextPrayerTime = todayPrayers.isha
    windowStartMs = maghribMs
    windowEndMs = ishaMs
  } else {
    // Within Isha window (after Isha until tomorrow's Fajr)
    activePrayerId = 'isha'
    activePrayerName = 'Isha'
    currentPrayerName = 'Isha'
    nextPrayerName = 'Fajr'
    nextPrayerTime = tomorrowPrayers.fajr
    windowStartMs = ishaMs
    windowEndMs = tomorrowFajrMs
  }

  const timeRemainingSeconds = Math.max(
    0,
    Math.floor((nextPrayerTime.getTime() - nowMs) / 1000)
  )

  const totalWindowSeconds = Math.max(
    3600,
    Math.floor((windowEndMs - windowStartMs) / 1000)
  )

  const elapsedSeconds = Math.max(0, Math.floor((nowMs - windowStartMs) / 1000))
  const progressPercent = Math.min(
    1,
    Math.max(0.05, elapsedSeconds / totalWindowSeconds)
  )

  return {
    cityName,
    methodName,
    madhabName,
    lat,
    lng,
    fajr: todayPrayers.fajr,
    sunrise: todayPrayers.sunrise,
    dhuhr: todayPrayers.dhuhr,
    asr: todayPrayers.asr,
    maghrib: todayPrayers.maghrib,
    isha: todayPrayers.isha,
    tomorrowFajr: tomorrowPrayers.fajr,
    activePrayerId,
    activePrayerName,
    nextPrayerName,
    nextPrayerTime,
    currentPrayerName,
    timeRemainingSeconds,
    totalWindowSeconds,
    progressPercent,
    source: 'astronomical',
  }
}

export interface PrayerStatusDetails {
  id: string
  name: string
  prayerTime: Date
  windowEndTime: Date
  timeFormatted: string
  windowFormatted: string
  isCompleted: boolean
  isActive: boolean
  isUpcoming: boolean
  isPassed: boolean
  statusBadge: 'completed' | 'active' | 'upcoming' | 'passed'
  statusBadgeText: string
  subtitle: string
  availableAtMessage: string
}

export function getPrayerStatusDetails(
  prayerId: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha',
  prayerTimes: ComputedPrayers,
  now: Date,
  isCompleted: boolean,
  is24Hour: boolean = false
): PrayerStatusDetails {
  const map: Record<string, { name: string; start: Date; end: Date }> = {
    fajr: { name: 'Fajr', start: prayerTimes.fajr, end: prayerTimes.sunrise },
    dhuhr: { name: 'Dhuhr', start: prayerTimes.dhuhr, end: prayerTimes.asr },
    asr: { name: 'Asr', start: prayerTimes.asr, end: prayerTimes.maghrib },
    maghrib: { name: 'Maghrib', start: prayerTimes.maghrib, end: prayerTimes.isha },
    isha: { name: 'Isha', start: prayerTimes.isha, end: prayerTimes.tomorrowFajr },
  }

  const item = map[prayerId]
  const nowMs = now.getTime()
  const startMs = item.start.getTime()
  const endMs = item.end.getTime()

  const isActive = nowMs >= startMs && nowMs < endMs
  const isUpcoming = nowMs < startMs
  const isPassed = nowMs >= endMs

  const timeFormatted = formatPrayerTime(item.start, is24Hour)
  const windowFormatted = `${timeFormatted} - ${formatPrayerTime(item.end, is24Hour)}`

  let statusBadge: 'completed' | 'active' | 'upcoming' | 'passed' = 'upcoming'
  let statusBadgeText = '🕒 Upcoming'
  let subtitle = `Starts in ${formatDuration((startMs - nowMs) / 1000)}`

  if (isCompleted) {
    statusBadge = 'completed'
    statusBadgeText = 'Completed'
    subtitle = 'Alhamdulillah • Done'
  } else if (isActive) {
    statusBadge = 'active'
    statusBadgeText = 'Mark as Complete'
    const timeLeftSec = Math.max(0, (endMs - nowMs) / 1000)
    subtitle = `Time left: ${formatDuration(timeLeftSec)}`
  } else if (isPassed) {
    statusBadge = 'passed'
    statusBadgeText = 'Missed / Log'
    subtitle = `Passed at ${timeFormatted}`
  } else {
    statusBadge = 'upcoming'
    statusBadgeText = '🕒 Upcoming'
    const startsInSec = Math.max(0, (startMs - nowMs) / 1000)
    subtitle = `Starts in ${formatDuration(startsInSec)}`
  }

  const availableAtMessage = isUpcoming
    ? `Available at ${timeFormatted}`
    : 'Available now'

  return {
    id: prayerId,
    name: item.name,
    prayerTime: item.start,
    windowEndTime: item.end,
    timeFormatted,
    windowFormatted,
    isCompleted,
    isActive,
    isUpcoming,
    isPassed,
    statusBadge,
    statusBadgeText,
    subtitle,
    availableAtMessage,
  }
}

/**
 * Live Aladhan API Fetcher with localStorage Caching.
 * Provides official ministry Islamic prayer times matching GPS coordinates.
 */
export async function fetchAladhanPrayerTimes(
  lat: number,
  lng: number,
  date: Date = new Date(),
  methodName: string = 'Islamic University, Karachi',
  madhabName: string = 'Hanafi'
): Promise<Record<string, string> | null> {
  try {
    const dateStr = date.toISOString().split('T')[0]
    const methodId = methodName.toLowerCase().includes('karachi')
      ? 1
      : methodName.toLowerCase().includes('isna')
      ? 2
      : methodName.toLowerCase().includes('league')
      ? 3
      : methodName.toLowerCase().includes('umm')
      ? 4
      : methodName.toLowerCase().includes('egypt')
      ? 5
      : 1
    const schoolId = madhabName.toLowerCase().includes('hanafi') ? 1 : 0
    const cacheKey = `salah_aladhan_${dateStr}_${lat.toFixed(2)}_${lng.toFixed(2)}_m${methodId}_s${schoolId}`

    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    const timestamp = Math.floor(date.getTime() / 1000)
    const url = `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&method=${methodId}&school=${schoolId}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000) // 4 sec timeout

    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)

    if (!res.ok) return null
    const json = await res.json()
    if (json && json.data && json.data.timings) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(json.data.timings))
      } catch {}
      return json.data.timings
    }
  } catch (err) {
    // Network or abort error; silently fall back to local adhan library calculation
  }
  return null
}
