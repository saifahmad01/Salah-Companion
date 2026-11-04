import React, { useRef } from 'react'
import { X, CheckCircle2, AlertCircle, Loader2, BookOpen, Calendar, Clock, RotateCcw } from 'lucide-react'
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
  prayerDate?: string
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
  prayerDate,
  isSubmitting = false,
  isCorrection = false,
  error = null,
}) => {
  // --------------------------------------------------------------------------
  // RULES OF HOOKS COMPLIANCE:
  // All hooks must execute unconditionally in the exact same order on every render.
  // Never place return statements before any hook declaration!
  // --------------------------------------------------------------------------
  const [mountedAt, setMountedAt] = React.useState(() => Date.now())
  const isExecutingRef = useRef(false)

  React.useEffect(() => {
    if (isOpen) {
      setMountedAt(Date.now())
      isExecutingRef.current = false
    }
  }, [isOpen])

  // Format date display (Hook #4)
  const formattedDateStr = React.useMemo(() => {
    if (!prayerDate) return null
    try {
      const [y, m, d] = prayerDate.split('-').map(Number)
      const dateObj = new Date(y, m - 1, d)
      const isToday = new Date().toDateString() === dateObj.toDateString()
      const formatted = dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
      return isToday ? `Today (${formatted})` : formatted
    } catch {
      return prayerDate
    }
  }, [prayerDate])

  // Dynamic status badges and contextual messages (Hook #5)
  const statusConfig = React.useMemo(() => {
    switch (targetStatus) {
      case 'ON_TIME':
        return {
          label: 'ON TIME',
          urdu: 'وقت پر',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          dotColor: 'bg-emerald-600',
          explanation: isCorrection
            ? "Updating this record as performed on-time within its preferred window."
            : "Confirms fulfillment within the preferred prayer window with focus and dedication.",
        }
      case 'LATE':
        return {
          label: 'LATE',
          urdu: 'تاخیر سے',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
          dotColor: 'bg-amber-600',
          explanation: isCorrection
            ? "Updating this record as performed towards the end of its window."
            : "Confirms fulfillment towards the end of the window before the next prayer started.",
        }
      case 'QADA':
        return {
          label: 'QADA',
          urdu: 'قضا ادا کی',
          badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
          dotColor: 'bg-purple-600',
          explanation: "Fulfilling an elapsed prayer obligation with sincere repentance and intention.",
        }
      case 'MISSED':
        return {
          label: 'MISSED',
          urdu: 'قضا ہو گئی',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
          dotColor: 'bg-rose-600',
          explanation: "Marking this prayer as missed to keep your habit tracker honest. You can make it up as Qada.",
        }
      default:
        return {
          label: targetStatus,
          urdu: '',
          badgeClass: 'bg-stone-100 text-stone-800 border-stone-300',
          dotColor: 'bg-stone-600',
          explanation: 'Recording Salah fulfillment for this prayer.',
        }
    }
  }, [targetStatus, isCorrection])

  // All React Hooks have executed unconditionally.
  // Safe early exit if the modal is closed or prayer is null.
  if (!isOpen || !prayer) return null

  const rawKey = prayer.id ? String(prayer.id).toLowerCase().trim() : 'fajr'
  const prayerKey = (rawKey === 'juma' || rawKey === 'jumuah' || rawKey === "jumu'ah" || rawKey === 'jummah') ? 'dhuhr' : rawKey
  const hadith = VERIFIED_PRAYER_HADITHS[prayerKey] || VERIFIED_PRAYER_HADITHS.fajr
  const prayerDisplayName = prayer.name || prayerKey.charAt(0).toUpperCase() + prayerKey.slice(1)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isSubmitting && !isExecutingRef.current) {
      onClose()
    }
  }

  const handleSafeConfirm = async () => {
    if (isSubmitting || isExecutingRef.current) return
    isExecutingRef.current = true
    try {
      await onConfirm()
    } finally {
      isExecutingRef.current = false
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in select-none touch-manipulation"
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting && !isExecutingRef.current) {
          if (Date.now() - mountedAt < 250) return
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-prayer-title"
    >
      <div
        className="relative w-full max-w-[440px] max-h-[92vh] overflow-y-auto bg-[#FAF8F3] rounded-[24px] sm:rounded-[28px] shadow-2xl border border-stone-200/90 p-5 pb-6 sm:p-6 sm:pb-6 animate-scale-up pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E9E4D8]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-[#0C4535] flex-shrink-0">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h3 id="confirm-prayer-title" className="text-[17px] font-bold text-[#14261E] leading-tight truncate">
                {isCorrection ? `Update ${prayerDisplayName} Salah` : `Confirm ${prayerDisplayName} Salah`}
              </h3>
              <p className="text-[11px] text-[#55675D] truncate">
                {isCorrection
                  ? "Updating your prayer completion record"
                  : 'A verified reminder on fulfilling your prayer'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isExecutingRef.current}
            aria-label="Cancel confirmation"
            className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition cursor-pointer disabled:opacity-50 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Feedback Banner if rejected */}
        {error && (
          <div className="mt-3.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-bold">Completion Ineligible</p>
              <p className="text-[11px] text-rose-800 leading-tight mt-0.5 break-words">{error}</p>
            </div>
          </div>
        )}

        {/* Authentic Islamic Hadith Card */}
        <div className="mt-3.5 p-4 rounded-2xl bg-gradient-to-b from-[#F7F4EB] to-[#EFECE1] border border-[#E0D9C7] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0E543F] uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Authentic Hadith Reminder</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {hadith.grade}
            </span>
          </div>

          {/* Arabic Text with traditional typography */}
          <div className="my-2.5 p-3 rounded-xl bg-[#FAF8F3]/90 border border-[#E6E0D2] text-right">
            <p className="font-arabic text-[19px] sm:text-[21px] text-[#12281E] leading-[2] sm:leading-[2.1] dir-rtl font-medium select-text">
              {hadith.arabic}
            </p>
          </div>

          {/* English Translation */}
          <p className="text-xs sm:text-[13px] text-[#243E31] italic leading-relaxed font-serif mt-2 select-text">
            {hadith.english}
          </p>

          {/* Citation & Context Footer */}
          <div className="mt-3 pt-2.5 border-t border-[#DFD8C4] flex items-center justify-between text-[11px] text-[#715B2D]">
            <span className="font-semibold truncate max-w-[240px]">
              Source: {hadith.source}
            </span>
            {prayer.time && (
              <span className="font-mono text-[#52655A] text-[10.5px] flex items-center gap-1 flex-shrink-0">
                <Clock className="w-3 h-3" />
                Scheduled: {prayer.time}
              </span>
            )}
          </div>
        </div>

        {/* Status Confirmation Prompt */}
        <div className="mt-3.5 p-3.5 rounded-2xl bg-white border border-stone-200 shadow-2xs text-center space-y-2">
          <p className="text-sm font-bold text-[#14261E]">
            {isCorrection
              ? `Confirm correction for ${prayerDisplayName}?`
              : `Have you completed your ${prayerDisplayName} Salah?`}
          </p>

          {/* Target Status Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold shadow-2xs tracking-wide">
            <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor} animate-pulse`} />
            <span className={statusConfig.badgeClass.split(' ')[1] || 'text-stone-800'}>
              STATUS: {statusConfig.label}
            </span>
            {statusConfig.urdu && (
              <span className="font-arabic text-[13px] text-stone-600 font-normal mr-0.5">
                ({statusConfig.urdu})
              </span>
            )}
          </div>

          <p className="text-[11.5px] text-[#4E6256] leading-relaxed max-w-xs mx-auto">
            {statusConfig.explanation}
          </p>

          {formattedDateStr && (
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 font-mono pt-1">
              <Calendar className="w-3 h-3" />
              <span>Record date: {formattedDateStr}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isExecutingRef.current}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-stone-200/80 hover:bg-stone-300 text-stone-800 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSafeConfirm}
            disabled={isSubmitting || isExecutingRef.current}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#0C4535] hover:bg-[#093529] text-white shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Recording...</span>
              </>
            ) : isCorrection ? (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Update Salah</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Salah</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
