import React from 'react'

/**
 * DashboardSkeleton
 *
 * Rendered during initial authentication check if no cached session exists,
 * preserving layout structure and eliminating layout shift.
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 animate-pulse select-none space-y-4">
      {/* Top Bar Skeleton */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-200/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-stone-300/70" />
          <div className="w-28 sm:w-36 h-4 bg-stone-300/70 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 sm:w-28 h-7 bg-stone-300/70 rounded-full" />
          <div className="w-8 h-8 rounded-full bg-stone-300/70" />
        </div>
      </div>

      {/* Hero Next Prayer Card Skeleton */}
      <div className="w-full rounded-[28px] bg-gradient-to-br from-[#0C382B] via-[#092B21] to-[#072018] p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-emerald-700/40 rounded-full" />
            <div className="h-8 sm:h-10 w-40 bg-emerald-600/40 rounded-xl" />
            <div className="h-4 w-32 bg-emerald-700/30 rounded-md" />
          </div>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-800/40 border-4 border-emerald-600/30 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-emerald-700/50" />
          </div>
        </div>
      </div>

      {/* 2-Column Responsive Layout Placeholder */}
      <div className="w-full lg:grid lg:grid-cols-12 lg:gap-6 mt-4 space-y-4 lg:space-y-0">
        {/* Left Column: 5 Daily Prayers Skeleton */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="h-4 w-28 bg-stone-300/80 rounded-md mb-2" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-full h-14 rounded-2xl bg-white/90 border border-stone-200/80 p-3.5 flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-stone-200/80" />
                <div className="space-y-1">
                  <div className="h-3.5 w-16 bg-stone-200/90 rounded" />
                  <div className="h-2.5 w-24 bg-stone-200/60 rounded" />
                </div>
              </div>
              <div className="h-7 w-20 bg-stone-200/80 rounded-full" />
            </div>
          ))}
        </div>

        {/* Right Column: Hadith & Deeds Skeleton */}
        <div className="lg:col-span-5 space-y-4">
          {/* Hadith Skeleton */}
          <div className="w-full rounded-[24px] bg-white border border-stone-200/80 p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 bg-stone-200/80 rounded-md" />
              <div className="h-4 w-16 bg-stone-200/60 rounded-full" />
            </div>
            <div className="h-12 w-full bg-stone-100 rounded-xl" />
            <div className="space-y-1.5 pt-1">
              <div className="h-3 w-full bg-stone-200/70 rounded" />
              <div className="h-3 w-4/5 bg-stone-200/70 rounded" />
            </div>
          </div>

          {/* Sunnah Deeds Skeleton */}
          <div className="w-full rounded-[24px] bg-white border border-stone-200/80 p-5 space-y-2.5 shadow-2xs">
            <div className="h-4 w-32 bg-stone-200/80 rounded-md mb-2" />
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-10 w-full rounded-xl bg-stone-100/90" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * ProgressScreenSkeleton
 *
 * Professional skeleton loader for the Progress & Analytics dashboard.
 * Mirrors the exact layout with shimmering placeholders.
 */
export const ProgressScreenSkeleton: React.FC = () => {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-3 space-y-4 animate-pulse select-none">
      {/* Top Period Selector Skeleton */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-200/60">
        <div className="h-4 w-32 bg-stone-300/80 rounded-md" />
        <div className="flex items-center gap-1.5">
          <div className="h-7 w-16 bg-stone-300/80 rounded-full" />
          <div className="h-7 w-16 bg-stone-200/80 rounded-full" />
          <div className="h-7 w-16 bg-stone-200/80 rounded-full" />
        </div>
      </div>

      {/* Row 1: Completion Ring & Highlight Card Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-7 rounded-[24px] bg-white border border-stone-200/80 p-5 flex flex-col justify-between shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-40 bg-stone-200/80 rounded-md" />
            <div className="h-4 w-20 bg-stone-200/60 rounded-full" />
          </div>
          <div className="flex items-center gap-6 py-2">
            <div className="w-24 h-24 rounded-full bg-stone-200/80 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-3/4 bg-stone-200/80 rounded" />
              <div className="h-3 w-1/2 bg-stone-200/60 rounded" />
              <div className="h-3 w-2/3 bg-stone-200/50 rounded" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-[24px] bg-white border border-stone-200/80 p-5 flex flex-col justify-between shadow-2xs space-y-3">
          <div className="h-4 w-28 bg-stone-200/80 rounded-md" />
          <div className="h-16 w-full bg-stone-100 rounded-xl" />
          <div className="h-3 w-2/3 bg-stone-200/60 rounded" />
        </div>
      </div>

      {/* Row 2: 4 Breakdown Metric Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="rounded-[20px] bg-white border border-stone-200/80 p-4 space-y-2 shadow-2xs"
          >
            <div className="w-7 h-7 rounded-xl bg-stone-200/80" />
            <div className="h-5 w-16 bg-stone-200/90 rounded" />
            <div className="h-3 w-24 bg-stone-200/60 rounded" />
          </div>
        ))}
      </div>

      {/* Row 3: 7-Day Weekly Breakdown Skeleton */}
      <div className="rounded-[24px] bg-white border border-stone-200/80 p-5 shadow-2xs space-y-4">
        <div className="h-4 w-44 bg-stone-200/80 rounded-md" />
        <div className="grid grid-cols-7 gap-2 pt-2">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, dIdx) => (
            <div key={dIdx} className="flex flex-col items-center gap-2">
              <div className="w-full h-24 bg-stone-100 rounded-xl flex items-end p-1 justify-center">
                <div
                  className="w-full bg-stone-200/80 rounded-lg"
                  style={{ height: `${(dIdx * 15 + 30) % 90}%` }}
                />
              </div>
              <span className="text-[10px] text-stone-400 font-bold">{day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * QuranScreenSkeleton
 *
 * Professional skeleton loader for the Quran reading dashboard.
 */
export const QuranScreenSkeleton: React.FC = () => {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-3 space-y-4 animate-pulse select-none">
      {/* 4 Metric Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-3.5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2"
          >
            <div className="w-7 h-7 rounded-lg bg-stone-200/80" />
            <div className="h-6 w-14 bg-stone-200/90 rounded" />
            <div className="h-2.5 w-20 bg-stone-200/60 rounded" />
          </div>
        ))}
      </div>

      {/* Continue Reading Hero Skeleton */}
      <div className="w-full rounded-[24px] bg-gradient-to-br from-[#0C382B] via-[#092B21] to-[#072018] p-5 sm:p-6 shadow-xl space-y-3">
        <div className="h-3.5 w-28 bg-emerald-700/40 rounded-full" />
        <div className="h-7 w-48 bg-emerald-600/40 rounded-lg" />
        <div className="h-3.5 w-36 bg-emerald-700/30 rounded" />
      </div>

      {/* Reader Buttons Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="h-20 rounded-2xl bg-white border border-stone-200/80" />
        <div className="h-20 rounded-2xl bg-white border border-stone-200/80" />
      </div>
    </div>
  )
}
