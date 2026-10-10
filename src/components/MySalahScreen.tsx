import React from 'react'
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
import type { PrayerItem } from '../types'

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
}) => {
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

  // Days of the week for streak tracker (Mon - Sun)
  const weekDays = [
    { day: 'Mon', completed: true, isToday: false },
    { day: 'Tue', completed: true, isToday: false },
    { day: 'Wed', completed: true, isToday: false },
    { day: 'Thu', completed: false, isToday: true },
    { day: 'Fri', completed: false, isToday: false },
    { day: 'Sat', completed: false, isToday: false },
    { day: 'Sun', completed: false, isToday: false },
  ]

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

          {/* Card 2: This Week Streak Tracker */}
          <div className="w-full rounded-[22px] bg-white border border-[#ECE7DC] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-base">📊</span>
                <h3 className="text-[13.5px] font-bold text-[#14261E]">This Week</h3>
              </div>
              <span className="text-[12px] font-bold text-[#14261E]">
                2 / 7 <span className="font-normal text-[#697A71]">days</span>
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center">
              {weekDays.map((item) => (
                <div
                  key={item.day}
                  className={`flex flex-col items-center py-2 rounded-xl transition ${
                    item.isToday ? 'bg-[#F4F6EE] border border-[#DEE5D4]' : ''
                  }`}
                >
                  <span className="text-[10.5px] font-medium text-[#596961] mb-1.5">
                    {item.day}
                  </span>
                  <div
                    className={`w-6.5 h-6.5 rounded-full flex items-center justify-center transition ${
                      item.completed
                        ? 'bg-[#0E543F] text-white shadow-xs'
                        : 'border border-[#CBD5E1] bg-white'
                    }`}
                  >
                    {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              ))}
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
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5F4EC] border border-[#BCE1CD] text-[#0C4E3A] text-[11px] font-semibold active:scale-95 transition cursor-pointer"
                        title="Click to update prayer status"
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
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-[11px] font-semibold active:scale-95 transition cursor-pointer"
                        title="Click to update prayer status"
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
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3E8FF] border border-[#E9D5FF] text-[#6B21A8] text-[11px] font-semibold active:scale-95 transition cursor-pointer"
                        title="Click to update prayer status"
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
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE4E6] border border-[#FECDD3] text-[#BE123C] text-[11px] font-semibold active:scale-95 transition cursor-pointer"
                        title="Click to update prayer status"
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
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5F4EC] border border-[#BCE1CD] text-[#0C4E3A] text-[11px] font-semibold active:scale-95 transition cursor-pointer"
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#094838] hover:bg-[#07382B] text-white text-[11px] font-semibold active:scale-95 shadow-xs transition cursor-pointer"
                      >
                        <span className="w-3.5 h-3.5 rounded-full border border-white flex-shrink-0"></span>
                        <span>Mark as Complete</span>
                      </button>
                    ) : prayer.statusBadge === 'passed' ? (
                      <button
                        type="button"
                        onClick={() => onTogglePrayer(prayer.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[10.5px] font-medium active:scale-95 transition cursor-pointer"
                      >
                        <span>Log Prayer</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onTogglePrayer(prayer.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F5F2EB] text-[#63736A] text-[11px] font-medium active:scale-95 transition cursor-pointer"
                      >
                        <span>🕒 Upcoming</span>
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
    </div>
  )
}
