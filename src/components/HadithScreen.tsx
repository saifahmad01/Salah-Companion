import React, { useState } from 'react'
import {
  ChevronLeft,
  Bookmark,
  Share2,
  BookOpen,
  Heart,
  ChevronRight,
  Calendar,
  Lightbulb,
  Sparkles,
} from 'lucide-react'
import { HADITH_COLLECTION, type DailyHadith } from '../data/hadiths'
import { DailyHadithSection } from './DailyHadithSection'
import { HadithLearningModule } from './HadithLearningModule'

interface HadithScreenProps {
  onBack: () => void
  onOpenFullHadith: (hadithData?: DailyHadith) => void
  gregorianDateStr: string
  hijriDateStr: string
  onOpenEnglishCalendar?: () => void
  onOpenArabicCalendar?: () => void
}

export const HadithScreen: React.FC<HadithScreenProps> = ({
  onBack,
  onOpenFullHadith,
  gregorianDateStr,
  hijriDateStr,
  onOpenEnglishCalendar,
  onOpenArabicCalendar,
}) => {
  const [todayIndex, setTodayIndex] = useState(0)
  const [activeMode, setActiveMode] = useState<'learning_module' | 'bilingual_api' | 'curated'>('learning_module')
  const [isSaved, setIsSaved] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  const currentHadith = HADITH_COLLECTION[todayIndex] || HADITH_COLLECTION[0]
  const total = HADITH_COLLECTION.length

  const handleNextHadith = () => {
    setTodayIndex((prev) => (prev + 1) % total)
  }

  const handlePrevHadith = () => {
    setTodayIndex((prev) => (prev - 1 + total) % total)
  }

  // The rest of the collection to display in "More Hadith"
  const moreHadiths = HADITH_COLLECTION.filter((_, idx) => idx !== todayIndex)

  return (
    <div className="w-full pb-20 md:pb-8 animate-fade-in select-none">
      {/* Header Bar */}
      <div className="relative px-5 sm:px-6 lg:px-8 pt-3 pb-3 overflow-hidden">
        {/* Background Artwork on top right */}
        <div className="absolute right-0 top-0 w-3/5 sm:w-2/5 lg:w-1/3 h-44 pointer-events-none opacity-90 overflow-hidden">
          <img
            src="/images/hadith-page-header.png"
            alt="Holy Quran and Lantern"
            className="w-full h-full object-cover object-left"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAF8F3] via-[#FAF8F3]/60 to-transparent w-2/5"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#FAF8F3] via-transparent to-transparent"></div>
        </div>

        {/* Top Navigation Row */}
        <div className="relative z-10 flex items-center justify-between pt-1 pb-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to home"
            className="w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-[#E4E0D6] shadow-xs flex items-center justify-center text-[#1C2C24] active:scale-95 transition cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBookmarked(!isBookmarked)}
              aria-label="Bookmark"
              className="w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-[#E4E0D6] shadow-xs flex items-center justify-center text-[#1C2C24] active:scale-95 transition cursor-pointer"
            >
              <Bookmark
                className={`w-4 h-4 ${
                  isBookmarked ? 'fill-[#0E543F] text-[#0E543F]' : 'stroke-[1.8]'
                }`}
              />
            </button>
            <button
              type="button"
              onClick={() => {
                const text = `${currentHadith.arabic}\n\nUrdu: ${currentHadith.urdu}\n\nRoman: ${currentHadith.romanHindi}\n\nEnglish: ${currentHadith.english}\n\n— ${currentHadith.reference}`
                if (navigator.share) {
                  navigator.share({
                    title: 'Hadith of the Day',
                    text,
                  })
                } else {
                  navigator.clipboard.writeText(text)
                  alert('Hadith copied to clipboard!')
                }
              }}
              aria-label="Share"
              className="w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-[#E4E0D6] shadow-xs flex items-center justify-center text-[#1C2C24] active:scale-95 transition cursor-pointer"
            >
              <Share2 className="w-4 h-4 stroke-[1.8]" />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="relative z-10 mt-1">
          <h1 className="text-[25px] font-bold text-[#14261E] tracking-tight leading-tight">
            Hadith of the Day
          </h1>
          <p className="text-[13px] text-[#5A6A61] font-normal mt-0.5">
            A reminder for a better tomorrow.
          </p>

          {/* Date pill with interactive triggers */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 border border-[#E7E2D6] mt-2.5 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-[#5C6D64]" />
            <div className="text-[11px] font-medium text-[#2E3E35] flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenEnglishCalendar}
                className="hover:text-[#0C4535] hover:underline cursor-pointer"
                title="Click to open English/Gregorian Islamic Calendar"
              >
                {gregorianDateStr}
              </button>
              <span className="text-stone-300">•</span>
              <button
                type="button"
                onClick={onOpenArabicCalendar}
                className="text-[#596961] hover:text-[#0C4535] hover:underline cursor-pointer"
                title="Click to open Arabic/Hijri Islamic Calendar"
              >
                {hijriDateStr}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Switcher Toggle */}
      <div className="px-5 sm:px-6 lg:px-8 mt-2 mb-3">
        <div className="flex p-1 bg-[#EEE8DC] rounded-xl shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveMode('learning_module')}
            className={`flex-1 py-1.5 text-[11.5px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === 'learning_module'
                ? 'bg-[#0C4535] text-white shadow-2xs'
                : 'text-[#47574E] hover:text-[#14261E]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Learning Module</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('bilingual_api')}
            className={`flex-1 py-1.5 text-[11.5px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === 'bilingual_api'
                ? 'bg-[#0C4535] text-white shadow-2xs'
                : 'text-[#47574E] hover:text-[#14261E]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Quick Hadith</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('curated')}
            className={`flex-1 py-1.5 text-[11.5px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === 'curated'
                ? 'bg-[#0C4535] text-white shadow-2xs'
                : 'text-[#47574E] hover:text-[#14261E]'
            }`}
          >
            <span>Reflections</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: Official HadithAPI.com Learning Module */}
      {activeMode === 'learning_module' && (
        <div className="px-5 sm:px-6 lg:px-8 mt-1 animate-fade-in">
          <HadithLearningModule onBack={onBack} />
        </div>
      )}

      {/* VIEW 2: TanStack Query Bilingual Hadith API */}
      {activeMode === 'bilingual_api' && (
        <div className="px-5 sm:px-6 lg:px-8 mt-1 animate-fade-in">
          <DailyHadithSection />
        </div>
      )}

      {/* VIEW 3: Curated Prayer Wisdom Cards */}
      {activeMode === 'curated' && (
        <div className="px-5 sm:px-6 lg:px-8 mt-1 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column (7 cols): Today's Hadith + Reflection & Wisdom */}
            <div className="lg:col-span-7 space-y-4">
              {/* Card 1: Today's Hadith */}
              <div className="w-full rounded-[24px] bg-white border border-[#EDE8DC] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] text-center">
                {/* Header Row with Stepper */}
                <div className="flex items-center justify-between mb-3 text-left">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#0E543F]" />
                    <h2 className="text-[14px] font-bold text-[#14261E]">
                      Today's Hadith
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Previous / Next Stepper */}
                    <div className="flex items-center gap-0.5 bg-[#F5F2EA] border border-[#E4E0D6] rounded-full p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={handlePrevHadith}
                        className="w-5 h-5 rounded-full hover:bg-stone-200 flex items-center justify-center text-stone-700 transition active:scale-90 cursor-pointer"
                        title="Previous Hadith (پچھلی حدیث)"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-mono font-bold text-stone-600 px-1 select-none">
                        {todayIndex + 1}/{total}
                      </span>
                      <button
                        type="button"
                        onClick={handleNextHadith}
                        className="w-5 h-5 rounded-full hover:bg-stone-200 flex items-center justify-center text-stone-700 transition active:scale-90 cursor-pointer"
                        title="Next Hadith (اگلی حدیث)"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full bg-[#EAF5EF] text-[#0C4E3A] text-[10.5px] font-semibold border border-[#CEE5D8]">
                      {currentHadith.tag}
                    </span>
                  </div>
                </div>

                {/* Arabic Calligraphy with animation key */}
                <div key={currentHadith.id} className="animate-fade-in">
                  <p
                    dir="rtl"
                    className="font-amiri text-[26px] sm:text-[28px] font-bold text-[#14261E] leading-[1.6] my-2"
                  >
                    {currentHadith.arabic}
                  </p>

                  {/* Golden ornament */}
                  <div className="flex items-center justify-center gap-2 my-1 text-amber-600">
                    <span className="h-[1px] w-12 bg-amber-200"></span>
                    <span className="text-xs">❖</span>
                    <span className="h-[1px] w-12 bg-amber-200"></span>
                  </div>

                  {/* Urdu Translation */}
                  <p dir="rtl" className="text-[13.5px] font-medium text-[#0C4E3A] leading-relaxed px-1 my-1">
                    {currentHadith.urdu}
                  </p>

                  {/* Roman Hindi Translation */}
                  <p className="text-[12px] font-medium text-[#8E5B36] italic leading-snug px-1 mb-1.5">
                    “{currentHadith.romanHindi}”
                  </p>

                  {/* English Translation */}
                  <p className="text-[12.5px] font-medium text-[#1A2A22] leading-relaxed px-1">
                    “{currentHadith.english}”
                  </p>
                  <p className="text-[11px] text-[#697970] mt-1 mb-3.5">
                    — {currentHadith.reference}
                  </p>
                </div>

                {/* Action Buttons with Next Hadith */}
                <div className="grid grid-cols-12 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsSaved(!isSaved)}
                    className="col-span-2 py-2 rounded-xl border border-[#E2DDD2] bg-[#FAF8F3] hover:bg-white text-[11px] font-semibold text-[#25362E] flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        isSaved ? 'fill-red-500 text-red-500' : 'stroke-[2]'
                      }`}
                    />
                    <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const text = `${currentHadith.arabic}\n\nUrdu: ${currentHadith.urdu}\n\nRoman: ${currentHadith.romanHindi}\n\nEnglish: ${currentHadith.english}\n\n— ${currentHadith.reference}`
                      if (navigator.share) {
                        navigator.share({ title: currentHadith.title, text })
                      } else {
                        navigator.clipboard.writeText(text)
                        alert('Hadith copied to share!')
                      }
                    }}
                    className="col-span-2 py-2 rounded-xl border border-[#E2DDD2] bg-[#FAF8F3] hover:bg-white text-[11px] font-semibold text-[#25362E] flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 stroke-[2]" />
                    <span className="hidden sm:inline">Share</span>
                  </button>

                  {/* Next Hadith Button */}
                  <button
                    type="button"
                    onClick={handleNextHadith}
                    className="col-span-4 py-2 rounded-xl bg-[#EBF5EF] hover:bg-emerald-100 text-[#0C4E3A] border border-[#CEE5D8] text-[11.5px] font-semibold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs"
                    title="Click to view next Hadith"
                  >
                    <span>Next Hadith</span>
                    <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>

                  {/* Read Full Hadith Button */}
                  <button
                    type="button"
                    onClick={() => onOpenFullHadith(currentHadith)}
                    className="col-span-4 py-2 rounded-xl bg-[#0C4535] hover:bg-[#073327] text-white text-[11.5px] font-semibold flex items-center justify-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Read Full</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Reflection & Wisdom */}
              <div className="w-full rounded-[22px] bg-[#EBF5EE] border border-[#CFE5D8] p-4 flex items-start justify-between gap-3 shadow-xs">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[#0C4E3A]">
                    <Lightbulb className="w-4 h-4 stroke-[2]" />
                    <h3 className="text-[13.5px] font-bold text-[#14261E]">
                      Reflection & Wisdom (حکمت و بصیرت)
                    </h3>
                  </div>
                  <p className="text-[12px] text-[#4D6055] leading-relaxed">
                    {currentHadith.explanationEnglish}
                  </p>
                  <p dir="rtl" className="text-[11.5px] text-[#0C4E3A] font-medium leading-relaxed">
                    {currentHadith.explanationUrdu}
                  </p>
                  <p className="text-[11px] text-[#8E5B36] italic leading-relaxed">
                    {currentHadith.explanationRomanHindi}
                  </p>
                </div>
                <div className="w-12 h-16 flex-shrink-0 flex items-center justify-center text-3xl">
                  🪴
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): More Hadith Collection */}
            <div className="lg:col-span-5 mt-4 lg:mt-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-bold text-[#14261E]">More Hadith ({moreHadiths.length})</h3>
                <button
                  type="button"
                  onClick={handleNextHadith}
                  className="text-[12px] font-bold text-[#0C4E3A] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Cycle Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {moreHadiths.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => onOpenFullHadith(h)}
                    className="w-full rounded-[20px] bg-white border border-[#ECE7DC] p-3 flex items-center justify-between gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-emerald-300 transition cursor-pointer active:scale-[0.99]"
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-stone-100 border border-stone-200/60">
                      <img
                        src={h.image || '/images/hadith-more-1.png'}
                        alt={h.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Hadith brief */}
                    <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs">📖</span>
                          <h4 className="text-[13px] font-bold text-[#15251E] truncate">
                            {h.title}
                          </h4>
                        </div>
                        <span className="text-[9.5px] font-semibold text-[#0E543F] bg-[#EBF5EF] px-1.5 py-0.2 rounded-md flex-shrink-0">
                          {h.tag}
                        </span>
                      </div>
                      <p
                        dir="rtl"
                        className="font-amiri text-[14px] text-[#1D2E26] font-semibold truncate leading-snug"
                      >
                        {h.arabic}
                      </p>
                      <p dir="rtl" className="text-[11px] text-[#0C4E3A] font-medium truncate">
                        {h.urdu}
                      </p>
                      <p className="text-[10.5px] text-[#8E5B36] italic truncate">
                        {h.romanHindi}
                      </p>
                      <p className="text-[10px] text-[#63736A] truncate">
                        {h.english}
                      </p>
                      <span className="text-[9.5px] text-[#788A80] block">
                        {h.reference}
                      </span>
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="w-4 h-4 text-stone-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
