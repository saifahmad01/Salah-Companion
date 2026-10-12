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
 * Returns YYYY-MM-DD format for a given date, supporting IANA timezones.
 */
export function getDateKey(date: Date = new Date(), timeZone?: string): string {
  const tz = timeZone || (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Kolkata') || 'Asia/Kolkata'
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  } catch {}
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
  startDate: string
  endDate: string
  weekLabel: string
  prevWeekDate: string
  nextWeekDate: string
  isCurrentWeek: boolean
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
    isPast: boolean
    isFuture: boolean
    count: string
    completedCount: number
    dailyPercentage: number
    prayers: Array<{
      id: string
      name: string
      status: PrayerStatus | null
    }>
  }>
}

/**
 * Returns clean ISO week boundaries (Mon-Sun) and week metadata for any date string or Date
 */
export function getIsoWeekDays(ref: Date | string = new Date()): {
  monday: Date
  sunday: Date
  dates: string[]
  startDate: string
  endDate: string
  prevWeekDate: string
  nextWeekDate: string
  weekLabel: string
} {
  let d: Date
  if (typeof ref === 'string') {
    const [y, m, day] = ref.split('-').map(Number)
    d = new Date(y, m - 1, day, 12, 0, 0)
  } else {
    d = new Date(ref)
  }

  const dayOfWeek = d.getDay() // 0 = Sun
  const mondayOffset = (dayOfWeek + 6) % 7

  const monday = new Date(d)
  monday.setDate(d.getDate() - mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const temp = new Date(monday)
    temp.setDate(monday.getDate() + i)
    dates.push(getDateKey(temp))
  }

  const prevMon = new Date(monday)
  prevMon.setDate(monday.getDate() - 7)
  const prevWeekDate = getDateKey(prevMon)

  const nextMon = new Date(monday)
  nextMon.setDate(monday.getDate() + 7)
  const nextWeekDate = getDateKey(nextMon)

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  const mDay = String(monday.getDate()).padStart(2, '0')
  const sDay = String(sunday.getDate()).padStart(2, '0')
  const mMonth = monthNames[monday.getMonth()]
  const sMonth = monthNames[sunday.getMonth()]
  const mYear = monday.getFullYear()
  const sYear = sunday.getFullYear()

  const weekLabel =
    mYear === sYear
      ? `${mDay} ${mMonth} – ${sDay} ${sMonth} ${sYear}`
      : `${mDay} ${mMonth} ${mYear} – ${sDay} ${sMonth} ${sYear}`

  return {
    monday,
    sunday,
    dates,
    startDate: dates[0],
    endDate: dates[6],
    prevWeekDate,
    nextWeekDate,
    weekLabel,
  }
}

/**
 * Computes weekly progress matrix and statistics based on stored records.
 */
export function computeWeeklyStats(
  records: AllRecords,
  currentDate: Date | string = new Date()
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

  const { dates, startDate, endDate, prevWeekDate, nextWeekDate, weekLabel } =
    getIsoWeekDays(currentDate)

  const realTodayKey = getDateKey(new Date())
  const isCurrentWeek = dates.includes(realTodayKey)

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
    const key = dates[i]
    const dayData = records[key] || {}
    const isToday = key === realTodayKey
    const isPast = key < realTodayKey
    const isFuture = key > realTodayKey

    const isDayFriday = i === 4
    let dayOffered = 0
    const dayPrayersList: Array<{ id: string; name: string; status: PrayerStatus | null }> = []

    for (const pid of prayerIds) {
      let status = dayData[pid] || null
      if (isDayFriday && pid === 'dhuhr' && !status) {
        status = (dayData as any)['juma'] || null
      }
      const displayName = (isDayFriday && pid === 'dhuhr') ? 'Juma' : prayerNames[pid].name
      dayPrayersList.push({ id: pid, name: displayName, status })

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

    const dailyPercentage = Math.round((dayOffered / 5) * 100)

    daysOverview.push({
      day: dayNames[i],
      dateKey: key,
      isToday,
      isPast,
      isFuture,
      count: `${dayOffered}/5`,
      completedCount: dayOffered,
      dailyPercentage,
      prayers: dayPrayersList,
    })
  }

  const offeredCount = onTimeCount + lateCount + qadaCount
  const completionPercent = Math.min(100, Math.round((offeredCount / 35) * 100))

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
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = getDateKey(yesterday)

  const hasOfferedToday = Object.values(records[realTodayKey] || {}).some(
    (s) => s === 'ON_TIME' || s === 'LATE' || s === 'QADA'
  )
  const hasOfferedYesterday = Object.values(records[yesterdayKey] || {}).some(
    (s) => s === 'ON_TIME' || s === 'LATE' || s === 'QADA'
  )

  if (hasOfferedToday || hasOfferedYesterday) {
    let checkDate = new Date(hasOfferedToday ? new Date() : yesterday)
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
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = getDateKey(thirtyDaysAgo)

  for (const [dKey, dObj] of Object.entries(records)) {
    if (dKey >= thirtyDaysAgoStr && dKey <= realTodayKey) {
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
    startDate,
    endDate,
    weekLabel,
    prevWeekDate,
    nextWeekDate,
    isCurrentWeek,
    prayerBreakdown,
    daysOverview,
  }
}
