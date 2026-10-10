import React, { useMemo } from 'react'
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
} from 'lucide-react'
import {
  loadPrayerRecords,
  computeWeeklyStats,
  type WeeklyStats,
} from '../utils/prayerRecords'

interface ProgressScreenProps {
  onBack?: () => void
  onOpenCalendar?: () => void
  weeklyStats?: WeeklyStats
  quranDaysCount?: number
  deedsCompletedCount?: number
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  onBack,
  onOpenCalendar,
  weeklyStats,
  quranDaysCount = 0,
  deedsCompletedCount = 0,
}) => {
  // Use passed stats or compute live from localStorage
  const stats = useMemo(() => {
    if (weeklyStats) return weeklyStats
    const records = loadPrayerRecords()
    return computeWeeklyStats(records)
  }, [weeklyStats])

  const quranPercent = Math.min(100, Math.round((quranDaysCount / 7) * 100))
  const deedsPercent = Math.min(100, Math.round((deedsCompletedCount / 21) * 100))

  // Overall activity categories (default 0%)
  const overallActivity = [
    { name: 'Salah', value: `${stats.completionPercent || 0}%`, color: '#0E543F', icon: Moon },
    { name: 'Quran', value: `${quranPercent}%`, color: '#2563EB', icon: BookOpen },
    { name: 'Daily Deeds', value: `${deedsPercent}%`, color: '#D97706', icon: CheckSquare },
    { name: 'Learning', value: '0%', color: '#7C3AED', icon: GraduationCap },
  ]

  // Circular ring based on dynamic completionPercent
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - (stats.completionPercent || 0) / 100)

  return (
    <div className="w-full pb-20 md:pb-8 animate-fade-in select-none">
      {/* Header Bar */}
      <div className="relative px-5 sm:px-6 lg:px-8 pt-3 pb-3 overflow-hidden">
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

          <button
            type="button"
            onClick={onOpenCalendar}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-[#E5E0D4] shadow-xs text-xs font-semibold text-[#1C2C24] hover:bg-white active:scale-95 transition cursor-pointer"
            title="Open Islamic Calendar"
          >
            <Calendar className="w-3.5 h-3.5 text-[#5C6D64]" />
            <span>This Week</span>
            <ChevronDown className="w-3 h-3 text-[#5C6D64]" />
          </button>
        </div>

        {/* Title */}
        <div className="relative z-10 mt-1">
          <h1 className="text-[26px] font-bold text-[#14261E] tracking-tight leading-tight">
            My Progress
          </h1>
          <p className="text-[13px] text-[#5A6A61] font-normal mt-0.5">
            A journey towards a better you.
          </p>
        </div>
      </div>

      {/* Main Analytics Content Container */}
      <div className="w-full px-5 sm:px-6 lg:px-8 space-y-4 mt-1">
        {/* ROW 1: Salah This Week + Stat Cards & Keep Going */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Card 1: Salah This Week */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="w-full h-full rounded-[24px] bg-white border border-[#EDE8DC] p-4.5 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-bold text-[#14261E]">Salah This Week</h3>
                  <span className="text-[11px] font-semibold text-[#0E543F] bg-[#EBF5EF] px-2.5 py-0.5 rounded-full">
                    Live Tracker
                  </span>
                </div>
                <p className="text-[11.5px] text-[#697A71] mt-0.5 mb-3">
                  You offered {stats.offeredCount} out of {stats.totalPrayers} prayers this week.
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
                      {stats.completionPercent}%
                    </span>
                    <span className="text-[10px] text-[#697A71] font-medium leading-tight">
                      Completion
                    </span>
                  </div>
                </div>

                {/* Right: Breakdown per prayer */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  {stats.prayerBreakdown.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <span className="w-4 text-center text-xs">{item.icon}</span>
                      <span className="w-12 font-medium text-[#203128] truncate">
                        {item.name}
                      </span>
                      <div className="flex-1 h-2 bg-[#E9E6DE] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0E543F] rounded-full transition-all duration-400"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-[#182721] w-7 text-right">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
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
                    {stats.streakDays || 0} Days
                  </span>
                  <span className="text-[9.5px] text-[#718279] block mt-1 leading-tight">
                    {stats.streakDays ? 'Keep it going! MashaAllah.' : 'Start your streak today.'}
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
                    {stats.bestStreakDays || stats.streakDays || 0} Days
                  </span>
                  <span className="text-[9.5px] text-[#718279] block mt-1 leading-tight">
                    {stats.bestStreakDays || stats.streakDays ? 'Your best achievement.' : 'No streak recorded yet.'}
                  </span>
                </div>
              </div>

              {/* Card 3: Total Prayers */}
              <div className="rounded-[20px] bg-white border border-[#ECE7DC] p-3 shadow-xs flex flex-col justify-between">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 mb-1.5">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-medium text-[#65766D] block leading-tight">
                    Total Prayers
                  </span>
                  <span className="text-[16px] font-bold text-[#14261E] block leading-tight mt-0.5">
                    {stats.totalPrayers30Days || stats.offeredCount || 0}
                  </span>
                  <span className="text-[9.5px] text-[#718279] block mt-1 leading-tight">
                    In the last 30 days.
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

        {/* ROW 2: Prayer Status Breakdown & Weekly Prayer Overview Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left: Card 2: Prayer Status Breakdown */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="w-full h-full rounded-[24px] bg-white border border-[#EDE8DC] p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">📊</span>
                  <h3 className="text-[14px] font-bold text-[#14261E]">
                    Prayer Status Breakdown (کیفیت کا جائزہ)
                  </h3>
                </div>
                <span className="text-[10.5px] text-[#55675E] font-medium bg-stone-100 px-2 py-0.5 rounded-full">
                  Real-time
                </span>
              </div>

              {/* 4 Status Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* ON TIME */}
                <div className="p-3 rounded-2xl bg-[#EBF5EF] border border-[#CEE5D8] flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-[#0E543F]">ON TIME</span>
                    <span className="w-5 h-5 rounded-full bg-[#0E543F] text-white flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  </div>
                  <span className="text-xl font-bold text-[#14261E]">{stats.onTimeCount}</span>
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
                  <span className="text-xl font-bold text-[#14261E]">{stats.lateCount}</span>
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
                  <span className="text-xl font-bold text-[#14261E]">{stats.qadaCount}</span>
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
                  <span className="text-xl font-bold text-[#14261E]">{stats.missedCount}</span>
                  <span className="text-[10px] text-[#BE123C] font-semibold mt-0.5">
                    قضا ہو گئی
                  </span>
                </div>
              </div>

              {/* Prophetic Hadith reminder on On-Time Prayer */}
              <div className="p-3 rounded-xl bg-[#FAF8F3] border border-[#ECE7DC] text-[11px] text-[#3D4F44] space-y-1">
                <p className="font-semibold text-[#0E543F] flex items-center gap-1">
                  <span>✨</span>
                  <span>فضیلتِ وقت: الصَّلَاةُ عَلَى وَقْتِهَا (Hadith on On-Time Prayer)</span>
                </p>
                <p dir="rtl" className="text-xs text-[#14261E] font-medium leading-relaxed">
                  رسول اللہ ﷺ سے پوچھا گیا: کون سا عمل اللہ کو سب سے زیادہ محبوب ہے؟ آپ ﷺ نے فرمایا: ”نماز کو اس کے اول وقت پر ادا کرنا۔“ (صحیح البخاری #527)
                </p>
                <p className="text-[10.5px] text-[#8E5B36] italic leading-tight">
                  Rasoolullah ﷺ se poocha gaya: Kaun sa amal Allah ko sabse zyada mehboob hai? Farmaya: "Namaz ko uske waqt par ada karna."
                </p>
              </div>
            </div>
          </div>

          {/* Right: Card 3: Weekly Prayer Overview Matrix */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="w-full h-full rounded-[22px] bg-white border border-[#ECE7DC] p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-bold text-[#14261E]">
                  Weekly Prayer Overview
                </h3>
                <div className="flex items-center gap-1 text-xs text-[#596961]">
                  <span className="font-semibold text-[#14261E]">This Week</span>
                  <button type="button" className="p-0.5 hover:text-black">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-0.5 hover:text-black">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Matrix table */}
              <div className="flex gap-2">
                {/* Y-axis Labels */}
                <div className="flex flex-col justify-between text-[10px] text-[#63746B] py-1 pr-1 font-medium">
                  <span>Fajr</span>
                  <span>Dhuhr</span>
                  <span>Asr</span>
                  <span>Maghrib</span>
                  <span>Isha</span>
                </div>

                {/* Days columns */}
                <div className="flex-1 grid grid-cols-7 gap-1.5">
                  {stats.daysOverview.map((col) => (
                    <div
                      key={col.day}
                      className={`flex flex-col items-center py-1.5 rounded-xl transition ${
                        col.isToday ? 'bg-[#F2F6EE] border border-emerald-300' : ''
                      }`}
                    >
                      {/* 5 Stacked Pills with specific status colors */}
                      <div className="flex flex-col gap-1 w-full px-1 mb-2">
                        {col.prayers.map((item, idx) => {
                          const status = item.status
                          const pillColor =
                            status === 'ON_TIME'
                              ? 'bg-[#0E543F]'
                              : status === 'LATE'
                              ? 'bg-[#D97706]'
                              : status === 'QADA'
                              ? 'bg-[#7C3AED]'
                              : status === 'MISSED'
                              ? 'bg-[#E11D48]'
                              : 'bg-[#E3E0D6]'

                          return (
                            <div
                              key={idx}
                              className={`h-2.5 rounded-full w-full transition ${pillColor}`}
                              title={`${item.id.toUpperCase()}: ${
                                status ? status.replace('_', ' ') : 'Not yet logged'
                              }`}
                            />
                          )
                        })}
                      </div>

                      <span className="text-[10px] font-semibold text-[#182821]">
                        {col.day}
                      </span>
                      <span className="text-[8.5px] text-[#697970] mt-0.5">
                        {col.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Color-coded Legend */}
              <div className="flex items-center justify-between text-[10px] text-stone-600 pt-2.5 border-t border-stone-100 mt-2 px-1">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#0E543F]"></span>
                  <span>On Time</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#D97706]"></span>
                  <span>Late</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#7C3AED]"></span>
                  <span>Qada</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#E11D48]"></span>
                  <span>Missed</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3: Quran & Deeds + Overall Activity */}
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
                    Quran This Week
                  </span>
                  <span className="text-[15px] font-bold text-[#14261E] block mt-0.5">
                    {quranDaysCount} days
                  </span>
                  <span className="text-[9.5px] text-[#67776F] block mt-0.5 leading-tight">
                    {quranDaysCount > 0
                      ? `You read Quran on ${quranDaysCount} days this week.`
                      : 'No Quran reading logged this week yet.'}
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
                      : 'No daily deeds logged this week yet.'}
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
                    Overall Activity
                  </h3>
                  <span className="text-[10px] text-[#697970] block">
                    Last 30 Days
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
      </div>
    </div>
  )
}
