import React from 'react'
import { X, CheckCircle2, AlertCircle, Loader2, BookOpen } from 'lucide-react'
import type { PrayerItem, PrayerStatus } from '../types'

/**
 * Authentic, verified Hadiths regarding the five daily prayers
 * and the immense virtue of Salah from Sahih al-Bukhari and Sahih Muslim.
 */
export interface VerifiedPrayerHadith {
  arabic: string
  english: string
  source: string
  grade: 'Sahih'
  context: string
}

export const VERIFIED_PRAYER_HADITHS: Record<string, VerifiedPrayerHadith> = {
  fajr: {
    arabic: 'مَنْ صَلَّى الصُّبْحَ فَهُوَ فِي ذِمَّةِ اللَّهِ',
    english: '“Whoever offers the dawn prayer (Fajr) is under the protection and covenant of Allah.”',
    source: 'Sahih Muslim, Hadith 657',
    grade: 'Sahih',
    context: 'The Fajr prayer begins the day under divine preservation and barakah.',
  },
  dhuhr: {
    arabic: 'إِنَّ أَوَّلَ مَا يُحَاسَبُ بِهِ الْعَبْدُ يَوْمَ الْقِيَامَةِ مِنْ عَمَلِهِ صَلَاتُهُ، فَإِنْ صَلَحَتْ فَقَدْ أَفْلَحَ وَأَنْجَحَ',
    english: '“The first deed for which a servant will be called to account on the Day of Resurrection is his prayer. If it is sound, he has succeeded and prospered.”',
    source: "Jami' at-Tirmidhi, Hadith 413 • Sunan an-Nasa'i, Hadith 465",
    grade: 'Sahih',
    context: 'Midday prayer re-anchors the heart amidst the busyness of worldly life.',
  },
  asr: {
    arabic: 'مَنْ صَلَّى الْبَرْدَيْنِ دَخَلَ الْجَنَّةَ',
    english: '“Whoever offers the two cool prayers (Fajr and Asr) will enter Paradise.”',
    source: 'Sahih al-Bukhari, Hadith 574 • Sahih Muslim, Hadith 635',
    grade: 'Sahih',
    context: 'The middle prayer (Asr) holds elevated virtue in the Qur’an and Sunnah.',
  },
  maghrib: {
    arabic: 'الصَّلَوَاتُ الْخَمْسُ كَفَّارَةٌ لِمَا بَيْنَهُنَّ إِذَا اجْتُنِبَتِ الْكَبَائِرُ',
    english: '“The five daily prayers expiate whatever minor sins occur between them, so long as major sins are avoided.”',
    source: 'Sahih Muslim, Hadith 233',
    grade: 'Sahih',
    context: 'The evening prayer marks the transition of the day with gratitude and repentance.',
  },
  isha: {
    arabic: 'مَنْ صَلَّى الْعِشَاءَ فِي جَمَاعَةٍ فَكَأَنَّمَا قَامَ نِصْفَ اللَّيْلِ',
    english: '“Whoever prays Isha in congregation, it is as if he spent half of the night in prayer.”',
    source: 'Sahih Muslim, Hadith 656',
    grade: 'Sahih',
    context: 'The night prayer concludes the day in sincere remembrance of the Creator.',
  },
}

interface PrayerConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  prayer: PrayerItem | null
  targetStatus?: PrayerStatus
  isSubmitting?: boolean
  isCorrection?: boolean
  error?: string | null
}

export const PrayerConfirmationModal: React.FC<PrayerConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  prayer,
  targetStatus = 'ON_TIME',
  isSubmitting = false,
  isCorrection = false,
  error = null,
}) => {
  const [mountedAt, setMountedAt] = React.useState(() => Date.now())

  React.useEffect(() => {
    if (isOpen) {
      setMountedAt(Date.now())
    }
  }, [isOpen])

  if (!isOpen || !prayer) return null

  const prayerKey = prayer.id.toLowerCase()
  const hadith = VERIFIED_PRAYER_HADITHS[prayerKey] || VERIFIED_PRAYER_HADITHS.fajr

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isSubmitting) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in select-none touch-manipulation"
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          // Prevent ghost clicks on mobile touchscreens from dismissing dialog immediately
          if (Date.now() - mountedAt < 250) return
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-prayer-title"
    >
      <div
        className="relative w-full max-w-[440px] max-h-[90vh] overflow-y-auto bg-[#FAF8F3] rounded-[24px] sm:rounded-[28px] shadow-2xl border border-stone-200/90 p-5 pb-7 sm:p-6 sm:pb-6 animate-scale-up pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E9E4D8]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-[#0C4535]">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 id="confirm-prayer-title" className="text-[17px] font-bold text-[#14261E] leading-tight">
                {isCorrection ? `Update ${prayer.name} Salah` : `Confirm ${prayer.name} Salah`}
              </h3>
              <p className="text-[11px] text-[#55675D]">
                {isCorrection
                  ? "Correcting today's prayer completion record"
                  : 'A verified reminder about the importance of prayer'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cancel confirmation"
            className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Feedback Banner if rejected */}
        {error && (
          <div className="mt-3.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Completion Ineligible</p>
              <p className="text-[11px] text-rose-800 leading-tight mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Authentic Islamic Hadith Card */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-b from-[#F7F4EB] to-[#EFECE1] border border-[#E0D9C7] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0E543F] uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Authentic Hadith Reminder</span>
            </div>
            <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-200">
              {hadith.grade}
            </span>
          </div>

          {/* Arabic Text */}
          <div className="my-2.5 p-3 rounded-xl bg-white/70 border border-[#E5DFCE] text-right font-serif text-[16px] sm:text-[17px] leading-loose text-[#0D382B] dir-rtl">
            {hadith.arabic}
          </div>

          {/* English Translation */}
          <p className="text-xs sm:text-[12.5px] text-[#2D3F36] italic leading-relaxed font-sans">
            {hadith.english}
          </p>

          {/* Source & Citation Reference */}
          <div className="mt-3 pt-2.5 border-t border-[#DFD8C5] flex items-center justify-between text-[10.5px] text-[#697A70]">
            <span className="font-semibold text-[#8E5B36] font-mono">
              Source: {hadith.source}
            </span>
            <span className="text-[10px] text-[#55675D]">
              Scheduled: {prayer.time}
            </span>
          </div>
        </div>

        {/* Confirmation Question */}
        <div className="mt-4 p-3 rounded-xl bg-white border border-[#E8E2D5] text-center shadow-2xs">
          <p className="text-sm font-bold text-[#14261E]">
            {isCorrection
              ? `Confirm correction for ${prayer.name} Salah?`
              : `Have you completed your ${prayer.name} Salah?`}
          </p>
          <div className="mt-1 flex items-center justify-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EBF5EF] text-[#0E543F]">
              Status: {targetStatus.replace('_', ' ')}
            </span>
          </div>
          <p className="text-[11px] text-[#55675D] mt-1">
            {isCorrection
              ? "Updating your record will correct today's tracking status and progress calculations."
              : 'Recording Salah complete confirms your fulfillment for today’s active date.'}
          </p>
        </div>

        {/* Action Buttons: Cancel vs Confirm Salah */}
        <div className="mt-4 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 font-semibold text-xs transition cursor-pointer active:scale-98 disabled:opacity-50 text-center touch-manipulation"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#0C4535] to-[#0E543F] hover:from-[#083327] hover:to-[#0C4535] text-white font-bold text-xs transition shadow-sm cursor-pointer active:scale-98 flex items-center justify-center gap-1.5 disabled:opacity-60 touch-manipulation"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{isCorrection ? 'Updating...' : 'Verifying...'}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isCorrection ? 'Confirm Correction' : 'Confirm Salah'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
