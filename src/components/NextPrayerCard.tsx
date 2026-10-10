import React from 'react'
import { ChevronRight } from 'lucide-react'

interface NextPrayerCardProps {
  prayerName: string
  prayerTimeStr: string
  startsInText: string
  remainingSeconds: number
  progressPercent: number
  onDetailsClick?: () => void
}

export const NextPrayerCard: React.FC<NextPrayerCardProps> = ({
  prayerName,
  prayerTimeStr,
  startsInText,
  remainingSeconds,
  progressPercent,
  onDetailsClick,
}) => {
  const hours = Math.floor(remainingSeconds / 3600)
  const minutes = Math.floor((remainingSeconds % 3600) / 60)
  const seconds = remainingSeconds % 60

  const format2 = (n: number) => n.toString().padStart(2, '0')
  const timeString = `${format2(hours)}:${format2(minutes)}:${format2(seconds)}`

  // SVG circular progress calculation
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const clampedProgress = Math.min(Math.max(progressPercent, 0.05), 0.95)
  const strokeDashoffset = circumference * (1 - clampedProgress)

  return (
    <div className="px-5 sm:px-6 lg:px-0 my-1 lg:my-0">
      <div className="relative w-full rounded-[24px] bg-gradient-to-r from-[#073326] via-[#0D4435] to-[#082E22] text-white p-4.5 sm:p-5 lg:p-6 pt-4 sm:pt-5 pb-4.5 sm:pb-5 overflow-hidden shadow-[0_10px_25px_-5px_rgba(7,51,38,0.35)] border border-emerald-600/20">
        {/* Subtle glowing ambient lighting */}
        <div className="absolute top-0 right-0 w-44 sm:w-56 h-44 sm:h-56 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Silhouette of Mosque dome and minarets on right side */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 sm:w-2/5 pointer-events-none overflow-hidden opacity-35 mix-blend-screen">
          <img
            src="/images/prayer_card_bg.jpg"
            alt="Mosque Silhouette"
            className="w-full h-full object-cover object-right"
          />
        </div>

        {/* Top bar: NEXT PRAYER & Chevron */}
        <div className="relative z-10 flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.14em] text-[#86BAA3] uppercase">
            NEXT PRAYER
          </span>
          <button
            type="button"
            onClick={onDetailsClick}
            aria-label="View prayer details"
            className="w-5.5 h-5.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition flex items-center justify-center text-white/90 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Main 3-column row */}
        <div className="relative z-10 grid grid-cols-12 items-center gap-1 sm:gap-2">
          {/* Column 1: Prayer Name & Time */}
          <div className="col-span-5 flex flex-col justify-center">
            <h3 className="text-[25px] sm:text-[28px] lg:text-[30px] font-bold tracking-tight text-white leading-tight">
              {prayerName}
            </h3>
            <div className="text-[24px] sm:text-[28px] lg:text-[30px] font-extrabold text-[#F4C962] tracking-tight leading-tight mt-0.5">
              {prayerTimeStr}
            </div>
            <p className="text-[11.5px] sm:text-xs text-[#A6CFC1] font-normal mt-1 tracking-tight">
              {startsInText}
            </p>
          </div>

          {/* Column 2: Circular Progress Countdown */}
          <div className="col-span-3 flex justify-center items-center">
            <div className="relative w-[78px] h-[78px] sm:w-[86px] sm:h-[86px] flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 80 80">
                {/* Background Track */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="#124E3E"
                  strokeWidth="5.5"
                  fill="rgba(8, 38, 29, 0.4)"
                />
                {/* Progress Arc */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="#F5DC96"
                  strokeWidth="5.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              {/* Timer Text Inside Ring */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-mono text-[12px] sm:text-[13px] font-bold text-white tracking-tight leading-none">
                  {timeString}
                </span>
                <span className="text-[8.5px] sm:text-[9px] text-[#A2CCBD] font-normal mt-1 leading-none">
                  remaining
                </span>
              </div>
            </div>
          </div>

          {/* Column 3: Quranic Verse Quote */}
          <div className="col-span-4 flex flex-col justify-center pl-1 text-right sm:text-left">
            <p className="font-serif italic text-[11px] sm:text-[12px] leading-[1.35] text-[#DEEFE8] font-normal drop-shadow-sm">
              “And establish prayer for My remembrance.”
            </p>
            <span className="text-[9.5px] sm:text-[10px] text-[#86AB9B] font-medium mt-1 tracking-wide">
              — Qur'an 20:14
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
