import React, { useState, useMemo } from 'react'
import {
  ChevronLeft,
  Calendar,
  ChevronRight,
  Check,
  MapPin,
  Clock,
  RotateCcw,
  X,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { PrayerItem, PrayerStatus } from '../types'
import { salahApi, authStorage } from '../services/backendApi'
import {
  getIsoWeekDays,
  computeWeeklyStats,
  getDateKey,
  type AllRecords,
} from '../utils/prayerRecords'

interface MySalahScreenProps {
  prayers: PrayerItem[]
  onTogglePrayer: (id: string) => void
  onBack: () => void
  onOpenCalendar?: () => void
  onSelectPrayerDetail?: (prayer: PrayerItem) => void
  cityName: string
  calculationMethod?: string
  madhab?: string
  onToggleMadhab?: () => void
  isGPS?: boolean
  coords?: { lat: number; lng: number }
  allPrayerRecords?: AllRecords
  onUpdatePrayerStatus?: (
    prayerId: string,
    status: PrayerStatus | null,
    targetDateKey?: string
  ) => void
}

export const MySalahScreen: React.FC<MySalahScreenProps> = ({
  prayers,
  onTogglePrayer,
  onBack,
  onOpenCalendar,
  onSelectPrayerDetail,
  cityName,
  calculationMethod,
  madhab,
  onToggleMadhab,
  isGPS,
  coords,
  allPrayerRecords,
  onUpdatePrayerStatus,
}) => {
  const queryClient = useQueryClient()
  const defaultWeekMonday = useMemo(() => getIsoWeekDays().startDate, [])
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(defaultWeekMonday)
  const [selectedModalPrayer, setSelectedModalPrayer] = useState<{
    date: string
    dayName: string
    prayerId: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
    prayerName: string
    status: string
  } | null>(null)

  const hasToken = !!authStorage.getToken()
  const { data: remoteWeeklyData, isLoading: isWeeklyLoading } = useQuery({
    queryKey: ['weekly-prayers', selectedWeekStart],
    queryFn: () => salahApi.getWeeklyPrayers({ startDate: selectedWeekStart }),
    enabled: hasToken,
    staleTime: 5000,
  })

  const displayWeek = useMemo(() => {
    if (remoteWeeklyData?.data) {
      const d = remoteWeeklyData.data
      let totalCompleted = 0
      let onTimeCount = 0
      let lateCount = 0
      let qadaCount = 0
      let missedCount = 0
      let activeDaysCount = 0

      const days = d.days.map((day) => {
        let dayCompleted = 0
        const localDayRecords = allPrayerRecords?.[day.date]

        const mergedPrayers = day.prayers.map((p) => {
          let status = p.status
          let isCompleted = p.isCompleted

          // Authoritative local state merge: overrides remote cache with 0ms reactivity
          if (localDayRecords && p.id in localDayRecords) {
            const localVal = localDayRecords[p.id]
            if (localVal === 'ON_TIME') {
              status = 'on_time'
              isCompleted = true
            } else if (localVal === 'LATE') {
              status = 'late'
              isCompleted = true
            } else if (localVal === 'QADA') {
              status = 'qada'
              isCompleted = true
            } else if (localVal === 'MISSED') {
              status = 'missed'
              isCompleted = false
            } else if (localVal === null) {
              status = day.isFuture ? 'future' : 'pending'
              isCompleted = false
            }
          } else if (day.isToday && localDayRecords && !(p.id in localDayRecords)) {
            // For today, if today's local records exist but this prayer key is missing, it was undone/reset
            status = 'pending'
            isCompleted = false
          }

          if (isCompleted) {
            dayCompleted++
            totalCompleted++
          }

          if (status === 'on_time') onTimeCount++
          else if (status === 'late') lateCount++
          else if (status === 'qada') qadaCount++
          else if (status === 'missed') missedCount++

          return {
            id: p.id,
            name: p.name,
            status,
            isCompleted,
            logId: p.logId,
          }
        })

        if (dayCompleted > 0) {
          activeDaysCount++
        }

        return {
          date: day.date,
          day: day.day,
          fullDay: day.fullDay,
          isToday: day.isToday,
          isPast: day.isPast,
          isFuture: day.isFuture,
          completedCount: dayCompleted,
          dailyPercentage: Math.round((dayCompleted / 5) * 100),
          prayers: mergedPrayers,
        }
      })

      const totalPossible = d.statistics?.totalPossiblePrayers || 35
      const weeklyCompletionRate = Math.round((totalCompleted / totalPossible) * 100)

      return {
        startDate: d.startDate,
        endDate: d.endDate,
        weekLabel: d.weekLabel,
        isCurrentWeek: d.isCurrentWeek,
        prevWeekDate: d.prevWeekStartDate,
        nextWeekDate: d.nextWeekStartDate,
        completedPrayers: totalCompleted,
        totalPossiblePrayers: totalPossible,
        weeklyCompletionRate,
        activeDaysCount,
        onTimeCount,
        lateCount,
        qadaCount,
        missedCount,
        days,
      }
    }

    // Offline / fallback calculation using local records
    const localStats = computeWeeklyStats(allPrayerRecords || {}, selectedWeekStart)
    let activeDays = 0
    const days = localStats.daysOverview.map((day) => {
      if (day.completedCount > 0) activeDays++
      return {
        date: day.dateKey,
        day: day.day,
        fullDay: day.day,
        isToday: day.isToday,
        isPast: day.isPast,
        isFuture: day.isFuture,
        completedCount: day.completedCount,
        dailyPercentage: day.dailyPercentage,
        prayers: day.prayers.map((p) => {
          let status: 'on_time' | 'late' | 'qada' | 'missed' | 'pending' | 'future' = 'pending'
          if (p.status === 'ON_TIME') status = 'on_time'
          else if (p.status === 'LATE') status = 'late'
          else if (p.status === 'QADA') status = 'qada'
          else if (p.status === 'MISSED') status = 'missed'
          else status = day.isFuture ? 'future' : 'pending'
          return {
            id: p.id as any,
            name: p.name,
            status,
            isCompleted: status === 'on_time' || status === 'late' || status === 'qada',
            logId: null,
          }
        }),
      }
    })

    return {
      startDate: localStats.startDate,
      endDate: localStats.endDate,
      weekLabel: localStats.weekLabel,
      isCurrentWeek: localStats.isCurrentWeek,
      prevWeekDate: localStats.prevWeekDate,
      nextWeekDate: localStats.nextWeekDate,
      completedPrayers: localStats.offeredCount,
      totalPossiblePrayers: 35,
      weeklyCompletionRate: localStats.completionPercent,
      activeDaysCount: activeDays,
      onTimeCount: localStats.onTimeCount,
      lateCount: localStats.lateCount,
      qadaCount: localStats.qadaCount,
      missedCount: localStats.missedCount,
      days,
    }
  }, [remoteWeeklyData, allPrayerRecords, selectedWeekStart])

  const handleUpdateWeeklyPrayer = (
    dateKey: string,
    prayerId: string,
    status: PrayerStatus | null
  ) => {
    // Strictly forbid modifying past dates or future dates
    const todayKey = getDateKey(new Date())
    if (dateKey < todayKey) {
      alert('Previous days are read-only. You cannot edit, complete, or undo past prayer records.')
      return
    }
    if (dateKey > todayKey) {
      alert('Future days are read-only. You cannot edit, complete, or undo future prayer records.')
      return
    }

    if (dateKey === todayKey) {
      const matching = prayers.find((p) => p.id === prayerId)
      if (status === 'ON_TIME' || status === 'LATE' || status === 'QADA') {
        if (matching && (matching.isUpcoming || matching.statusBadge === 'upcoming') && !matching.completed) {
          alert(`${matching.name} prayer time has not started yet. Available at ${matching.time}.`)
          return
        }
      }
    }

    if (onUpdatePrayerStatus) {
      onUpdatePrayerStatus(prayerId, status, dateKey)
    }
    queryClient.invalidateQueries({ queryKey: ['weekly-prayers'] })
    queryClient.invalidateQueries({ queryKey: ['progress-summary'] })
    setSelectedModalPrayer(null)
  }

  const completedCount = prayers.filter((p) => p.completed).length
  const totalCount = prayers.length
  const progressPercent = Math.round((completedCount / totalCount) * 100)

  // Map prayer ids to image thumbnails
  const prayerImages: Record<string, string> = {
    fajr: '/images/salah-fajr.png',
    dhuhr: '/images/salah-dhuhr.png',
    asr: '/images/salah-asr.png',
    maghrib: '/images/salah-maghrib.png',
    isha: '/images/salah-isha.png',
  }

  // Circular ring calculation
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - completedCount / totalCount)

  return (
    <div className="w-full pb-20 md:pb-8 animate-fade-in select-none">
      {/* Header Bar */}
      <div className="relative px-5 sm:px-6 lg:px-8 pt-3 pb-2 overflow-hidden">
        {/* Scenic Mosque Backdrop on top right */}
        <div className="absolute right-0 top-0 w-3/5 sm:w-2/5 lg:w-1/3 h-36 sm:h-40 pointer-events-none opacity-90 overflow-hidden">
          <img
            src="/images/salah-header-bg.png"
            alt="Mosque Silhouette"
            className="w-full h-full object-cover object-left"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAF8F3] via-[#FAF8F3]/50 to-transparent w-2/5"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#FAF8F3] via-transparent to-transparent"></div>
        </div>

        {/* Top Navigation Row */}
        <div className="relative z-10 flex items-center justify-between pt-1 pb-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to home"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white border border-[#E4E0D6] shadow-xs flex items-center justify-center text-[#1C2C24] active:scale-95 transition cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onOpenCalendar}
            aria-label="Calendar view"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white border border-[#E4E0D6] shadow-xs flex items-center justify-center text-[#1C2C24] active:scale-95 transition cursor-pointer"
          >
            <Calendar className="w-4.5 h-4.5 stroke-[1.8]" />
          </button>
        </div>

        {/* Screen Title */}
        <div className="relative z-10 mt-1">
          <h1 className="text-[26px] sm:text-[28px] font-bold text-[#14261E] tracking-tight leading-tight">
            My Salah
          </h1>
          <p className="text-[13px] sm:text-sm text-[#5A6A61] font-normal mt-0.5">
            Stay consistent, one prayer at a time.
          </p>
        </div>
      </div>

      {/* Location & GPS Astronomical Precision Indicator */}
      <div className="px-5 sm:px-6 lg:px-8 mt-1.5 mb-2.5">
        <div className="w-full rounded-2xl bg-white border border-[#EDE8DC] px-3.5 sm:px-4 py-2 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-[#EBF5EF] flex items-center justify-center text-[#0E543F] flex-shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] sm:text-xs font-bold text-[#14261E] truncate max-w-[130px] sm:max-w-[200px]">
                  {cityName}
                </span>
                {isGPS && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-100 text-[#0E543F] text-[9px] font-bold tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    GPS
                  </span>
                )}
              </div>
              {coords && (
                <span className="text-[10px] text-stone-500 font-mono block leading-tight">
                  {coords.lat.toFixed(4)}° N, {coords.lng.toFixed(4)}° E
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            {onToggleMadhab ? (
              <button
                type="button"
                onClick={onToggleMadhab}
                className="text-[10px] sm:text-[10.5px] font-semibold text-[#0E543F] bg-[#EBF5EF] hover:bg-emerald-100 px-2.5 py-0.5 rounded-full border border-[#CEE5D8] transition active:scale-95 cursor-pointer"
                title="Click to toggle Asr between Shafi'i (Google 2:55 PM) and Hanafi (3:48 PM)"
              >
                {madhab || "Shafi'i"} • Karachi
              </button>
            ) : (
              <span className="text-[10px] sm:text-[10.5px] font-semibold text-[#0E543F] bg-[#EBF5EF] px-2.5 py-0.5 rounded-full border border-[#CEE5D8]">
                {madhab || "Shafi'i"} • {calculationMethod ? calculationMethod.split(',')[0].replace('University', '').trim() : 'Karachi'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Responsive Main Layout Grid */}
      <div className="px-5 sm:px-6 lg:px-8 lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start mt-2">
        {/* Left Column (5 cols on lg): Today's Progress Banner + Streak Tracker + Motivation */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Card 1: Today's Progress Banner */}
          <div className="w-full rounded-[24px] bg-[#EBF5EF] border border-[#CFE5D8] p-4 flex items-center justify-between gap-3 shadow-[0_2px_8px_rgba(14,82,63,0.04)]">
          {/* Left: Circular Ring Progress */}
          <div className="relative w-[78px] h-[78px] flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r={radius}
                stroke="#D2E8DC"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="40"
                cy="40"
                r={radius}
                stroke="#0E543F"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[13px] font-bold text-[#14261E] leading-tight">
                {completedCount} / {totalCount}
              </span>
              <span className="text-[8.5px] text-[#55675E] leading-tight mt-0.5">
                Salah<br />Completed
              </span>
            </div>
          </div>

          {/* Middle: Progress Info & Bar */}
          <div className="flex-1 min-w-0 pr-1">
            <h3 className="text-[13.5px] font-bold text-[#14261E] leading-tight">
              Today's Progress
            </h3>
            <p className="text-[11px] text-[#5A6B62] leading-tight mt-0.5 mb-2">
              Keep going, may Allah make you consistent.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-[#D5EADB] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0E543F] rounded-full transition-all duration-400 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-[#14261E]">
                {progressPercent}%
              </span>
            </div>
          </div>

            {/* Right: Small Quranic Quote Card */}
            <div className="w-[110px] sm:w-[120px] flex-shrink-0 rounded-[16px] bg-white/90 border border-[#CEE5D8] p-2.5 shadow-xs flex flex-col justify-center">
              <div className="text-[#0E543F] mb-1">
                <span className="text-xs">🌿</span>
              </div>
              <p className="font-serif italic text-[9.5px] sm:text-[10px] text-[#1E2E25] leading-tight line-clamp-3">
                “And establish prayer for My remembrance.”
              </p>
              <span className="text-[8px] sm:text-[8.5px] text-[#697A71] mt-1 font-medium">
                — Qur'an 20:14
              </span>
            </div>
          </div>

          {/* Card 2: Production-Ready Weekly Salah Overview & Streak Tracker */}
          <div className="w-full rounded-[22px] bg-white border border-[#ECE7DC] p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            {/* Header row with Title, Week Navigation, and Quick Reset */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-base flex-shrink-0">📊</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-bold text-[#14261E] leading-tight">This Week</h3>
                    {isWeeklyLoading && (
                      <span className="text-[9px] text-[#0E543F] bg-[#EBF5EF] px-1.5 py-0.2 rounded font-medium animate-pulse">
                        Syncing...
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-[#65766C] block truncate">
                    {displayWeek.weekLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0">
                {!displayWeek.isCurrentWeek && (
                  <button
                    type="button"
                    onClick={() => setSelectedWeekStart(defaultWeekMonday)}
                    className="text-[10px] font-semibold text-[#0E543F] bg-[#EBF5EF] hover:bg-emerald-100 border border-[#CEE5D8] px-2 py-0.5 rounded-full transition active:scale-95 cursor-pointer mr-0.5"
                    title="Jump to current week"
                  >
                    Today
                  </button>
                )}
                <div className="flex items-center rounded-lg border border-[#E2DDD2] bg-[#FAF8F3] p-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedWeekStart(displayWeek.prevWeekDate)}
                    className="p-1 rounded-md text-[#3A4B42] hover:bg-white hover:text-[#14261E] active:scale-90 transition cursor-pointer"
                    title="Previous week"
                    aria-label="Previous week"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedWeekStart(displayWeek.nextWeekDate)}
                    className="p-1 rounded-md text-[#3A4B42] hover:bg-white hover:text-[#14261E] active:scale-90 transition cursor-pointer"
                    title="Next week"
                    aria-label="Next week"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Weekly Completion Banner & Statistics */}
            <div className="rounded-xl bg-[#F8FAF7] border border-[#E3ECE5] px-3 py-2 mb-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[13px] font-bold text-[#14261E]">
                  {displayWeek.completedPrayers} <span className="text-[11px] font-normal text-[#5A6B62]">/ {displayWeek.totalPossiblePrayers} prayers</span>
                </span>
                <span className="text-[10.5px] font-bold text-[#0E543F] bg-[#EBF5EF] px-2 py-0.5 rounded-md border border-[#CEE5D8]">
                  {displayWeek.weeklyCompletionRate}%
                </span>
              </div>
              <span className="text-[11px] font-medium text-[#5E6F66]">
                {displayWeek.activeDaysCount} / 7 active days
              </span>
            </div>

            {/* Mini Progress Bar */}
            <div className="w-full h-1.5 bg-[#E6EFEA] rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-[#0E543F] rounded-full transition-all duration-400 ease-out"
                style={{ width: `${displayWeek.weeklyCompletionRate}%` }}
              />
            </div>

            {/* 7-Day Matrix Grid (Mon - Sun) */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
              {displayWeek.days.map((day) => {
                const dayNum = day.date ? day.date.split('-')[2] : ''
                return (
                  <div
                    key={day.date}
                    className={`flex flex-col items-center py-1.5 sm:py-2 px-0.5 rounded-xl transition border ${
                      day.isToday
                        ? 'bg-[#F2F7F2] border-emerald-400 shadow-2xs ring-1 ring-emerald-300/40'
                        : 'bg-white border-[#EFECE3] hover:border-emerald-200'
                    }`}
                  >
                    {/* Day Name & Date Number */}
                    <span className={`text-[10px] sm:text-[11px] font-bold leading-tight ${
                      day.isToday ? 'text-[#0E543F]' : 'text-[#2D3E35]'
                    }`}>
                      {day.day}
                    </span>
                    <span className="text-[9px] text-[#6E7F75] font-medium leading-tight mb-1">
                      {dayNum}
                    </span>

                    {/* Daily completion count badge */}
                    <span className={`text-[8.5px] font-bold px-1 py-0.2 rounded-md mb-2 leading-none ${
                      day.completedCount === 5
                        ? 'bg-emerald-100 text-[#0E543F]'
                        : day.completedCount > 0
                        ? 'bg-amber-50 text-amber-800'
                        : 'text-[#8A9A90]'
                    }`}>
                      {day.completedCount}/5
                    </span>

                    {/* 5 Stacked Prayer Pills (Fajr, Dhuhr, Asr, Maghrib, Isha) */}
                    <div className="flex flex-col gap-1 w-full items-center">
                      {day.prayers.map((prayer) => {
                        const status = prayer.status
                        let pillClasses = 'bg-stone-100 text-stone-400 border-stone-200'
                        const initial = prayer.id[0].toUpperCase()

                        const matchingCurrent = prayers.find((p) => p.id === prayer.id)
                        const isPastDay = day.isPast
                        const isFutureDay = day.isFuture
                        const isUpcomingToday =
                          day.isToday &&
                          (matchingCurrent?.isUpcoming || matchingCurrent?.statusBadge === 'upcoming') &&
                          !prayer.isCompleted
                        const isCompletedPrayer = prayer.isCompleted

                        // Disable modifying past days, future days, or prayers whose start time has not arrived today
                        const isMatrixDisabled =
                          isPastDay ||
                          isFutureDay ||
                          isUpcomingToday

                        if (status === 'on_time') {
                          pillClasses = 'bg-[#0E543F] text-white border-[#0B4433] shadow-2xs'
                        } else if (status === 'late') {
                          pillClasses = 'bg-[#D97706] text-white border-[#B45309] shadow-2xs'
                        } else if (status === 'qada') {
                          pillClasses = 'bg-[#7C3AED] text-white border-[#6D28D9] shadow-2xs'
                        } else if (status === 'missed') {
                          pillClasses = 'bg-[#E11D48] text-white border-[#BE123C] shadow-2xs'
                        } else if (status === 'pending') {
                          pillClasses = day.isToday
                            ? 'bg-[#EBF5EF] text-[#0E543F] border-emerald-300'
                            : 'bg-[#F5F3EC] text-stone-500 border-stone-200'
                        } else {
                          pillClasses = 'bg-[#F9F8F5] text-stone-300 border-stone-200/60'
                        }

                        const tooltip = isPastDay
                          ? `${prayer.name} (${day.day}): ${status ? status.replace('_', ' ').toUpperCase() : 'Not offered'} • Historical record (Read-Only)`
                          : isFutureDay
                          ? `${prayer.name} (${day.day}): Future date - prayer time has not started yet (Read-Only)`
                          : isUpcomingToday
                          ? `${prayer.name} (${day.day}): Prayer time has not started yet. Available at ${matchingCurrent?.time || 'prayer time'}.`
                          : isCompletedPrayer
                          ? `${prayer.name} (${day.day}): Completed • Click to manage or undo`
                          : `${prayer.name} (${day.day}): Click to mark completed or update status`

                        return (
                          <button
                            key={prayer.id}
                            type="button"
                            disabled={isMatrixDisabled}
                            onClick={() => {
                              if (isMatrixDisabled) return
                              setSelectedModalPrayer({
                                date: day.date,
                                dayName: `${day.fullDay || day.day}, ${day.date}`,
                                prayerId: prayer.id as any,
                                prayerName: prayer.name,
                                status: prayer.status,
                              })
                            }}
                            className={`w-5.5 h-5 sm:w-6.5 sm:h-5.5 rounded-md text-[9px] sm:text-[9.5px] font-bold flex items-center justify-center border transition-all ${
                              isMatrixDisabled
                                ? 'opacity-70 cursor-not-allowed select-none ' + pillClasses
                                : `active:scale-90 cursor-pointer hover:ring-1 hover:ring-emerald-500 ${pillClasses}`
                            }`}
                            title={tooltip}
                            aria-label={tooltip}
                          >
                            {status === 'on_time' ? (
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            ) : status === 'late' ? (
                              <Clock className="w-2.5 h-2.5 stroke-[2.5]" />
                            ) : status === 'qada' ? (
                              <RotateCcw className="w-2.5 h-2.5 stroke-[2.5]" />
                            ) : status === 'missed' ? (
                              <X className="w-2.5 h-2.5 stroke-[3]" />
                            ) : (
                              initial
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Status Breakdown & Color Legend */}
            <div className="mt-3 pt-2.5 border-t border-[#EFECE3] flex flex-wrap items-center justify-between gap-y-1.5 gap-x-2 text-[9.5px] sm:text-[10px] text-[#55675E]">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#0E543F]"></span>
                <span>On Time ({displayWeek.onTimeCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#D97706]"></span>
                <span>Late ({displayWeek.lateCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#7C3AED]"></span>
                <span>Qada ({displayWeek.qadaCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#E11D48]"></span>
                <span>Missed ({displayWeek.missedCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#D2E2D8]"></span>
                <span>Pending</span>
              </div>
            </div>
          </div>

          {/* Card 3: "Don't lose hope" Motivational Card */}
          <div className="w-full rounded-[22px] bg-[#F7F6EE] border border-[#E7E5D6] p-3.5 pl-4 flex items-center justify-between gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden relative">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 flex-shrink-0 mt-0.5">
                <span>🌿</span>
              </div>
              <div className="min-w-0">
                <h4 className="text-[13.5px] font-bold text-[#14261E] leading-snug">
                  Don't lose hope
                </h4>
                <p className="text-[11px] text-[#55665D] leading-[1.35] mt-0.5">
                  If you miss a prayer, don't give up. Continue with the next Salah. Allah loves those who keep coming back.
                </p>
              </div>
            </div>

            {/* Right Veranda Artwork with Chevron Button */}
            <div className="relative w-28 h-20 flex-shrink-0 rounded-xl overflow-hidden border border-stone-200/50">
              <img
                src="/images/hope-veranda.png"
                alt="Peaceful Supplication"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                className="absolute right-1.5 bottom-1.5 w-6 h-6 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-[#1C2C24]"
              >
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols on lg): List of 5 Detailed Prayer Cards */}
        <div className="lg:col-span-7 space-y-2.5 mt-3.5 lg:mt-0">
          {prayers.map((prayer) => {
            const isDone = prayer.completed
            const imageSrc = prayerImages[prayer.id] || '/images/salah-fajr.png'
            const subtitleText =
              prayer.subtitle || (isDone ? 'Alhamdulillah • Done' : 'Upcoming')

            return (
              <div
                key={prayer.id}
                className={`w-full rounded-[20px] bg-white border p-2.5 sm:p-3 pr-3.5 sm:pr-4 flex items-center justify-between gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition ${
                  prayer.statusBadge === 'active' && !isDone
                    ? 'border-emerald-500/80 ring-1 ring-emerald-500/20'
                    : 'border-[#ECE7DC] hover:border-emerald-300'
                }`}
              >
                {/* Left: Thumbnail & Prayer Title */}
                <div
                  className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                  onClick={() => onSelectPrayerDetail && onSelectPrayerDetail(prayer)}
                >
                  <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-[14px] overflow-hidden flex-shrink-0 bg-stone-100 border border-stone-200/50 relative">
                    <img
                      src={imageSrc}
                      alt={prayer.name}
                      className="w-full h-full object-cover"
                    />
                    {prayer.statusBadge === 'active' && !isDone && (
                      <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[15px] sm:text-[16px] font-bold text-[#15251E] leading-tight">
                        {prayer.name}
                      </span>
                      {prayer.statusBadge === 'active' && !isDone && (
                        <span className="text-[8.5px] font-bold uppercase tracking-wider bg-emerald-100 text-[#0E543F] px-1.5 py-0.2 rounded-md">
                          Current
                        </span>
                      )}
                    </div>
                    <span className="text-[12px] sm:text-[12.5px] font-medium text-[#5A6B62] leading-tight mt-0.5">
                      {prayer.time}
                    </span>
                  </div>
                </div>

                {/* Middle/Right: Action Status Badge / Button */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex flex-col items-end">
                    {prayer.prayerStatus === 'ON_TIME' ? (
                      <button
                        type="button"
                        onClick={() => onTogglePrayer(prayer.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5F4EC] border border-[#BCE1CD] text-[#0C4E3A] text-[11px] font-semibold hover:bg-emerald-100 transition active:scale-95 cursor-pointer shadow-2xs touch-manipulation"
                        title="Completed On Time (Click to change status or undo)"
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-[#0C4E3A] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                        <span>On Time</span>
                      </button>
                    ) : prayer.prayerStatus === 'LATE' ? (
                      <button
                        type="button"
                        onClick={() => onTogglePrayer(prayer.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-[11px] font-semibold hover:bg-amber-100 transition active:scale-95 cursor-pointer shadow-2xs touch-manipulation"
                        title="Completed Late (Click to change status or undo)"
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-[#D97706] text-white flex items-center justify-center">
                          <Clock className="w-2.5 h-2.5 stroke-[2.5]" />
                        </span>
                        <span>Late</span>
                      </button>
                    ) : prayer.prayerStatus === 'QADA' ? (
                      <button
                        type="button"
                        onClick={() => onTogglePrayer(prayer.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3E8FF] border border-[#E9D5FF] text-[#6B21A8] text-[11px] font-semibold hover:bg-purple-100 transition active:scale-95 cursor-pointer shadow-2xs touch-manipulation"
                        title="Completed Qada (Click to change status or undo)"
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-[#7C3AED] text-white flex items-center justify-center">
                          <RotateCcw className="w-2.5 h-2.5 stroke-[2.5]" />
                        </span>
                        <span>Qada</span>
                      </button>
                    ) : prayer.prayerStatus === 'MISSED' ? (
                      <button
                        type="button"
                        onClick={() => onTogglePrayer(prayer.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE4E6] border border-[#FECDD3] text-[#BE123C] text-[11px] font-semibold hover:bg-rose-100 transition active:scale-95 cursor-pointer shadow-2xs touch-manipulation"
                        title="Marked Missed (Click to change status or undo)"
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-[#E11D48] text-white flex items-center justify-center">
                          <X className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                        <span>Missed</span>
                      </button>
                    ) : isDone ? (
                      <button
                        type="button"
                        onClick={() => onTogglePrayer(prayer.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5F4EC] border border-[#BCE1CD] text-[#0C4E3A] text-[11px] font-semibold hover:bg-emerald-100 transition active:scale-95 cursor-pointer shadow-2xs touch-manipulation"
                        title="Completed (Click to change status or undo)"
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-[#0C4E3A] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                        <span>Done</span>
                      </button>
                    ) : prayer.statusBadge === 'active' ? (
                      <button
                        type="button"
                        onClick={() => onTogglePrayer(prayer.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#094838] hover:bg-[#07382B] text-white text-[11px] font-semibold active:scale-95 shadow-xs transition cursor-pointer touch-manipulation"
                      >
                        <span className="w-3.5 h-3.5 rounded-full border border-white flex-shrink-0"></span>
                        <span>Mark as Complete</span>
                      </button>
                    ) : prayer.isWindowExpired || prayer.statusBadge === 'passed' ? (
                      <button
                        type="button"
                        onClick={() => onTogglePrayer(prayer.id)}
                        title={`${prayer.name} prayer window has passed. Click to record as Qada, Late, or Missed.`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFFBEB] hover:bg-amber-100 text-[#92400E] border border-[#FDE68A] text-[10.5px] font-medium transition active:scale-95 cursor-pointer shadow-2xs touch-manipulation"
                      >
                        <Clock className="w-3 h-3 text-[#D97706]" />
                        <span>Log (Qada/Late)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onTogglePrayer(prayer.id)}
                        title={`${prayer.name} prayer time has not started yet. Available at ${prayer.time}.`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F5F2EB] text-[#8E9B93] text-[10.5px] font-medium cursor-not-allowed opacity-80 touch-manipulation"
                      >
                        <span>🔒 Available at {prayer.time}</span>
                      </button>
                    )}

                    <span className="text-[10px] sm:text-[10.5px] text-[#6A7B72] mt-1 leading-none font-medium">
                      {subtitleText}
                    </span>
                  </div>

                  {/* Right chevron */}
                  <button
                    type="button"
                    onClick={() => onSelectPrayerDetail && onSelectPrayerDetail(prayer)}
                    className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Interactive Weekly Prayer Status Dialog */}
      {selectedModalPrayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-[24px] bg-white border border-[#E5E0D4] p-5 shadow-2xl animate-scale-up">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0E543F] bg-[#EBF5EF] px-2 py-0.5 rounded-md">
                  Log Weekly Prayer
                </span>
                <h3 className="text-base font-bold text-[#14261E] mt-1">
                  {selectedModalPrayer.prayerName}
                </h3>
                <p className="text-xs text-[#5D6F65]">
                  {selectedModalPrayer.dayName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedModalPrayer(null)}
                className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const todayKey = getDateKey(new Date())
              const isPastDate = selectedModalPrayer.date < todayKey
              const isFutureDate = selectedModalPrayer.date > todayKey
              const match = prayers.find((p) => p.id === selectedModalPrayer.prayerId)
              const isUnstartedToday =
                selectedModalPrayer.date === todayKey &&
                (match?.isUpcoming || match?.statusBadge === 'upcoming') &&
                !match?.completed
              const isExpiredToday =
                selectedModalPrayer.date === todayKey &&
                match?.isWindowExpired &&
                !match?.completed
              const isAlreadyCompleted =
                selectedModalPrayer.date === todayKey &&
                match?.completed

              const isGeneralBlocked = isPastDate || isFutureDate
              const isOnTimeBlocked = isGeneralBlocked

              return (
                <>
                  {isPastDate && (
                    <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-800 text-xs flex items-center gap-2 mb-2">
                      <span className="text-sm">📜</span>
                      <p className="text-[11px] leading-tight">
                        Historical record (Read-Only). Past prayers cannot be modified through normal tracking.
                      </p>
                    </div>
                  )}

                  {isFutureDate && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <p className="text-[11px] leading-tight">
                        This date is in the future. Prayer records cannot be logged in advance.
                      </p>
                    </div>
                  )}

                  {isUnstartedToday && (
                    <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-700 text-xs flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-stone-500 flex-shrink-0" />
                      <p className="text-[11px] leading-tight">
                        {selectedModalPrayer.prayerName} starts at {match?.time}. You can record it anytime during today.
                      </p>
                    </div>
                  )}

                  {isExpiredToday && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 text-xs flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                      <p className="text-[11px] leading-tight">
                        {selectedModalPrayer.prayerName} window has passed. If offered earlier today, record it as On Time or select Late / Qada.
                      </p>
                    </div>
                  )}

                  {isAlreadyCompleted && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 mb-2">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <p className="text-[11px] leading-tight">
                        {selectedModalPrayer.prayerName} is recorded as completed. You can adjust the status or undo below.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2 mt-3">
                    <button
                      type="button"
                      disabled={isOnTimeBlocked}
                      title={isOnTimeBlocked ? 'On-time completion is not permitted' : undefined}
                      onClick={() =>
                        handleUpdateWeeklyPrayer(
                          selectedModalPrayer.date,
                          selectedModalPrayer.prayerId,
                          'ON_TIME'
                        )
                      }
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-3 transition ${
                        isOnTimeBlocked
                          ? 'opacity-40 cursor-not-allowed bg-stone-100 border-stone-200'
                          : 'border-[#CEE5D8] bg-[#F2F8F4] hover:bg-[#E5F3EB] cursor-pointer active:scale-98'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isOnTimeBlocked ? 'bg-stone-300 text-stone-500' : 'bg-[#0E543F] text-white'
                      }`}>
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div>
                        <span className={`text-xs font-bold block ${isOnTimeBlocked ? 'text-stone-500' : 'text-[#0E543F]'}`}>
                          On Time (وقت پر ادا کی)
                        </span>
                        <span className="text-[10px] text-[#4F6A5B]">Offered within the prescribed prayer window</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={isGeneralBlocked}
                      title={isGeneralBlocked ? 'Completion is not permitted' : undefined}
                      onClick={() =>
                        handleUpdateWeeklyPrayer(
                          selectedModalPrayer.date,
                          selectedModalPrayer.prayerId,
                          'LATE'
                        )
                      }
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-3 transition ${
                        isGeneralBlocked
                          ? 'opacity-40 cursor-not-allowed bg-stone-100 border-stone-200'
                          : 'border-[#FDE68A] bg-[#FFFBEB] hover:bg-[#FEF3C7] cursor-pointer active:scale-98'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isGeneralBlocked ? 'bg-stone-300 text-stone-500' : 'bg-[#D97706] text-white'
                      }`}>
                        <Clock className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div>
                        <span className={`text-xs font-bold block ${isGeneralBlocked ? 'text-stone-500' : 'text-[#92400E]'}`}>
                          Late (تاخیر سے ادا کی)
                        </span>
                        <span className="text-[10px] text-[#785421]">Offered with delay before end of window</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={isGeneralBlocked}
                      title={isGeneralBlocked ? 'Completion is not permitted' : undefined}
                      onClick={() =>
                        handleUpdateWeeklyPrayer(
                          selectedModalPrayer.date,
                          selectedModalPrayer.prayerId,
                          'QADA'
                        )
                      }
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-3 transition ${
                        isGeneralBlocked
                          ? 'opacity-40 cursor-not-allowed bg-stone-100 border-stone-200'
                          : 'border-[#E9D5FF] bg-[#FAF5FF] hover:bg-[#F3E8FF] cursor-pointer active:scale-98'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isGeneralBlocked ? 'bg-stone-300 text-stone-500' : 'bg-[#7C3AED] text-white'
                      }`}>
                        <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div>
                        <span className={`text-xs font-bold block ${isGeneralBlocked ? 'text-stone-500' : 'text-[#6B21A8]'}`}>
                          Qada (قضا ادا کی)
                        </span>
                        <span className="text-[10px] text-[#693E8F]">Offered after the prayer window passed</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={isGeneralBlocked}
                      title={isGeneralBlocked ? 'Completion is not permitted' : undefined}
                      onClick={() =>
                        handleUpdateWeeklyPrayer(
                          selectedModalPrayer.date,
                          selectedModalPrayer.prayerId,
                          'MISSED'
                        )
                      }
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-3 transition ${
                        isGeneralBlocked
                          ? 'opacity-40 cursor-not-allowed bg-stone-100 border-stone-200'
                          : 'border-[#FECDD3] bg-[#FFF1F2] hover:bg-[#FFE4E6] cursor-pointer active:scale-98'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isGeneralBlocked ? 'bg-stone-300 text-stone-500' : 'bg-[#E11D48] text-white'
                      }`}>
                        <X className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div>
                        <span className={`text-xs font-bold block ${isGeneralBlocked ? 'text-stone-500' : 'text-[#BE123C]'}`}>
                          Missed (قضا ہو گئی)
                        </span>
                        <span className="text-[10px] text-[#8C3446]">Window ended without offering</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={isPastDate || isFutureDate}
                      onClick={() =>
                        handleUpdateWeeklyPrayer(
                          selectedModalPrayer.date,
                          selectedModalPrayer.prayerId,
                          null
                        )
                      }
                      className={`w-full p-2 rounded-xl border text-center text-xs font-medium transition mt-1 ${
                        isPastDate || isFutureDate
                          ? 'opacity-40 cursor-not-allowed bg-stone-100 border-stone-200 text-stone-400'
                          : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600 cursor-pointer'
                      }`}
                    >
                      Reset / Clear Status
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
