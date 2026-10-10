import type { PrayerStatus } from '../types'

export interface PrayerRecord {
  status: PrayerStatus
  timestamp: number
  dateStr: string // YYYY-MM-DD
}

export type DayRecords = Record<string, PrayerStatus>
export type AllRecords = Record<string, DayRecords>

const STORAGE_KEY = 'salah_companion_prayer_records_v2'

/**
 * Returns YYYY-MM-DD format for a given date.
 */
export function getDateKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Baseline initial data for the current week - defaults to empty (0).
 */
export function getBaselineWeeklyRecords(): AllRecords {
  return {}
}

/**
 * Load stored records from localStorage (defaults to empty object if none).
 */
export function loadPrayerRecords(): AllRecords {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed
      }
    }
  } catch (err) {
    console.error('Failed to load prayer records from localStorage:', err)
  }

  return {}
}

/**
 * Clears stored prayer records and resets progress to 0.
 */
export function clearPrayerRecords(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.error('Failed to clear prayer records from localStorage:', err)
  }
}

/**
 * Save all records to localStorage.
 */
export function saveAllPrayerRecords(records: AllRecords): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch (err) {
    console.error('Failed to save prayer records to localStorage:', err)
  }
}

/**
 * Save or update a single prayer status for a specific date.
 */
export function updatePrayerStatus(
  dateKey: string,
  prayerId: string,
  status: PrayerStatus | null
): AllRecords {
  const all = loadPrayerRecords()
  if (!all[dateKey]) {
    all[dateKey] = {}
  }

  if (status === null) {
    delete all[dateKey][prayerId]
  } else {
    all[dateKey][prayerId] = status
  }

  saveAllPrayerRecords(all)
  return all
}

export interface WeeklyStats {
  totalPrayers: number
  offeredCount: number // ON_TIME + LATE + QADA
  onTimeCount: number
  lateCount: number
  qadaCount: number
  missedCount: number
  completionPercent: number
  streakDays: number
  bestStreakDays: number
  totalPrayers30Days: number
  prayerBreakdown: Array<{
    id: string
    name: string
    icon: string
    count: string
    percent: number
  }>
  daysOverview: Array<{
    day: string
    dateKey: string
    isToday: boolean
    count: string
    prayers: Array<{
      id: string
      status: PrayerStatus | null
    }>
  }>
}

/**
 * Computes weekly progress matrix and statistics based on stored records.
 */
export function computeWeeklyStats(
  records: AllRecords,
  currentDate: Date = new Date()
): WeeklyStats {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const prayerIds = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
  const prayerNames: Record<string, { name: string; icon: string }> = {
    fajr: { name: 'Fajr', icon: '🌙' },
    dhuhr: { name: 'Dhuhr', icon: '☀️' },
    asr: { name: 'Asr', icon: '⛅' },
    maghrib: { name: 'Maghrib', icon: '🌅' },
    isha: { name: 'Isha', icon: '🌌' },
  }

  const dayOfWeek = currentDate.getDay() // 0 = Sun
  const mondayOffset = (dayOfWeek + 6) % 7 // days since Monday
  const todayKey = getDateKey(currentDate)

  let onTimeCount = 0
  let lateCount = 0
  let qadaCount = 0
  let missedCount = 0

  const perPrayerCompleted: Record<string, number> = {
    fajr: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  }

  const daysOverview: WeeklyStats['daysOverview'] = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(currentDate)
    d.setDate(currentDate.getDate() - mondayOffset + i)
    const key = getDateKey(d)
    const dayData = records[key] || {}
    const isToday = key === todayKey

    let dayOffered = 0
    const dayPrayersList: Array<{ id: string; status: PrayerStatus | null }> = []

    for (const pid of prayerIds) {
      const status = dayData[pid] || null
      dayPrayersList.push({ id: pid, status })

      if (status === 'ON_TIME') {
        onTimeCount++
        dayOffered++
        perPrayerCompleted[pid]++
      } else if (status === 'LATE') {
        lateCount++
        dayOffered++
        perPrayerCompleted[pid]++
      } else if (status === 'QADA') {
        qadaCount++
        dayOffered++
        perPrayerCompleted[pid]++
      } else if (status === 'MISSED') {
        missedCount++
      }
    }

    daysOverview.push({
      day: dayNames[i],
      dateKey: key,
      isToday,
      count: `${dayOffered}/5`,
      prayers: dayPrayersList,
    })
  }

  const offeredCount = onTimeCount + lateCount + qadaCount
  const totalDaysPassed = Math.max(1, mondayOffset + 1)
  const totalPossibleThisWeek = totalDaysPassed * 5
  const completionPercent =
    offeredCount > 0
      ? Math.min(100, Math.round((offeredCount / Math.max(1, totalPossibleThisWeek)) * 100))
      : 0

  const prayerBreakdown = prayerIds.map((pid) => {
    const count = perPrayerCompleted[pid]
    const percent = Math.min(100, Math.round((count / 7) * 100))
    return {
      id: pid,
      name: prayerNames[pid].name,
      icon: prayerNames[pid].icon,
      count: `${count} / 7`,
      percent,
    }
  })

  // Calculate actual consecutive streak days from records
  let streakDays = 0
  const yesterday = new Date(currentDate)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = getDateKey(yesterday)

  const hasOfferedToday = Object.values(records[todayKey] || {}).some(
    (s) => s === 'ON_TIME' || s === 'LATE' || s === 'QADA'
  )
  const hasOfferedYesterday = Object.values(records[yesterdayKey] || {}).some(
    (s) => s === 'ON_TIME' || s === 'LATE' || s === 'QADA'
  )

  if (hasOfferedToday || hasOfferedYesterday) {
    let checkDate = new Date(hasOfferedToday ? currentDate : yesterday)
    while (true) {
      const k = getDateKey(checkDate)
      const offered = Object.values(records[k] || {}).some(
        (s) => s === 'ON_TIME' || s === 'LATE' || s === 'QADA'
      )
      if (offered) {
        streakDays++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
  }

  // Calculate best streak & 30-day count
  const datesWithPrayers = Object.keys(records)
    .filter((k) =>
      Object.values(records[k] || {}).some((s) => s === 'ON_TIME' || s === 'LATE' || s === 'QADA')
    )
    .sort()

  let bestStreakDays = streakDays
  let runningStreak = 0
  const ONE_DAY_MS = 24 * 60 * 60 * 1000
  for (let i = 0; i < datesWithPrayers.length; i++) {
    if (i === 0) {
      runningStreak = 1
    } else {
      const prev = new Date(`${datesWithPrayers[i - 1]}T00:00:00Z`).getTime()
      const curr = new Date(`${datesWithPrayers[i]}T00:00:00Z`).getTime()
      const diff = Math.round((curr - prev) / ONE_DAY_MS)
      if (diff === 1) {
        runningStreak++
      } else if (diff > 1) {
        runningStreak = 1
      }
    }
    if (runningStreak > bestStreakDays) {
      bestStreakDays = runningStreak
    }
  }

  let totalPrayers30Days = 0
  const thirtyDaysAgo = new Date(currentDate)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = getDateKey(thirtyDaysAgo)

  for (const [dKey, dObj] of Object.entries(records)) {
    if (dKey >= thirtyDaysAgoStr && dKey <= todayKey) {
      for (const s of Object.values(dObj)) {
        if (s === 'ON_TIME' || s === 'LATE' || s === 'QADA') {
          totalPrayers30Days++
        }
      }
    }
  }

  return {
    totalPrayers: 35,
    offeredCount,
    onTimeCount,
    lateCount,
    qadaCount,
    missedCount,
    completionPercent,
    streakDays,
    bestStreakDays,
    totalPrayers30Days,
    prayerBreakdown,
    daysOverview,
  }
}
