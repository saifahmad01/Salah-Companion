import React from 'react'
import { Moon, Sun, CloudSun, Check, Clock, RotateCcw, X, Loader2 } from 'lucide-react'
import { BookBrownIcon, IslamicSunsetIcon } from './CustomIcons'
import type { PrayerItem } from '../types'

interface TodaysSalahProps {
  prayers: PrayerItem[]
  onTogglePrayer: (id: string) => void
  madhab?: string
  onToggleMadhab?: () => void
  updatingPrayerId?: string | null
}

export const TodaysSalah: React.FC<TodaysSalahProps> = ({
  prayers,
  onTogglePrayer,
  madhab,
  onToggleMadhab,
  updatingPrayerId,
}) => {
  const completedCount = prayers.filter((p) => p.completed).length
  const totalCount = prayers.length
  const progressPercent = (completedCount / totalCount) * 100

  const renderIcon = (type: PrayerItem['iconType']) => {
    switch (type) {
      case 'moon':
        return <Moon className="w-4 h-4 text-[#0E5640] fill-[#0E5640]/20" />
      case 'sun':
        return <Sun className="w-4.5 h-4.5 text-[#F59E0B] fill-[#F59E0B]" />
      case 'cloud-sun':
        return (
          <div className="relative flex items-center justify-center">
            <CloudSun className="w-4.5 h-4.5 text-[#F59E0B]" />
          </div>
        )
      case 'sunset':
        return <IslamicSunsetIcon className="w-4.5 h-4.5 text-[#EA580C]" />
      case 'night-moon':
        return <Moon className="w-4 h-4 text-[#1E293B] fill-[#1E293B]" />
      default:
        return <Sun className="w-4 h-4 text-[#F59E0B]" />
    }
  }

  return (
    <section className="px-5 sm:px-6 lg:px-0 mt-4 lg:mt-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <BookBrownIcon className="w-4.5 h-4.5 text-[#8E5B36]" />
          <h2 className="text-[13px] font-bold tracking-wider text-[#1B2B23] uppercase">
            TODAY'S SALAH
          </h2>
          {madhab && onToggleMadhab && (
            <button
              type="button"
              onClick={onToggleMadhab}
              className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-[#EBF5EF] text-[#0E543F] border border-[#CFE5D8] hover:bg-emerald-100 transition active:scale-95 cursor-pointer ml-1"
              title="Click to toggle Asr between Shafi'i (2:55 PM) and Hanafi (3:48 PM)"
            >
              {madhab} Asr
            </button>
          )}
        </div>
        <div className="text-[12px] text-[#607067]">
          <span className="font-bold text-[#14261E]">{completedCount} / {totalCount}</span> Completed
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-[#E8E4D9] rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-[#0E523F] rounded-full transition-all duration-400 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 5 Prayer Cards Grid */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 lg:gap-3">
        {prayers.map((prayer) => {
          const isDone = prayer.completed
          const status = prayer.prayerStatus
          const isUpcoming = !isDone && (prayer.statusBadge === 'upcoming' || prayer.isUpcoming)
          const isUpdating = updatingPrayerId === prayer.id
          // Active-day Salah: Users can mark, undo, or correct at any time during current day, even after individual prayer time has passed
          const isDisabled = isUpcoming || Boolean(updatingPrayerId)

          const cardBgClass =
            isUpdating
              ? 'bg-[#EBF5EF] border border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
              : status === 'ON_TIME'
              ? 'bg-[#EBF5EF] border border-[#CEE5D8] shadow-[0_1px_3px_rgba(14,82,63,0.06)]'
              : status === 'LATE'
              ? 'bg-[#FFFBEB] border border-[#FDE68A] shadow-[0_1px_3px_rgba(217,119,6,0.06)]'
              : status === 'QADA'
              ? 'bg-[#FAF5FF] border border-[#E9D5FF] shadow-[0_1px_3px_rgba(124,58,237,0.06)]'
              : status === 'MISSED'
              ? 'bg-[#FFF1F2] border border-[#FECDD3] shadow-[0_1px_3px_rgba(225,29,72,0.06)]'
              : isDone
              ? 'bg-[#EBF5EF] border border-[#CEE5D8]'
              : prayer.statusBadge === 'active'
              ? 'bg-white border-2 border-emerald-500 shadow-[0_1px_4px_rgba(16,185,129,0.15)]'
              : prayer.statusBadge === 'passed'
              ? 'bg-white border border-amber-300/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-emerald-400'
              : isUpcoming
              ? 'bg-[#FAF8F3] border border-[#EAE6DC] opacity-90'
              : 'bg-white border border-[#EBE7DD] shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-emerald-300'

          const buttonTitle = isUpdating
            ? `Updating ${prayer.name} status...`
            : isUpcoming
            ? `${prayer.name} prayer time has not started yet. Available at ${prayer.time}.`
            : isDone
            ? `${prayer.name} is completed. Click to manage or undo at any time today.`
            : `Click to log status for ${prayer.name}`

          return (
            <button
              key={prayer.id}
              type="button"
              disabled={isDisabled}
              onClick={() => onTogglePrayer(prayer.id)}
              className={`flex flex-col items-center justify-between py-2.5 sm:py-3.5 px-1 sm:px-2 rounded-[16px] sm:rounded-[20px] transition-all duration-200 select-none text-center touch-manipulation pointer-events-auto ${
                isDisabled
                  ? isUpdating ? 'cursor-wait opacity-90' : 'cursor-not-allowed opacity-90'
                  : 'cursor-pointer active:scale-95'
              } ${cardBgClass}`}
              title={buttonTitle}
              aria-label={buttonTitle}
            >
              {/* Icon Container */}
              <div className="h-5.5 flex items-center justify-center mb-1">
                {renderIcon(prayer.iconType)}
              </div>

              {/* Prayer Name */}
              <div className="flex flex-col items-center">
                <span className={`text-[12.5px] sm:text-[14px] font-bold leading-tight ${
                  isUpcoming ? 'text-[#3B4D43]' : 'text-[#172720]'
                }`}>
                  {prayer.name}
                </span>
                {prayer.isFridayMidday && (
                  <span
                    className={`text-[7px] sm:text-[8px] font-semibold px-1 rounded-sm mt-0.5 leading-tight ${
                      prayer.isCustomCongregationTime
                        ? 'bg-emerald-100 text-[#0C4535]'
                        : 'bg-stone-200/70 text-stone-600'
                    }`}
                    title={
                      prayer.isCustomCongregationTime
                        ? 'Configured Mosque Congregation Time'
                        : 'Astronomical Dhuhr start reference (check local mosque for congregation time)'
                    }
                  >
                    {prayer.isCustomCongregationTime ? 'Mosque Time' : 'Ref Time'}
                  </span>
                )}
              </div>

              {/* Prayer Time */}
              <span className="text-[9.5px] sm:text-[11px] text-[#55675E] font-medium leading-tight mt-0.5 mb-2">
                {prayer.time}
              </span>

              {/* Status Badge */}
              <div className="flex items-center justify-center gap-1 w-full pt-0.5">
                {isUpdating ? (
                  <>
                    <Loader2 className="w-3 h-3 text-[#0E543F] animate-spin flex-shrink-0" />
                    <span className="text-[8px] sm:text-[9.5px] font-bold text-[#0E543F] leading-none">
                      Saving...
                    </span>
                  </>
                ) : status === 'ON_TIME' ? (
                  <>
                    <span className="w-3 h-3 rounded-full bg-[#0E5640] flex items-center justify-center text-white flex-shrink-0">
                      <Check className="w-2 h-2 stroke-[3]" />
                    </span>
                    <span className="text-[8.5px] sm:text-[10px] font-bold text-[#0E5640] leading-none">
                      On Time
                    </span>
                  </>
                ) : status === 'LATE' ? (
                  <>
                    <span className="w-3 h-3 rounded-full bg-[#D97706] flex items-center justify-center text-white flex-shrink-0">
                      <Clock className="w-2 h-2 stroke-[2.5]" />
                    </span>
                    <span className="text-[8.5px] sm:text-[10px] font-bold text-[#D97706] leading-none">
                      Late
                    </span>
                  </>
                ) : status === 'QADA' ? (
                  <>
                    <span className="w-3 h-3 rounded-full bg-[#7C3AED] flex items-center justify-center text-white flex-shrink-0">
                      <RotateCcw className="w-2 h-2 stroke-[2.5]" />
                    </span>
                    <span className="text-[8.5px] sm:text-[10px] font-bold text-[#7C3AED] leading-none">
                      Qada
                    </span>
                  </>
                ) : status === 'MISSED' ? (
                  <>
                    <span className="w-3 h-3 rounded-full bg-[#E11D48] flex items-center justify-center text-white flex-shrink-0">
                      <X className="w-2 h-2 stroke-[3]" />
                    </span>
                    <span className="text-[8.5px] font-bold text-[#E11D48] leading-none">
                      Missed
                    </span>
                  </>
                ) : isDone ? (
                  <>
                    <span className="w-3 h-3 rounded-full bg-[#0E5640] flex items-center justify-center text-white flex-shrink-0">
                      <Check className="w-2 h-2 stroke-[3]" />
                    </span>
                    <span className="text-[8.5px] font-semibold text-[#0E5640] leading-none">
                      Done
                    </span>
                  </>
                ) : isUpcoming ? (
                  <span className="text-[8px] sm:text-[9px] font-semibold text-[#63756C] leading-none bg-[#EFECE3] px-1.5 py-0.5 rounded-md border border-[#DED9CC] truncate max-w-full">
                    At {prayer.time}
                  </span>
                ) : prayer.statusBadge === 'active' ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full border border-emerald-600 bg-emerald-500 animate-pulse flex-shrink-0"></span>
                    <span className="text-[8.5px] font-bold text-[#0E543F] leading-none">
                      Active
                    </span>
                  </>
                ) : prayer.isWindowExpired || prayer.statusBadge === 'passed' ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-stone-400 flex-shrink-0"></span>
                    <span className="text-[8.5px] font-bold text-stone-500 leading-none">
                      Expired
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full border border-[#8F9F95] flex-shrink-0"></span>
                    <span className="text-[8.5px] font-medium text-[#65766E] leading-none">
                      Past Due
                    </span>
                  </>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
