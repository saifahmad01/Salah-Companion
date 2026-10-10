import React, { useState } from 'react'
import {
  Heart,
  Share2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { BookBrownIcon } from './CustomIcons'
import { HADITH_COLLECTION, type DailyHadith } from '../data/hadiths'

interface HadithCardProps {
  onReadFullHadith: (hadith?: DailyHadith) => void
}

export const HadithCard: React.FC<HadithCardProps> = ({ onReadFullHadith }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)

  const hadith = HADITH_COLLECTION[currentIndex] || HADITH_COLLECTION[0]
  const total = HADITH_COLLECTION.length

  const handleNextHadith = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setCurrentIndex((prev) => (prev + 1) % total)
  }

  const handlePrevHadith = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setCurrentIndex((prev) => (prev - 1 + total) % total)
  }

  return (
    <section className="px-5 sm:px-6 lg:px-0 mt-4 lg:mt-0">
      <div className="relative w-full rounded-[24px] bg-[#FCFBF8] border border-[#ECE7DC] p-4.5 sm:p-5 lg:p-6 pt-4 sm:pt-5 pb-4 sm:pb-5 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        {/* Right Artwork: Quran & Lantern */}
        <div className="absolute right-0 top-0 bottom-0 w-[54%] sm:w-[44%] lg:w-[38%] pointer-events-none overflow-hidden">
          <img
            src="/images/hadith-exact.png"
            alt="Holy Quran and Glowing Lantern"
            className="w-full h-full object-cover object-left-bottom"
          />
          {/* Subtle smooth gradient fade to the left for legible text overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#FCFBF8] via-[#FCFBF8]/75 to-transparent w-2/5"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#FCFBF8]/40 via-transparent to-transparent"></div>
        </div>

        {/* Card Header with Next / Prev Controls */}
        <div className="relative z-10 flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookBrownIcon className="w-4.5 h-4.5 text-[#8E5B36]" />
            <h2 className="text-[12.5px] font-bold tracking-wider text-[#1C2C24] uppercase">
              HADITH OF THE DAY
            </h2>
          </div>

          {/* Next / Prev Stepper and Actions on Right */}
          <div className="flex items-center gap-1.5">
            {/* Quick Next / Prev Arrows */}
            <div className="flex items-center gap-0.5 bg-white/90 border border-[#E4E0D6] rounded-full p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevHadith}
                aria-label="Previous Hadith"
                className="w-6 h-6 rounded-full hover:bg-stone-100 flex items-center justify-center text-[#23352B] active:scale-90 transition cursor-pointer"
                title="Previous Hadith (پچھلی حدیث)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-bold text-[#55675D] px-1 select-none">
                {currentIndex + 1}/{total}
              </span>
              <button
                type="button"
                onClick={handleNextHadith}
                aria-label="Next Hadith"
                className="w-6 h-6 rounded-full hover:bg-stone-100 flex items-center justify-center text-[#23352B] active:scale-90 transition cursor-pointer"
                title="Next Hadith (اگلی حدیث)"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Favorite button */}
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              aria-label="Save Hadith"
              className="w-7 h-7 rounded-full bg-white/90 hover:bg-white border border-[#E2DED4] shadow-xs flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  isFavorite
                    ? 'fill-[#EF4444] text-[#EF4444]'
                    : 'text-[#4A5950] stroke-[2]'
                }`}
              />
            </button>

            {/* Share button */}
            <button
              type="button"
              onClick={() => {
                const text = `${hadith.arabic}\n\nUrdu: ${hadith.urdu}\n\nRoman: ${hadith.romanHindi}\n\nEnglish: ${hadith.english}\n\n— ${hadith.reference}`
                if (navigator.share) {
                  navigator.share({ title: hadith.title, text })
                } else {
                  navigator.clipboard.writeText(text)
                  alert('Hadith copied to clipboard!')
                }
              }}
              aria-label="Share Hadith"
              className="w-7 h-7 rounded-full bg-white/90 hover:bg-white border border-[#E2DED4] shadow-xs flex items-center justify-center text-[#4A5950] transition-all active:scale-90 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Hadith Category Pill */}
        <div className="relative z-10 flex items-center gap-1.5 mb-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0E543F] bg-[#EBF5EF] px-2 py-0.5 rounded-full border border-[#CEE5D8]">
            <Sparkles className="w-2.5 h-2.5 text-amber-600" />
            <span>{hadith.tag}</span>
          </span>
          <span className="text-[10px] text-stone-400 font-medium">• Daily Reminder</span>
        </div>

        {/* Arabic Calligraphy & Translations with Fade Animation */}
        <div key={hadith.id} className="relative z-10 max-w-[70%] space-y-1 animate-fade-in">
          <p
            dir="rtl"
            className="font-amiri text-[22px] font-bold text-[#15261F] leading-[1.55] tracking-wide"
          >
            {hadith.arabic}
          </p>

          {/* Urdu Translation */}
          <p dir="rtl" className="text-[12.5px] font-medium text-[#0C4E3A] leading-snug">
            {hadith.urdu}
          </p>

          {/* Roman Hindi Translation */}
          <p className="text-[11.5px] font-medium text-[#8E5B36] italic leading-tight">
            “{hadith.romanHindi}”
          </p>

          {/* English Translation */}
          <p className="text-[12px] font-medium text-[#1A2A22] leading-snug">
            “{hadith.english}”
          </p>

          {/* Reference */}
          <p className="text-[10.5px] text-[#63746B] font-normal pb-2">
            — {hadith.reference}
          </p>

          {/* Call to action buttons row */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => onReadFullHadith(hadith)}
              className="inline-flex items-center gap-1.5 bg-[#0C4535] hover:bg-[#083427] active:scale-95 text-white px-3.5 py-2 rounded-xl font-medium text-[11.5px] shadow-[0_2px_6px_rgba(12,69,53,0.18)] transition cursor-pointer"
            >
              <span>Read Full</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>

            {/* Next Hadith Button */}
            <button
              type="button"
              onClick={handleNextHadith}
              className="inline-flex items-center gap-1 bg-[#EBF5EF] hover:bg-emerald-100 text-[#0C4E3A] border border-[#CEE5D8] px-3 py-2 rounded-xl font-semibold text-[11.5px] transition active:scale-95 cursor-pointer shadow-2xs"
              title="Next Hadith (اگلی حدیث)"
            >
              <span>Next Hadith</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
