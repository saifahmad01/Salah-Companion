import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar,
  ChevronDown,
  Flame,
  Trophy,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CheckSquare,
  Moon,
  GraduationCap,
  Clock,
  RotateCcw,
  X,
  Check,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CalendarDays,
} from 'lucide-react'
import {
  loadPrayerRecords,
  computeWeeklyStats,
  type WeeklyStats,
} from '../utils/prayerRecords'
import { salahApi } from '../services/backendApi'
import { ProgressScreenSkeleton } from './SkeletonLoaders'

interface ProgressScreenProps {
  onBack?: () => void
  onOpenCalendar?: () => void
  weeklyStats?: WeeklyStats
  quranDaysCount?: number
  deedsCompletedCount?: number
}

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

interface BackendProgressSummary {
  period: string
  dateRange: { start: string; end: string }
  summary: {
    totalTrackedSlots: number
    completedCount: number
    onTimeCount: number
    lateCount: number
    qadaCount: number
    missedCount: number
    pendingCount: number
    completionPercent: number
    onTimePercent: number
  }
  streak: {
    currentStreak: number
    longestStreak: number
    weeklyCompletionRate: number
  }
  prayerBreakdown: Record<
    string,
    {
      name: string
      total: number
      completed: number
      onTime: number
      late: number
      qada: number
      missed: number
      percent: number
    }
  >
  completionTrend: Array<{
    date: string
    day: string
    completed: number
    total: number
    rate: number
    onTime: number
    late: number
    qada: number
    missed: number
  }>
  comparison?: {
    currentCompleted: number
    previousCompleted: number
    diffPercent: number
    diffDescription: string
  }
  calendarGrid?: Array<{
    date: string
    day: number
    status: 'perfect' | 'good' | 'partial' | 'missed' | 'empty'
    completedCount: number
    missedCount: number
  }>
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  onBack,
  onOpenCalendar,
  weeklyStats,
  quranDaysCount = 0,
  deedsCompletedCount = 0,
}) => {
  const [period, setPeriod] = useState<PeriodType>('weekly')
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return d.toISOString().split('T')[0]
  })
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [backendData, setBackendData] = useState<BackendProgressSummary | null>(() => {
    try {
      const cached = sessionStorage.getItem('salah_progress_weekly')
      if (cached) return JSON.parse(cached)
    } catch {}
    return null
  })
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const cached = sessionStorage.getItem('salah_progress_weekly')
      if (cached) return false
    } catch {}
    return true
  })
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [syncError, setSyncError] = useState<boolean>(false)
  const [pendingQadaList, setPendingQadaList] = useState<Array<{ id: string; prayerName: string; date: string; notes?: string }>>([])
  const [qadaLoadingId, setQadaLoadingId] = useState<string | null>(null)
  const [qadaSuccessMessage, setQadaSuccessMessage] = useState<string | null>(null)

  const fetchPendingQada = useCallback(async () => {
    try {
      const res = await salahApi.getPendingQadaPrayers()
      if (res && res.success && Array.isArray(res.data)) {
        setPendingQadaList(res.data)
      }
    } catch (e) {
      console.warn('[ProgressScreen] Error fetching pending Qada:', e)
    }
  }, [])

  const handlePerformQada = async (prayerName: string, date: string, id: string) => {
    try {
      setQadaLoadingId(id)
      setQadaSuccessMessage(null)
      const res = await salahApi.recordQadaPrayer({ prayerName, date })
      if (res && res.success) {
        setQadaSuccessMessage(res.message || `Qada recorded for ${prayerName} (${date}).`)
        await Promise.all([fetchProgress(true), fetchPendingQada()])
      }
    } catch (err: any) {
      console.error('[ProgressScreen] Error recording Qada:', err)
      alert(err.message || 'Failed to record Qada.')
    } finally {
      setQadaLoadingId(null)
    }
  }

  // Local fallback stats
  const localStats = useMemo(() => {
    if (weeklyStats) return weeklyStats
    const records = loadPrayerRecords()
    return computeWeeklyStats(records)
  }, [weeklyStats])

  // Fetch real statistics from backend (stale-while-revalidate)
  const fetchProgress = useCallback(async (isSilent = false) => {
    const cacheKey = `salah_progress_${period}${period === 'custom' ? `_${customStartDate}_${customEndDate}` : ''}`
    let hasCached = false
    try {
      hasCached = !!sessionStorage.getItem(cacheKey)
    } catch {}

    if (!isSilent && !hasCached && !backendData) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    setSyncError(false)

    try {
      const params: { period: string; startDate?: string; endDate?: string } = { period }
      if (period === 'custom') {
        params.startDate = customStartDate
        params.endDate = customEndDate
      }
      const res = await salahApi.getProgressSummary(params)
      if (res && res.summary) {
        setBackendData(res)
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(res))
        } catch {}
      }
    } catch (err) {
      console.warn('[ProgressScreen] Falling back to local offline statistics:', err)
      setSyncError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [period, customStartDate, customEndDate, backendData])

  useEffect(() => {
    const cacheKey = `salah_progress_${period}${period === 'custom' ? `_${customStartDate}_${customEndDate}` : ''}`
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        setBackendData(JSON.parse(cached))
        setLoading(false)
      }
    } catch {}
    fetchProgress()
  }, [period, customStartDate, customEndDate])

  // Consolidated display stats (merging backend with local fallback)
  const displayStats = useMemo(() => {
    if (backendData && backendData.summary) {
      const s = backendData.summary
      const st = backendData.streak || {
        currentStreak: localStats.streakDays,
        longestStreak: localStats.bestStreakDays || localStats.streakDays,
        weeklyCompletionRate: localStats.completionPercent,
      }

      const pb = backendData.prayerBreakdown || {}
      const prayerList = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map((p) => {
        const item = pb[p] || {
          name: p.charAt(0).toUpperCase() + p.slice(1),
          total: period === 'daily' ? 1 : 7,
          completed: 0,
          onTime: 0,
          late: 0,
          qada: 0,
          missed: 0,
          percent: 0,
        }
        const icons: Record<string, string> = {
          fajr: '🌅',
          dhuhr: '☀️',
          asr: '🌤️',
          maghrib: '🌆',
          isha: '🌙',
        }
        return {
          id: p,
          name: item.name || p.charAt(0).toUpperCase() + p.slice(1),
          icon: icons[p] || '🕌',
          completed: item.completed,
          total: item.total,
          percent: item.percent,
          onTime: item.onTime,
          late: item.late,
          qada: item.qada,
          missed: item.missed,
        }
      })

      return {
        completionPercent: s.completionPercent || 0,
        onTimePercent: s.onTimePercent || 0,
        offeredCount: s.completedCount || 0,
        totalPrayers: s.totalTrackedSlots || 0,
        onTimeCount: s.onTimeCount || 0,
        lateCount: s.lateCount || 0,
        qadaCount: s.qadaCount || 0,
        missedCount: s.missedCount || 0,
        pendingCount: s.pendingCount || 0,
        streakDays: st.currentStreak || 0,
        bestStreakDays: st.longestStreak || 0,
        prayerBreakdown: prayerList,
        trend: backendData.completionTrend || [],
        comparison: backendData.comparison,
        calendarGrid: backendData.calendarGrid || [],
        isLiveBackend: true,
      }
    }

    // Local Storage Fallback
    return {
      completionPercent: localStats.completionPercent || 0,
      onTimePercent: Math.round(((localStats.onTimeCount || 0) / Math.max(1, localStats.offeredCount)) * 100),
      offeredCount: localStats.offeredCount || 0,
      totalPrayers: localStats.totalPrayers || 35,
      onTimeCount: localStats.onTimeCount || 0,
      lateCount: localStats.lateCount || 0,
      qadaCount: localStats.qadaCount || 0,
      missedCount: localStats.missedCount || 0,
      pendingCount: Math.max(0, localStats.totalPrayers - localStats.offeredCount - localStats.missedCount),
      streakDays: localStats.streakDays || 0,
      bestStreakDays: localStats.bestStreakDays || localStats.streakDays || 0,
      prayerBreakdown: localStats.prayerBreakdown.map((item) => {
        const parsedCount = parseInt(item.count, 10) || 0
        return {
          id: item.name.toLowerCase(),
          name: item.name,
          icon: item.icon,
          completed: parsedCount,
          total: 7,
          percent: item.percent,
          onTime: parsedCount,
          late: 0,
          qada: 0,
          missed: Math.max(0, 7 - parsedCount),
        }
      }),
      trend: [],
      comparison: undefined,
      calendarGrid: [],
      isLiveBackend: false,
    }
  }, [backendData, localStats, period])

  const quranPercent = Math.min(100, Math.round((quranDaysCount / 7) * 100))
  const deedsPercent = Math.min(100, Math.round((deedsCompletedCount / 21) * 100))

  const overallActivity = [
    { name: 'Salah', value: `${displayStats.completionPercent}%`, color: '#0E543F', icon: Moon },
    { name: 'Quran', value: `${quranPercent}%`, color: '#2563EB', icon: BookOpen },
    { name: 'Daily Deeds', value: `${deedsPercent}%`, color: '#D97706', icon: CheckSquare },
    { name: 'Learning', value: '100%', color: '#7C3AED', icon: GraduationCap },
  ]

  // Circular ring calculation
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - displayStats.completionPercent / 100)

  return (
    <div className="w-full pb-20 md:pb-8 animate-fade-in select-none">
      {/* Header Bar */}
      <div className="relative px-4 sm:px-6 lg:px-8 pt-3 pb-3 overflow-hidden">
        {/* Scenic Mosque Backdrop on top right */}
        <div className="absolute right-0 top-0 w-3/5 sm:w-2/5 lg:w-1/3 h-36 sm:h-44 pointer-events-none opacity-90 overflow-hidden">
          <img
            src="/images/progress-header-bg.png"
            alt="Mosque Silhouette"
            className="w-full h-full object-cover object-left"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAF8F3] via-[#FAF8F3]/50 to-transparent w-2/5"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#FAF8F3] via-transparent to-transparent"></div>
        </div>

        {/* Top Navigation Row */}
        <div className="relative z-10 flex items-center justify-between pt-1 pb-1">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to home"
              className="w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-[#E4E0D6] shadow-xs flex items-center justify-center text-[#1C2C24] active:scale-95 transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchProgress(true)}
              disabled={refreshing}
              className="p-2 rounded-full bg-white/90 border border-[#E5E0D4] shadow-xs text-xs font-semibold text-[#1C2C24] hover:bg-white active:scale-95 transition cursor-pointer"
              title="Refresh statistics"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#5C6D64] ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onOpenCalendar}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-[#E5E0D4] shadow-xs text-xs font-semibold text-[#1C2C24] hover:bg-white active:scale-95 transition cursor-pointer"
              title="Open Islamic Calendar"
            >
              <Calendar className="w-3.5 h-3.5 text-[#5C6D64]" />
              <span className="capitalize">{period} View</span>
              <ChevronDown className="w-3 h-3 text-[#5C6D64]" />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="relative z-10 mt-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-bold text-[#14261E] tracking-tight leading-tight">
              My Progress
            </h1>
            {displayStats.isLiveBackend && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#0E543F] border border-emerald-200">
                Verified Records
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#5A6A61] font-normal mt-0.5">
            Real prayer habit tracking, streak verification, and Sunnah deed metrics.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="relative z-10 mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {(['daily', 'weekly', 'monthly', 'yearly', 'custom'] as PeriodType[]).map((p) => {
            const isSelected = period === p
            const labels: Record<PeriodType, string> = {
              daily: 'Daily',
              weekly: 'Weekly',
              monthly: 'Monthly',
              yearly: 'Yearly',
              custom: 'Custom Range',
            }
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-[#0C382B] text-[#FAF8F3] shadow-xs'
                    : 'bg-white/80 text-stone-600 hover:bg-white border border-stone-200/70'
                }`}
              >
                {labels[p]}
              </button>
            )
          })}
        </div>

        {/* Custom Date Range Filter Inputs */}
        {period === 'custom' && (
          <div className="relative z-10 mt-3 p-3 rounded-2xl bg-white border border-[#EDE8DC] shadow-xs flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-stone-600 font-semibold">
              <Filter className="w-3.5 h-3.5 text-[#0E543F]" />
              <span>Range:</span>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-xl border border-stone-200 bg-stone-50 font-medium text-stone-800"
              />
              <span className="text-xs text-stone-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-xl border border-stone-200 bg-stone-50 font-medium text-stone-800"
              />
            </div>
            <button
              type="button"
              onClick={() => fetchProgress()}
              className="px-3 py-1 bg-[#0E543F] text-white rounded-xl text-xs font-bold hover:bg-[#0A3D2E] transition cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* Main Analytics Content Container */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-4 mt-1">
        {syncError && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Offline / Slow Connection. Displaying cached prayer records.</span>
            </div>
            <button
              type="button"
              onClick={() => fetchProgress(false)}
              className="px-2.5 py-1 rounded-xl bg-amber-200 hover:bg-amber-300 font-semibold transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {loading && !backendData ? (
          <ProgressScreenSkeleton />
        ) : (
          <>
            {/* ROW 1: Salah Overview Ring + Stat Cards & Keep Going */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Card 1: Salah Completion Ring */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="w-full h-full rounded-[24px] bg-white border border-[#EDE8DC] p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-bold text-[#14261E]">
                    Salah Completion ({period.toUpperCase()})
                  </h3>
                  <span className="text-[11px] font-semibold text-[#0E543F] bg-[#EBF5EF] px-2.5 py-0.5 rounded-full">
                    {displayStats.isLiveBackend ? 'Live Database' : 'Offline Mode'}
                  </span>
                </div>
                <p className="text-[11.5px] text-[#697A71] mt-0.5 mb-2">
                  You completed {displayStats.offeredCount} out of {displayStats.totalPrayers} tracked prayer slots.
                  {displayStats.pendingCount > 0 && (
                    <span className="text-amber-700 font-semibold ml-1">
                      ({displayStats.pendingCount} pending/future)
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-4 sm:gap-6 my-auto py-2">
                {/* Left: Dynamic Completion Ring */}
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      stroke="#E2EDE7"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      stroke="#0E543F"
                      strokeWidth="8"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-500 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[20px] sm:text-[22px] font-bold text-[#14261E] leading-tight">
                      {displayStats.completionPercent}%
                    </span>
                    <span className="text-[10px] text-[#697A71] font-medium leading-tight">
                      Completion
                    </span>
                  </div>
                </div>

                {/* Right: Breakdown per prayer */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  {displayStats.prayerBreakdown.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <span className="w-4 text-center text-xs">{item.icon}</span>
                      <span className="w-14 font-medium text-[#203128] truncate">
                        {item.name}
                      </span>
                      <div className="flex-1 h-2 bg-[#E9E6DE] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0E543F] rounded-full transition-all duration-400"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-[#182721] w-12 text-right">
                        {item.completed}/{item.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly comparison pill */}
              {displayStats.comparison && (
                <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="text-stone-500 font-medium text-[11px]">Period Comparison:</span>
                  <div className="flex items-center gap-1 font-bold">
                    {displayStats.comparison.diffPercent >= 0 ? (
                      <span className="text-emerald-700 flex items-center gap-0.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        +{displayStats.comparison.diffPercent}%
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-0.5">
                        <TrendingDown className="w-3.5 h-3.5" />
                        {displayStats.comparison.diffPercent}%
                      </span>
                    )}
                    <span className="text-stone-400 font-normal text-[10px]">
                      ({displayStats.comparison.diffDescription})
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: 3 Stat Cards + Keep Going Banner */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-3">
            {/* Row of 3 Stat Cards */}
            <div className="grid grid-cols-3 gap-2">
              {/* Card 1: Streak */}
              <div className="rounded-[20px] bg-white border border-[#ECE7DC] p-3 shadow-xs flex flex-col justify-between">
                <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mb-1.5">
                  <Flame className="w-4 h-4 fill-orange-500" />
                </div>
                <div>
                  <span className="text-[10px] font-medium text-[#65766D] block leading-tight">
                    Current Streak
                  </span>
                  <span className="text-[16px] font-bold text-[#14261E] block leading-tight mt-0.5">
                    {displayStats.streakDays || 0} Days
                  </span>
                  <span className="text-[9.5px] text-[#718279] block mt-1 leading-tight">
                    {displayStats.streakDays ? 'Keep it going! MashaAllah.' : 'Start your streak today.'}
                  </span>
                </div>
              </div>

              {/* Card 2: Best Streak */}
              <div className="rounded-[20px] bg-white border border-[#ECE7DC] p-3 shadow-xs flex flex-col justify-between">
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-1.5">
                  <Trophy className="w-4 h-4 fill-amber-500" />
                </div>
                <div>
                  <span className="text-[10px] font-medium text-[#65766D] block leading-tight">
                    Best Streak
                  </span>
                  <span className="text-[16px] font-bold text-[#14261E] block leading-tight mt-0.5">
                    {displayStats.bestStreakDays || displayStats.streakDays || 0} Days
                  </span>
                  <span className="text-[9.5px] text-[#718279] block mt-1 leading-tight">
                    Personal record.
                  </span>
                </div>
              </div>

              {/* Card 3: Total Completed */}
              <div className="rounded-[20px] bg-white border border-[#ECE7DC] p-3 shadow-xs flex flex-col justify-between">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 mb-1.5">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-medium text-[#65766D] block leading-tight">
                    Total Completed
                  </span>
                  <span className="text-[16px] font-bold text-[#14261E] block leading-tight mt-0.5">
                    {displayStats.offeredCount}
                  </span>
                  <span className="text-[9.5px] text-[#718279] block mt-1 leading-tight">
                    In selected period.
                  </span>
                </div>
              </div>
            </div>

            {/* Card 5: Keep Going Banner */}
            <div className="w-full flex-1 rounded-[22px] bg-[#F7F6EE] border border-[#E7E5D6] p-4 flex items-center justify-between gap-3 shadow-xs relative overflow-hidden">
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <span className="text-xl">🌿</span>
                <div>
                  <h4 className="text-[13.5px] font-bold text-[#14261E]">
                    Keep Going
                  </h4>
                  <p className="text-[11px] text-[#55665D] leading-[1.35] mt-0.5">
                    Every small step you take towards Allah is valuable. Consistency is better than perfection.
                  </p>
                  <span className="text-[10px] text-[#75867E] block mt-1 font-medium">
                    — Qur'an 11:112
                  </span>
                </div>
              </div>

              <div className="relative w-24 sm:w-28 h-20 flex-shrink-0 rounded-xl overflow-hidden border border-stone-200/50">
                <img
                  src="/images/progress-lantern.png"
                  alt="Steadfastness"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: Prayer Status Breakdown (On Time, Late, Qada, Missed) */}
        <div className="w-full rounded-[24px] bg-white border border-[#EDE8DC] p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-base">📊</span>
              <h3 className="text-[14px] font-bold text-[#14261E]">
                Prayer Status Breakdown (کیفیت کا جائزہ)
              </h3>
            </div>
            <span className="text-[10.5px] text-[#55675E] font-medium bg-stone-100 px-2 py-0.5 rounded-full">
              Never marks future prayers as missed
            </span>
          </div>

          {/* 5 Status Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {/* ON TIME */}
            <div className="p-3 rounded-2xl bg-[#EBF5EF] border border-[#CEE5D8] flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-[#0E543F]">ON TIME</span>
                <span className="w-5 h-5 rounded-full bg-[#0E543F] text-white flex items-center justify-center text-[10px]">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              </div>
              <span className="text-xl font-bold text-[#14261E]">{displayStats.onTimeCount}</span>
              <span className="text-[10px] text-[#0E543F] font-semibold mt-0.5">
                وقت پر ادا کی
              </span>
            </div>

            {/* LATE */}
            <div className="p-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-[#92400E]">LATE</span>
                <span className="w-5 h-5 rounded-full bg-[#D97706] text-white flex items-center justify-center text-[10px]">
                  <Clock className="w-3 h-3 stroke-[2.5]" />
                </span>
              </div>
              <span className="text-xl font-bold text-[#14261E]">{displayStats.lateCount}</span>
              <span className="text-[10px] text-[#92400E] font-semibold mt-0.5">
                تاخیر سے
              </span>
            </div>

            {/* QADA */}
            <div className="p-3 rounded-2xl bg-[#FAF5FF] border border-[#E9D5FF] flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-[#6B21A8]">QADA</span>
                <span className="w-5 h-5 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-[10px]">
                  <RotateCcw className="w-3 h-3 stroke-[2.5]" />
                </span>
              </div>
              <span className="text-xl font-bold text-[#14261E]">{displayStats.qadaCount}</span>
              <span className="text-[10px] text-[#6B21A8] font-semibold mt-0.5">
                قضا ادا کی
              </span>
            </div>

            {/* MISSED */}
            <div className="p-3 rounded-2xl bg-[#FFF1F2] border border-[#FECDD3] flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-[#BE123C]">MISSED</span>
                <span className="w-5 h-5 rounded-full bg-[#E11D48] text-white flex items-center justify-center text-[10px]">
                  <X className="w-3 h-3 stroke-[3]" />
                </span>
              </div>
              <span className="text-xl font-bold text-[#14261E]">{displayStats.missedCount}</span>
              <span className="text-[10px] text-[#BE123C] font-semibold mt-0.5">
                قضا ہو گئی
              </span>
            </div>

            {/* PENDING / FUTURE */}
            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col justify-between shadow-2xs col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-stone-600">PENDING</span>
                <span className="w-5 h-5 rounded-full bg-stone-300 text-stone-700 flex items-center justify-center text-[10px]">
                  <Clock className="w-3 h-3" />
                </span>
              </div>
              <span className="text-xl font-bold text-stone-700">{displayStats.pendingCount}</span>
              <span className="text-[10px] text-stone-500 font-semibold mt-0.5">
                باقی / آنے والا وقت
              </span>
            </div>
          </div>
        </div>

        {/* QADA RECOVERY & ACTION SECTION */}
        <div className="w-full rounded-[24px] bg-white border border-[#EDE8DC] p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-[#14261E]">
                  Qada Management & Recovery (قضا کی ادائیگی)
                </h3>
                <p className="text-[11px] text-stone-500">
                  Perform and record missed prayers to fulfill your spiritual obligations.
                </p>
              </div>
            </div>
            {pendingQadaList.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
                {pendingQadaList.length} Awaiting Qada
              </span>
            )}
          </div>

          {qadaSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <span>{qadaSuccessMessage}</span>
              <button
                type="button"
                onClick={() => setQadaSuccessMessage(null)}
                className="text-emerald-600 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {pendingQadaList.length === 0 ? (
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/60 text-center text-xs text-stone-600">
              <span className="text-base block mb-1">✨ Alhamdulillah!</span>
              No unfulfilled missed prayers currently recorded. Keep up your punctual habit!
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {pendingQadaList.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF5FF] border border-[#E9D5FF] gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-purple-950 capitalize">{item.prayerName}</span>
                      <span className="text-[10.5px] text-purple-700 font-mono bg-purple-100/70 px-1.5 py-0.5 rounded">
                        {item.date}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-[10px] text-stone-500 truncate mt-0.5">{item.notes}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={qadaLoadingId === item.id}
                    onClick={() => handlePerformQada(item.prayerName, item.date, item.id)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 active:scale-95 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <RotateCcw className={`w-3 h-3 ${qadaLoadingId === item.id ? 'animate-spin' : ''}`} />
                    <span>{qadaLoadingId === item.id ? 'Recording...' : 'Mark as Qada'}</span>
                  </button>
                </div>
              ))}
              {pendingQadaList.length > 10 && (
                <p className="text-[10.5px] text-stone-400 text-center pt-1">
                  Showing top 10 of {pendingQadaList.length} pending Qada prayers.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ROW 3: Prayer Completion Trends & Calendar Grid */}
        {displayStats.trend.length > 0 && (
          <div className="w-full rounded-[24px] bg-white border border-[#EDE8DC] p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-[#0E543F]" />
                <h3 className="text-[14px] font-bold text-[#14261E]">
                  Prayer Completion Trends
                </h3>
              </div>
              <span className="text-[10.5px] text-stone-500 font-medium">
                {displayStats.trend.length} Days Tracked
              </span>
            </div>

            {/* Visual Bar Chart */}
            <div className="flex items-end gap-1 sm:gap-2 h-36 pt-4 px-1 border-b border-stone-100">
              {displayStats.trend.map((point) => {
                const heightPercent = Math.min(100, point.rate || 0)
                return (
                  <div
                    key={point.date}
                    className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative"
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center bg-stone-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none">
                      <span>{point.date} ({point.day})</span>
                      <span className="font-bold text-emerald-300">{point.completed}/{point.total} ({point.rate}%)</span>
                    </div>

                    <div className="w-full max-w-[28px] bg-stone-100 rounded-t-md h-full flex flex-col justify-end overflow-hidden">
                      <div
                        className="w-full rounded-t-md transition-all duration-500"
                        style={{
                          height: `${heightPercent}%`,
                          backgroundColor:
                            heightPercent === 100
                              ? '#0E543F'
                              : heightPercent >= 60
                              ? '#22C55E'
                              : heightPercent > 0
                              ? '#D97706'
                              : '#E5E7EB',
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-stone-500 font-medium truncate max-w-full">
                      {point.day.slice(0, 3)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Calendar Grid (When available) */}
        {displayStats.calendarGrid.length > 0 && (
          <div className="w-full rounded-[24px] bg-white border border-[#EDE8DC] p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-[#0E543F]" />
                <h3 className="text-[14px] font-bold text-[#14261E]">
                  Calendar Salah History
                </h3>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0E543F]"></span> 5/5 Full</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 3-4 Salah</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> 1-2 Salah</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-stone-200"></span> None</span>
              </div>
            </div>

            <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-14 gap-1.5 pt-1">
              {displayStats.calendarGrid.map((c) => {
                const bg =
                  c.status === 'perfect'
                    ? 'bg-[#0E543F] text-white'
                    : c.status === 'good'
                    ? 'bg-emerald-500 text-white'
                    : c.status === 'partial'
                    ? 'bg-amber-500 text-white'
                    : c.status === 'missed'
                    ? 'bg-red-400 text-white'
                    : 'bg-stone-100 text-stone-400'

                return (
                  <div
                    key={c.date}
                    className={`p-1.5 rounded-xl flex flex-col items-center justify-center text-center transition ${bg}`}
                    title={`${c.date}: ${c.completedCount} prayers completed`}
                  >
                    <span className="text-[10px] font-bold leading-tight">{c.day}</span>
                    <span className="text-[8px] opacity-90 leading-tight">{c.completedCount}/5</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ROW 4: Quran & Deeds + Overall Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left: 2-Column Cards: Quran & Deeds */}
          <div className="lg:col-span-6 grid grid-cols-2 gap-2.5">
            {/* Quran */}
            <div className="rounded-[20px] bg-white border border-[#ECE7DC] p-3.5 shadow-xs flex items-center justify-between">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-[#0E543F] flex-shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-[#1C2C24] block">
                    Quran Reading
                  </span>
                  <span className="text-[15px] font-bold text-[#14261E] block mt-0.5">
                    {quranDaysCount} days
                  </span>
                  <span className="text-[9.5px] text-[#67776F] block mt-0.5 leading-tight">
                    {quranDaysCount > 0
                      ? `Active reading on ${quranDaysCount} days.`
                      : 'No Quran reading logged yet.'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 flex-shrink-0" />
            </div>

            {/* Deeds */}
            <div className="rounded-[20px] bg-white border border-[#ECE7DC] p-3.5 shadow-xs flex items-center justify-between">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-[#0E543F] flex-shrink-0">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-[#1C2C24] block">
                    Daily Deeds
                  </span>
                  <span className="text-[15px] font-bold text-[#14261E] block mt-0.5">
                    {deedsCompletedCount} completed
                  </span>
                  <span className="text-[9.5px] text-[#67776F] block mt-0.5 leading-tight">
                    {deedsCompletedCount > 0
                      ? 'Small actions make a big difference.'
                      : 'No daily deeds logged yet.'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 flex-shrink-0" />
            </div>
          </div>

          {/* Right: Card 4: Overall Activity */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="w-full h-full rounded-[22px] bg-white border border-[#ECE7DC] p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center gap-1.5 mb-3">
                <BarChart2 className="w-4 h-4 text-[#0E543F]" />
                <div>
                  <h3 className="text-[13.5px] font-bold text-[#14261E]">
                    Overall Spiritual Progress
                  </h3>
                  <span className="text-[10px] text-[#697970] block">
                    Integrated Activity Ratios
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {overallActivity.map((item) => {
                  const IconComp = item.icon
                  return (
                    <div
                      key={item.name}
                      className="rounded-xl bg-[#FBF9F4] border border-[#ECE7DC] p-2 flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-1 text-[10.5px] text-[#55665D] mb-1">
                        <IconComp className="w-3 h-3" />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <span className="text-[14px] font-bold text-[#14261E]">
                        {item.value}
                      </span>
                      <div className="h-1.5 bg-[#EAE7DC] rounded-full overflow-hidden mt-1.5">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: item.value,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  )
}
