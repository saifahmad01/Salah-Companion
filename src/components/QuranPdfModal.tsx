import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  CheckCircle2,
  Bookmark,
  Sparkles,
  BookOpen,
} from 'lucide-react'
import { type QuranWord, type UserWordProgress, QURAN_VOCABULARY_600 } from '../data/quranVocabulary'
import { offlineQuranService } from '../services/offlineQuranService'
import { device } from '../platform/device'

interface QuranPdfModalProps {
  isOpen: boolean
  initialWord?: QuranWord | null
  initialPageIndex?: number
  onClose: () => void
  wordProgressMap: Record<number, UserWordProgress>
  onToggleBookmark: (wordId: number) => void
  onToggleLearned: (wordId: number) => void
}

const TOTAL_PAGES = 319 // Slide 0 to Slide 318

export const QuranPdfModal: React.FC<QuranPdfModalProps> = ({
  isOpen,
  initialWord,
  initialPageIndex = 0,
  onClose,
  wordProgressMap,
  onToggleBookmark,
  onToggleLearned,
}) => {
  // Current page index (0 to 318)
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(() => {
    if (initialWord) return initialWord.pageIndex
    return initialPageIndex
  })

  // Selected word in focus (if any)
  const [activeWord, setActiveWord] = useState<QuranWord | null>(initialWord || null)

  // Zoom level (1 = 100%, 1.25, 1.5, 2, etc.)
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [showHighlight, setShowHighlight] = useState<boolean>(true)
  const [showVerseDrawer, setShowVerseDrawer] = useState<boolean>(false)

  // Download state
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false)
  const [isDownloading, setIsDownloading] = useState<boolean>(false)
  const [downloadPercent, setDownloadPercent] = useState<number>(0)

  // Touch swipe support
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync when initial word changes
  useEffect(() => {
    if (initialWord) {
      setActiveWord(initialWord)
      setCurrentPageIndex(initialWord.pageIndex)
      setZoomLevel(1)
      setShowHighlight(true)
    } else if (initialPageIndex !== undefined) {
      setCurrentPageIndex(initialPageIndex)
      // Check if words exist on that page
      const pageWords = QURAN_VOCABULARY_600.filter((w) => w.pageIndex === initialPageIndex)
      setActiveWord(pageWords.length > 0 ? pageWords[0] : null)
      setZoomLevel(1)
    }
  }, [initialWord, initialPageIndex])

  // Check offline download status
  useEffect(() => {
    offlineQuranService.isVocabPdfDownloaded().then(setIsDownloaded)
  }, [])

  // Find all words on current page
  const wordsOnCurrentPage = useMemo(() => {
    return QURAN_VOCABULARY_600.filter((w) => w.pageIndex === currentPageIndex)
  }, [currentPageIndex])

  // When changing page directly, update active word if matching
  const handlePageChange = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= TOTAL_PAGES) return
    setCurrentPageIndex(newIndex)
    device.hapticFeedback('light')

    // Find if any word lives on this page
    const words = QURAN_VOCABULARY_600.filter((w) => w.pageIndex === newIndex)
    if (words.length > 0) {
      setActiveWord(words[0])
    } else {
      setActiveWord(null)
    }
  }, [])

  // Navigate to previous page
  const handlePrevPage = () => handlePageChange(currentPageIndex - 1)
  // Navigate to next page
  const handleNextPage = () => handlePageChange(currentPageIndex + 1)

  // Word-level navigation
  const handlePrevWord = () => {
    if (!activeWord || activeWord.id <= 1) return
    const prev = QURAN_VOCABULARY_600[activeWord.id - 2]
    if (prev) {
      setActiveWord(prev)
      setCurrentPageIndex(prev.pageIndex)
      setShowHighlight(true)
      device.hapticFeedback('light')
    }
  }

  const handleNextWord = () => {
    if (!activeWord || activeWord.id >= 600) return
    const next = QURAN_VOCABULARY_600[activeWord.id]
    if (next) {
      setActiveWord(next)
      setCurrentPageIndex(next.pageIndex)
      setShowHighlight(true)
      device.hapticFeedback('light')
    }
  }

  // Zoom controls
  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))
  const handleResetZoom = () => setZoomLevel(1)

  // Full-screen toggle
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.().catch(() => {})
      setIsFullscreen(false)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') handlePrevPage()
      else if (e.key === 'ArrowRight') handleNextPage()
      else if (e.key === '+' || e.key === '=') handleZoomIn()
      else if (e.key === '-') handleZoomOut()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, currentPageIndex, onClose])

  // Mobile Touch Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX
      touchStartYRef.current = e.touches[0].clientY
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return
    if (zoomLevel > 1) return // Ignore swipe when zoomed in

    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current

    // Horizontal swipe threshold: 60px with minimal vertical slope
    if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 50) {
      if (deltaX < 0) {
        // Swipe Left -> Next Page
        handleNextPage()
      } else {
        // Swipe Right -> Prev Page
        handlePrevPage()
      }
    }
    touchStartXRef.current = null
    touchStartYRef.current = null
  }

  // Download PDF file
  const handleDownloadPdf = async () => {
    setIsDownloading(true)
    setDownloadPercent(0)
    try {
      await offlineQuranService.downloadVocabPdf('/top_600_words_quran.pdf', (pct) => {
        setDownloadPercent(pct)
      })
      setIsDownloaded(true)
      device.hapticFeedback('medium')
      // Also trigger device file download
      await offlineQuranService.triggerFileDownload()
    } catch (err) {
      console.error('PDF download error:', err)
      // Fallback: direct download link
      window.open('/top_600_words_quran.pdf', '_blank')
    } finally {
      setIsDownloading(false)
    }
  }

  if (!isOpen) return null

  const isWordLearned = activeWord ? wordProgressMap[activeWord.id]?.isLearned : false
  const isWordBookmarked = activeWord ? wordProgressMap[activeWord.id]?.isBookmarked : false

  // Image source for current page
  const currentImgSrc = `/images/quran_pages/page_${String(currentPageIndex).padStart(3, '0')}.webp`

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#07130F] text-white animate-fade-in select-none overflow-hidden">
      {/* ======================================================== */}
      {/* TOP ACTION BAR                                            */}
      {/* ======================================================== */}
      <div className="flex-shrink-0 px-3 sm:px-5 py-2.5 bg-gradient-to-r from-[#0C382B] via-[#092B21] to-[#0C382B] border-b border-[#E2B755]/20 flex items-center justify-between gap-2 shadow-md">
        {/* Left: Back / Close & Page Indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reader"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white active:scale-95 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-bold text-sm sm:text-base text-[#F6E6C2] tracking-wide">
                Top 600 Words of the Quran
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E2B755]/20 text-[#E2B755] border border-[#E2B755]/30">
                Official PDF
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-emerald-200/80">
              <span>Page {currentPageIndex + 1} of {TOTAL_PAGES}</span>
              {activeWord && (
                <>
                  <span>•</span>
                  <span className="text-[#E2B755] font-semibold">
                    Word #{activeWord.id} ({activeWord.transliteration})
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Controls & Download */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Highlight toggle */}
          {activeWord && (
            <button
              type="button"
              onClick={() => setShowHighlight(!showHighlight)}
              title={showHighlight ? 'Hide Word Focus' : 'Highlight Word'}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                showHighlight
                  ? 'bg-[#E2B755] text-[#0C382B] font-bold shadow-xs'
                  : 'bg-white/10 text-emerald-200 hover:bg-white/20'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Focus</span>
            </button>
          )}

          {/* Verse Reflection Drawer Toggle */}
          {activeWord && (activeWord.verseEnglish || activeWord.verseRomanUrdu) && (
            <button
              type="button"
              onClick={() => setShowVerseDrawer(!showVerseDrawer)}
              title="View Verse Context"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                showVerseDrawer
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-white/10 text-emerald-200 hover:bg-white/20'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Verse</span>
            </button>
          )}

          {/* Zoom In / Out / Reset */}
          <div className="hidden md:flex items-center bg-white/10 rounded-xl p-0.5 border border-white/10">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.75}
              title="Zoom out"
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition disabled:opacity-30 cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset zoom (100%)"
              className="px-2 text-[11px] font-mono font-bold hover:bg-white/10 rounded-lg h-7 flex items-center transition cursor-pointer"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 2.5}
              title="Zoom in"
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition disabled:opacity-30 cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Download PDF Button */}
          {isDownloaded ? (
            <button
              type="button"
              onClick={handleDownloadPdf}
              title="Download or save PDF to device"
              className="px-3 py-1.5 rounded-xl bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-emerald-600/60 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Offline Ready</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              title="Download 52MB complete original PDF"
              className="px-3 py-1.5 rounded-xl bg-[#E2B755] hover:bg-[#D4A33B] text-[#0C382B] text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isDownloading ? `${downloadPercent}%` : 'Download PDF'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MAIN VIEWPORT: AUTHENTIC PDF PAGE WITH HIGHLIGHT OVERLAY  */}
      {/* ======================================================== */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 relative overflow-auto bg-[#07130F] flex items-center justify-center p-2 sm:p-4"
        style={{ touchAction: zoomLevel > 1 ? 'pan-x pan-y' : 'pan-y' }}
      >
        {/* Floating Page Nav: Previous */}
        <button
          type="button"
          onClick={handlePrevPage}
          disabled={currentPageIndex <= 0}
          aria-label="Previous page"
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition shadow-xl disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer active:scale-95"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Floating Page Nav: Next */}
        <button
          type="button"
          onClick={handleNextPage}
          disabled={currentPageIndex >= TOTAL_PAGES - 1}
          aria-label="Next page"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition shadow-xl disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer active:scale-95"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Page Container */}
        <div
          className="relative max-w-full max-h-full transition-transform duration-200 ease-out shadow-2xl rounded-lg overflow-hidden border border-emerald-900/60"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Authentic full original page image from PDF */}
          <img
            src={currentImgSrc}
            alt={`Quran Vocabulary PDF Page ${currentPageIndex + 1}`}
            className="block max-h-[70vh] sm:max-h-[74vh] w-auto h-auto object-contain pointer-events-none rounded-lg"
            loading="eager"
          />

          {/* VISUAL HIGHLIGHT OVERLAY FOR THE ACTIVE WORD */}
          {showHighlight && activeWord && activeWord.pageIndex === currentPageIndex && (
            <div
              className={`absolute transition-all duration-300 pointer-events-none border-2 sm:border-[3px] border-[#E2B755] rounded-xl sm:rounded-2xl shadow-[0_0_30px_rgba(226,183,85,0.5)] ring-2 sm:ring-4 ring-[#E2B755]/40 animate-pulse ${
                activeWord.cardPosition === 'full'
                  ? 'inset-x-2 sm:inset-x-4 top-[10%] bottom-[8%]'
                  : activeWord.cardPosition === 'top'
                  ? 'inset-x-2 sm:inset-x-4 top-[10%] bottom-[51%]'
                  : 'inset-x-2 sm:inset-x-4 top-[50%] bottom-[8%]'
              }`}
            >
              {/* Highlight badge floating at corner */}
              <div className="absolute top-2 right-2 bg-[#0C382B] text-[#E2B755] border border-[#E2B755] px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#E2B755]" />
                <span>Word #{activeWord.id} Selected</span>
              </div>
            </div>
          )}
        </div>

        {/* Expandable Verse Reflection Drawer */}
        {showVerseDrawer && activeWord && (
          <div className="absolute inset-x-3 sm:inset-x-auto sm:right-6 bottom-4 sm:bottom-6 z-40 max-w-md bg-stone-900/95 text-white p-4 rounded-2xl border border-[#E2B755]/40 shadow-2xl backdrop-blur-md animate-fade-in space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-stone-800">
              <span className="text-xs font-bold text-[#E2B755] uppercase tracking-wider">
                Quranic Context: {activeWord.surahAyahRef}
              </span>
              <button
                type="button"
                onClick={() => setShowVerseDrawer(false)}
                className="w-6 h-6 rounded-full bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeWord.verseArabic && (
              <p className="font-amiri text-lg text-right text-emerald-200 leading-loose">
                {activeWord.verseArabic}
              </p>
            )}

            {activeWord.verseEnglish && (
              <p className="text-xs text-stone-200 leading-relaxed font-medium">
                &ldquo;{activeWord.verseEnglish}&rdquo;
              </p>
            )}

            {activeWord.verseRomanUrdu && (
              <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
                <span className="font-bold text-[10px] uppercase tracking-wider text-amber-300 block mb-0.5">
                  Roman Urdu:
                </span>
                {activeWord.verseRomanUrdu}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* BOTTOM DRAWER / INTERACTIVE WORD DETAILS & NAVIGATION     */}
      {/* ======================================================== */}
      <div className="flex-shrink-0 bg-gradient-to-t from-[#061812] via-[#08221A] to-[#0A2D23] border-t border-[#E2B755]/20 p-3 sm:p-4 shadow-2xl">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Word Context & Info (if on a vocabulary page) */}
          {activeWord ? (
            <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-3">
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-[#E2B755] border border-[#E2B755]/30">
                    Word #{activeWord.id} / 600
                  </span>
                  <span className="text-sm sm:text-base font-bold text-white tracking-wide">
                    {activeWord.transliteration}
                  </span>
                  {activeWord.repeats && (
                    <span className="text-[10px] font-semibold text-emerald-300">
                      ({activeWord.repeats})
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-100 font-medium mt-0.5 line-clamp-1">
                  {activeWord.meaning} • Ref: {activeWord.surahAyahRef}
                </p>

                {wordsOnCurrentPage.length > 1 && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] text-stone-400 font-bold uppercase">On Page:</span>
                    {wordsOnCurrentPage.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          setActiveWord(w)
                          setShowHighlight(true)
                          device.hapticFeedback('light')
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                          activeWord?.id === w.id
                            ? 'bg-[#E2B755] text-[#0C382B]'
                            : 'bg-white/10 text-stone-300 hover:bg-white/20'
                        }`}
                      >
                        #{w.id} ({w.cardPosition})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick prev / next word buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevWord}
                  disabled={activeWord.id <= 1}
                  title="Previous word"
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextWord}
                  disabled={activeWord.id >= 600}
                  title="Next word"
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-left text-xs text-stone-300">
              <span className="font-semibold text-white">Full Document View:</span> Slide {currentPageIndex + 1} of {TOTAL_PAGES}.
            </div>
          )}

          {/* Quick Actions: Bookmark, Learned Buttons & Page Navigation */}
          <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-2 flex-wrap">
            {activeWord && (
              <>
                <button
                  type="button"
                  onClick={() => onToggleBookmark(activeWord.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    isWordBookmarked
                      ? 'bg-amber-400 text-stone-900 border-amber-300 shadow-sm'
                      : 'bg-white/10 text-stone-200 border-white/20 hover:bg-white/20'
                  }`}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${
                      isWordBookmarked ? 'fill-stone-900 text-stone-900' : 'text-stone-300'
                    }`}
                  />
                  <span>{isWordBookmarked ? 'Saved' : 'Bookmark'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleLearned(activeWord.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isWordLearned
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-[#E2B755] hover:bg-[#D4A33B] text-[#0C382B]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isWordLearned ? 'Learned ✓' : 'Mark Learned'}</span>
                </button>
              </>
            )}

            {/* Quick jump to page buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(0)}
                title="Cover Page"
                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-stone-300 transition cursor-pointer"
              >
                Cover
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(6)}
                title="Jump to Word 1 (Page 7)"
                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-stone-300 transition cursor-pointer"
              >
                Word #1
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(317)}
                title="Jump to Word 600 (Page 318)"
                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-stone-300 transition cursor-pointer"
              >
                Word #600
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
