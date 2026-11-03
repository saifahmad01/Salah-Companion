import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  BookOpen,
  Bookmark,
  Trash2,
  Plus,
  X,
  Scan,
  AlertCircle,
} from 'lucide-react'
import { offlineQuranService, type OfflinePdfStatus } from '../services/offlineQuranService'
import type { QuranPageBookmarkItem } from '../services/backendApi'
import { QURAN_SURAHS } from '../data/quranSurahs'

// Configure PDF.js worker using Vite's URL asset loader
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export interface PdfJsReaderProps {
  title: string
  subtitle?: string
  pdfUrl: string
  resourceKey: 'quran-roman-urdu' | 'vocab-600-words'
  initialPage?: number
  targetWord?: {
    id: number
    arabic: string
    transliteration: string
    meaning: string
    reference?: string
  }
  isBookmarked?: boolean
  isLearned?: boolean
  onToggleBookmark?: (wordId: number) => void
  onToggleLearned?: (wordId: number) => void
  backButtonLabel?: string
  onClose: () => void
  onPageChange?: (page: number, total: number) => void
}

/**
 * Helper to determine approximate Surah for a Quran page (1 to 604)
 */
function getSurahForQuranPage(pageNum: number): string {
  if (pageNum <= 1) return 'Al-Fatihah'
  for (let i = QURAN_SURAHS.length - 1; i >= 0; i--) {
    if (pageNum >= QURAN_SURAHS[i].startPage) {
      return QURAN_SURAHS[i].name
    }
  }
  return 'The Holy Quran'
}

export const PdfJsReader: React.FC<PdfJsReaderProps> = ({
  title,
  subtitle,
  pdfUrl,
  resourceKey,
  initialPage = 1,
  targetWord,
  isBookmarked = false,
  isLearned = false,
  onToggleBookmark,
  onToggleLearned,
  backButtonLabel = 'Back',
  onClose,
  onPageChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<any>(null)

  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState<number>(initialPage)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [scale, setScale] = useState<number>(1.0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [pageRendering, setPageRendering] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  // Offline caching state
  const [offlineStatus, setOfflineStatus] = useState<OfflinePdfStatus>({ isDownloaded: false })
  const [isDownloading, setIsDownloading] = useState<boolean>(false)
  const [downloadProgress, setDownloadProgress] = useState<number>(0)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  // Direct page input state
  const [pageInputVal, setPageInputVal] = useState<string>(String(initialPage))

  // Personal Page Bookmarks state
  const [bookmarks, setBookmarks] = useState<QuranPageBookmarkItem[]>([])
  const [isBookmarksDrawerOpen, setIsBookmarksDrawerOpen] = useState<boolean>(false)
  const [isAddBookmarkModalOpen, setIsAddBookmarkModalOpen] = useState<boolean>(false)
  const [bookmarkTitle, setBookmarkTitle] = useState<string>('')
  const [bookmarkNotes, setBookmarkNotes] = useState<string>('')

  // Pinch-to-zoom multi-touch tracking
  const initialPinchDistRef = useRef<number | null>(null)
  const initialScaleRef = useRef<number>(1.0)

  // Load offline download status and bookmarks on mount
  useEffect(() => {
    let mounted = true
    const initData = async () => {
      const status =
        resourceKey === 'quran-roman-urdu'
          ? await offlineQuranService.getQuranDownloadStatus()
          : await offlineQuranService.getVocabDownloadStatus()
      if (mounted) setOfflineStatus(status)

      const bms = await offlineQuranService.fetchBookmarks(resourceKey)
      if (mounted) setBookmarks(bms)
    }
    initData()
    return () => {
      mounted = false
    }
  }, [resourceKey])

  // Load PDF Document with Offline-First priority:
  // 1. Check IndexedDB blob. If present, load directly from device.
  // 2. If not, stream from Supabase Storage with range chunks.
  useEffect(() => {
    let active = true
    setIsLoading(true)
    setErrorMessage(null)

    const loadPdf = async () => {
      try {
        let docLoadingTask: any

        // Check IndexedDB
        const offlineBlob =
          resourceKey === 'quran-roman-urdu'
            ? await offlineQuranService.getQuranBlob()
            : await offlineQuranService.getVocabPdfBlob()

        if (offlineBlob && offlineBlob.size > 1024 * 1024) {
          const arrayBuffer = await offlineBlob.arrayBuffer()
          docLoadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
            cMapPacked: true,
          })
        } else {
          // Stream on-demand from Supabase Edge CDN
          docLoadingTask = pdfjsLib.getDocument({
            url: pdfUrl,
            rangeChunkSize: 65536,
            cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
            cMapPacked: true,
          })
        }

        const doc = await docLoadingTask.promise
        if (!active) return

        setPdfDoc(doc)
        setTotalPages(doc.numPages)

        const startPage = Math.min(Math.max(1, initialPage), doc.numPages)
        setCurrentPage(startPage)
        setPageInputVal(String(startPage))
        setIsLoading(false)
      } catch (err: any) {
        if (!active) return
        console.error('[PdfJsReader] Failed to load PDF:', err)
        setErrorMessage(
          err.message ||
            'Failed to load PDF document. Please verify your internet connection or offline download.'
        )
        setIsLoading(false)
      }
    }

    loadPdf()

    return () => {
      active = false
    }
  }, [pdfUrl, resourceKey, initialPage])

  // Render Current Page onto Canvas (Single-Page & Zoom view)
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || !canvasRef.current || !scrollContainerRef.current) return

      try {
        setPageRendering(true)

        // Cancel previous task safely
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel()
          } catch {
            // ignore
          }
        }

        const page = await pdfDoc.getPage(pageNum)
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        if (!context) return

        // Compute responsive scale factor
        const containerWidth = scrollContainerRef.current.clientWidth || window.innerWidth || 800
        const unscaledViewport = page.getViewport({ scale: 1.0 })
        const baseFitScale = (containerWidth - 24) / unscaledViewport.width
        const effectiveScale = Math.max(0.5, Math.min(3.5, baseFitScale * scale))

        // Device pixel ratio for high-DPI retina rendering
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2.5)
        const viewport = page.getViewport({ scale: effectiveScale })

        canvas.width = Math.floor(viewport.width * pixelRatio)
        canvas.height = Math.floor(viewport.height * pixelRatio)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = 'high'

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }

        const renderTask = page.render(renderContext)
        renderTaskRef.current = renderTask

        await renderTask.promise
        setPageRendering(false)

        onPageChange?.(pageNum, pdfDoc.numPages)

        // Auto-save reading position locally and remotely (debounced)
        if (resourceKey === 'quran-roman-urdu') {
          const surahName = getSurahForQuranPage(pageNum)
          offlineQuranService.saveReadingProgress({
            lastPage: pageNum,
            lastSurah: surahName,
          })
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('[PdfJsReader] Page render error:', err)
        }
        setPageRendering(false)
      }
    },
    [pdfDoc, scale, onPageChange, resourceKey]
  )

  useEffect(() => {
    if (pdfDoc && currentPage > 0) {
      renderPage(currentPage)
    }
  }, [pdfDoc, currentPage, scale, renderPage])

  // Navigation handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      const next = currentPage - 1
      setCurrentPage(next)
      setPageInputVal(String(next))
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  const handleNextPage = () => {
    if (pdfDoc && currentPage < totalPages) {
      const next = currentPage + 1
      setCurrentPage(next)
      setPageInputVal(String(next))
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseInt(pageInputVal, 10)
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      setCurrentPage(parsed)
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } else {
      setPageInputVal(String(currentPage))
    }
  }

  // Zoom handlers
  const handleZoomIn = () => setScale((prev) => Math.min(3.0, +(prev + 0.25).toFixed(2)))
  const handleZoomOut = () => setScale((prev) => Math.max(0.6, +(prev - 0.25).toFixed(2)))
  const handleFitWidth = () => setScale(1.0)

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.().catch(() => {})
      setIsFullscreen(false)
    }
  }

  // Offline Download & Redownload Handlers
  const handleDownloadForOffline = async () => {
    if (isDownloading) return

    setIsDownloading(true)
    setDownloadProgress(0)
    setDownloadError(null)

    try {
      if (resourceKey === 'quran-roman-urdu') {
        await offlineQuranService.downloadQuranPdf(pdfUrl, (pct) => {
          setDownloadProgress(pct)
        })
      } else {
        await offlineQuranService.downloadVocabPdf(pdfUrl, (pct) => {
          setDownloadProgress(pct)
        })
      }
      const updatedStatus =
        resourceKey === 'quran-roman-urdu'
          ? await offlineQuranService.getQuranDownloadStatus()
          : await offlineQuranService.getVocabDownloadStatus()

      setOfflineStatus(updatedStatus)
      setIsDownloading(false)
    } catch (err: any) {
      console.error('[PdfJsReader] Download failed:', err)
      setDownloadError(err.message || 'Download failed. Please check network/storage quota.')
      setIsDownloading(false)
    }
  }

  const handleDeleteOffline = async () => {
    if (confirm('Delete downloaded PDF from local device storage? You can stream online or re-download anytime.')) {
      if (resourceKey === 'quran-roman-urdu') {
        await offlineQuranService.deleteDownloadedQuran()
      } else {
        await offlineQuranService.deleteDownloadedVocabPdf()
      }
      setOfflineStatus({ isDownloaded: false })
    }
  }

  // Bookmark management
  const isCurrentPageBookmarked = bookmarks.some((b) => b.pageNumber === currentPage)

  const handleOpenAddBookmark = () => {
    const defaultTitle =
      resourceKey === 'quran-roman-urdu'
        ? `Surah ${getSurahForQuranPage(currentPage)} (Page ${currentPage})`
        : targetWord
        ? `Word #${targetWord.id}: ${targetWord.arabic} (${targetWord.transliteration})`
        : `Vocabulary Page ${currentPage}`

    setBookmarkTitle(defaultTitle)
    setBookmarkNotes('')
    setIsAddBookmarkModalOpen(true)
  }

  const handleSaveBookmark = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookmarkTitle.trim()) return

    const newBm = await offlineQuranService.addBookmark({
      resourceKey,
      pageNumber: currentPage,
      title: bookmarkTitle.trim(),
      notes: bookmarkNotes.trim() || undefined,
    })

    setBookmarks((prev) => {
      const filtered = prev.filter((b) => b.pageNumber !== currentPage)
      filtered.push(newBm)
      return filtered.sort((a, b) => a.pageNumber - b.pageNumber)
    })

    setIsAddBookmarkModalOpen(false)
  }

  const handleDeleteBookmark = async (bookmarkId: string, pageNum: number) => {
    await offlineQuranService.deleteBookmark(resourceKey, bookmarkId, pageNum)
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId && b.pageNumber !== pageNum))
  }

  const handleJumpToBookmark = (pageNum: number) => {
    setCurrentPage(pageNum)
    setPageInputVal(String(pageNum))
    setIsBookmarksDrawerOpen(false)
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Multi-touch Pinch to Zoom listeners
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialPinchDistRef.current = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        initialScaleRef.current = scale
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistRef.current) {
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        const ratio = currentDist / initialPinchDistRef.current
        const newScale = Math.max(0.6, Math.min(3.0, +(initialScaleRef.current * ratio).toFixed(2)))
        setScale(newScale)
      }
    }

    const onTouchEnd = () => {
      initialPinchDistRef.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [scale])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft') handlePrevPage()
      else if (e.key === 'ArrowRight') handleNextPage()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, totalPages])

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex flex-col bg-[#051A13] text-[#F5EEDB] select-none overflow-hidden touch-manipulation"
      style={{
        overscrollBehavior: 'contain',
      }}
    >
      {/* ======================================================== */}
      {/* 1. TOP RESPONSIVE HEADER BAR                              */}
      {/* ======================================================== */}
      <header className="flex-shrink-0 flex items-center justify-between px-3 md:px-6 py-2 bg-[#092E22] border-b border-[#1A4B3A] shadow-md z-30">
        {/* Left: Back Button & Title */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#124232] hover:bg-[#185340] active:scale-95 transition-all text-xs md:text-sm font-bold text-[#F5EEDB] border border-[#235845] shadow-xs cursor-pointer touch-target"
            title="Return to previous section"
          >
            <ArrowLeft className="w-4 h-4 text-[#E2B755]" />
            <span className="hidden sm:inline">{backButtonLabel}</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm md:text-base font-bold text-white truncate flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#E2B755] flex-shrink-0" />
              <span className="truncate">{title}</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-[#A0C4B2] truncate">
              {resourceKey === 'quran-roman-urdu'
                ? `Surah ${getSurahForQuranPage(currentPage)} • Page ${currentPage} of ${totalPages || '...'}`
                : subtitle || `Page ${currentPage} of ${totalPages || '...'}`}
            </p>
          </div>
        </div>

        {/* Right: Controls, Zoom, Bookmarks, and Offline Status */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Zoom Controls (Desktop / Tablet) */}
          <div className="hidden sm:flex items-center bg-[#124232] rounded-xl p-0.5 border border-[#235845]">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.6}
              className="p-1.5 text-[#E2B755] hover:text-white disabled:opacity-40 transition cursor-pointer"
              title="Zoom out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleFitWidth}
              className="px-2 py-1 text-xs font-mono font-bold text-white hover:text-[#E2B755] transition cursor-pointer"
              title="Fit to Width (100%)"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={scale >= 3.0}
              className="p-1.5 text-[#E2B755] hover:text-white disabled:opacity-40 transition cursor-pointer"
              title="Zoom in (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Fit Width Button for Mobile */}
          <button
            onClick={handleFitWidth}
            className="sm:hidden p-2 rounded-xl bg-[#124232] text-[#E2B755] border border-[#235845] transition cursor-pointer touch-target"
            title="Reset Zoom to 100%"
          >
            <Scan className="w-4 h-4" />
          </button>

          {/* Bookmarks Drawer Trigger */}
          <button
            onClick={() => setIsBookmarksDrawerOpen(true)}
            className="relative p-2 rounded-xl bg-[#124232] hover:bg-[#185340] text-[#E2B755] border border-[#235845] transition cursor-pointer touch-target"
            title="View saved bookmarks"
          >
            <Bookmark className="w-4 h-4" fill={isCurrentPageBookmarked ? 'currentColor' : 'none'} />
            {bookmarks.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#E2B755] text-[#051A13] text-[9.5px] font-bold flex items-center justify-center">
                {bookmarks.length}
              </span>
            )}
          </button>

          {/* Add / Toggle Current Page Bookmark */}
          <button
            onClick={handleOpenAddBookmark}
            className={`p-2 rounded-xl border transition cursor-pointer touch-target ${
              isCurrentPageBookmarked
                ? 'bg-[#E2B755] text-[#051A13] border-[#E2B755]'
                : 'bg-[#124232] hover:bg-[#185340] text-[#E2B755] border-[#235845]'
            }`}
            title={isCurrentPageBookmarked ? 'Page is bookmarked' : 'Bookmark this page'}
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Offline Ready / Download Pill */}
          {offlineStatus.isDownloaded ? (
            <div
              onClick={handleDeleteOffline}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0E3B2E] text-[#55D6A0] border border-[#1D6B4F] text-xs font-semibold cursor-pointer hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-800 transition"
              title="Downloaded offline. Click to manage/delete."
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#55D6A0]" />
              <span className="hidden md:inline">Saved Offline</span>
            </div>
          ) : isDownloading ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#1A4B3A] text-xs font-bold text-[#E2B755] border border-[#2D6A4F]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E2B755]" />
              <span>{downloadProgress}%</span>
            </div>
          ) : (
            <button
              onClick={handleDownloadForOffline}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#1A5340] hover:bg-[#236850] active:scale-95 text-xs font-bold text-white border border-[#31785E] transition shadow-xs cursor-pointer touch-target"
              title="Download full PDF for permanent offline reading"
            >
              <Download className="w-3.5 h-3.5 text-[#E2B755]" />
              <span className="hidden sm:inline">Save Offline</span>
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-[#124232] hover:bg-[#185340] text-[#E2B755] border border-[#235845] transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Download Error Banner */}
      {downloadError && (
        <div className="flex-shrink-0 bg-red-950/90 border-b border-red-800 px-4 py-2 flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{downloadError}</span>
          </div>
          <button
            onClick={() => setDownloadError(null)}
            className="text-red-400 hover:text-white font-bold p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Target Word Sub-banner (When opened from 600 words) */}
      {targetWord && (
        <div className="flex-shrink-0 bg-[#0A261D] border-b border-[#1D4A3A] px-3 sm:px-5 py-2 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-md bg-[#E2B755] text-[#051A13] font-bold text-[11px] shadow-xs">
              Word #{targetWord.id}
            </span>
            <span className="font-arabic text-sm text-[#E2B755]">{targetWord.arabic}</span>
            <span className="text-white font-semibold truncate">({targetWord.transliteration})</span>
            <span className="text-[#A0C4B2] truncate hidden sm:inline">— {targetWord.meaning}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onToggleBookmark && (
              <button
                onClick={() => onToggleBookmark(targetWord.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  isBookmarked
                    ? 'bg-[#E2B755] text-[#051A13] border-[#E2B755]'
                    : 'bg-[#124232] text-[#E2B755] border-[#235845] hover:bg-[#185340]'
                }`}
              >
                <Bookmark className="w-3 h-3" fill={isBookmarked ? 'currentColor' : 'none'} />
                <span className="hidden sm:inline">{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
              </button>
            )}

            {onToggleLearned && (
              <button
                onClick={() => onToggleLearned(targetWord.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  isLearned
                    ? 'bg-[#1D7355] text-white border-[#27916C]'
                    : 'bg-[#124232] text-[#A0C4B2] border-[#235845] hover:bg-[#185340]'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-[#E2B755]" />
                <span className="hidden sm:inline">{isLearned ? 'Learned' : 'Mark Learned'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MAIN SCROLLABLE CANVAS & PAGE VIEWER CONTAINER        */}
      {/* ======================================================== */}
      <main
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-4 md:p-6 bg-[#03120D] relative flex items-start justify-center"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y pinch-zoom',
          overscrollBehavior: 'contain',
        }}
      >
        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#03120D]/90 z-20 backdrop-blur-xs">
            <div className="w-12 h-12 rounded-full border-3 border-[#1A4B3A] border-t-[#E2B755] animate-spin mb-3 shadow-lg" />
            <p className="text-sm font-bold text-white">Loading Quran PDF...</p>
            <p className="text-xs text-[#A0C4B2] mt-1">
              {offlineStatus.isDownloaded ? 'Reading from device storage' : 'Streaming from Supabase Storage'}
            </p>
          </div>
        )}

        {/* Error State */}
        {errorMessage && (
          <div className="max-w-md p-6 bg-[#0E281F] border border-red-500/30 rounded-2xl text-center shadow-2xl my-auto">
            <p className="text-red-400 font-bold mb-2">Error Loading Document</p>
            <p className="text-xs text-[#A0C4B2] mb-4">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-[#124232] text-xs font-bold text-[#E2B755] hover:bg-[#185340] border border-[#235845] cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Canvas Render Frame */}
        <div className="relative shadow-2xl rounded-sm overflow-hidden bg-[#07241A] border border-[#1A4B3A]/60 my-auto transition-transform duration-100 ease-out">
          <canvas ref={canvasRef} className="block max-w-none h-auto transition-opacity duration-150" />
          {pageRendering && !isLoading && (
            <div className="absolute top-3 right-3 bg-[#092E22]/90 text-[#E2B755] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md border border-[#235845]">
              <Loader2 className="w-3 h-3 animate-spin text-[#E2B755]" />
              <span>Rendering...</span>
            </div>
          )}
        </div>
      </main>

      {/* ======================================================== */}
      {/* 3. BOTTOM FLOATING NAVIGATION & JUMP TOOLBAR              */}
      {/* ======================================================== */}
      <footer className="flex-shrink-0 flex items-center justify-between px-3 md:px-8 py-2.5 bg-[#092E22] border-t border-[#1A4B3A] shadow-2xl z-30">
        {/* Previous Page */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage <= 1 || isLoading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#124232] hover:bg-[#185340] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs sm:text-sm font-bold text-white border border-[#235845] cursor-pointer touch-target"
        >
          <ChevronLeft className="w-4 h-4 text-[#E2B755]" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Center: Interactive Page Slider & Jump Input */}
        <div className="flex items-center gap-2 sm:gap-4 max-w-xs sm:max-w-md w-full justify-center">
          <input
            type="range"
            min={1}
            max={totalPages || 1}
            value={currentPage}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10)
              setCurrentPage(val)
              setPageInputVal(String(val))
            }}
            className="w-20 sm:w-44 h-1.5 bg-[#124232] rounded-lg appearance-none cursor-pointer accent-[#E2B755]"
            title="Slide to browse pages"
          />

          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
            <span className="text-xs text-[#A0C4B2] hidden sm:inline font-medium">Page</span>
            <input
              type="text"
              value={pageInputVal}
              onChange={(e) => setPageInputVal(e.target.value)}
              onBlur={() => setPageInputVal(String(currentPage))}
              className="w-12 text-center text-xs sm:text-sm font-bold bg-[#124232] border border-[#235845] rounded-lg px-1 py-1 text-white focus:border-[#E2B755] focus:outline-none"
            />
            <span className="text-xs sm:text-sm text-[#A0C4B2] font-semibold">/ {totalPages || '...'}</span>
          </form>
        </div>

        {/* Next Page */}
        <button
          onClick={handleNextPage}
          disabled={currentPage >= totalPages || isLoading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#124232] hover:bg-[#185340] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs sm:text-sm font-bold text-white border border-[#235845] cursor-pointer touch-target"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4 text-[#E2B755]" />
        </button>
      </footer>

      {/* ======================================================== */}
      {/* 4. PERSONAL BOOKMARKS SLIDE-OVER DRAWER                  */}
      {/* ======================================================== */}
      {isBookmarksDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-[#092E22] border-l border-[#1A4B3A] shadow-2xl flex flex-col h-full animate-slide-left">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#1A4B3A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-[#E2B755]" fill="currentColor" />
                <h3 className="font-serif font-bold text-base text-white">Saved Bookmarks</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#124232] text-[#E2B755] border border-[#235845]">
                  {bookmarks.length}
                </span>
              </div>
              <button
                onClick={() => setIsBookmarksDrawerOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#124232] hover:bg-[#185340] text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bookmarks List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {bookmarks.length === 0 ? (
                <div className="py-16 text-center">
                  <Bookmark className="w-10 h-10 text-stone-500 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-bold text-white">No bookmarks yet</p>
                  <p className="text-xs text-[#A0C4B2] mt-1 max-w-xs mx-auto">
                    Click the '+' button in the top toolbar to bookmark any page with custom notes.
                  </p>
                </div>
              ) : (
                bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className={`p-3 rounded-xl border transition flex items-start justify-between gap-3 ${
                      bm.pageNumber === currentPage
                        ? 'bg-[#124232] border-[#E2B755] shadow-sm'
                        : 'bg-[#07241A] hover:bg-[#0E3628] border-[#1A4B3A]'
                    }`}
                  >
                    <div
                      onClick={() => handleJumpToBookmark(bm.pageNumber)}
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#E2B755] text-[#051A13] font-bold text-[10px]">
                          Page {bm.pageNumber}
                        </span>
                        <h4 className="font-bold text-sm text-white truncate">{bm.title}</h4>
                      </div>
                      {bm.notes && (
                        <p className="text-xs text-[#A0C4B2] mt-1 line-clamp-2 italic">"{bm.notes}"</p>
                      )}
                      <p className="text-[10px] text-stone-400 mt-1">
                        Saved on {new Date(bm.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteBookmark(bm.id, bm.pageNumber)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-950/40 transition cursor-pointer flex-shrink-0"
                      title="Delete bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Quick Add Current Page button at bottom of drawer */}
            <div className="p-4 border-t border-[#1A4B3A] bg-[#07241A]">
              <button
                onClick={() => {
                  setIsBookmarksDrawerOpen(false)
                  handleOpenAddBookmark()
                }}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-[#051A13] bg-[#E2B755] hover:brightness-105 shadow-md flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <Plus className="w-4 h-4" />
                <span>Bookmark Current Page ({currentPage})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. ADD / EDIT BOOKMARK MODAL                             */}
      {/* ======================================================== */}
      {isAddBookmarkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#092E22] border border-[#1A4B3A] text-white w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-[#1A4B3A] pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-[#E2B755]" fill="currentColor" />
                <h3 className="font-serif font-bold text-base">Bookmark Page {currentPage}</h3>
              </div>
              <button
                onClick={() => setIsAddBookmarkModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#124232] text-stone-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBookmark} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#A0C4B2] font-semibold mb-1">Bookmark Name / Title</label>
                <input
                  type="text"
                  required
                  value={bookmarkTitle}
                  onChange={(e) => setBookmarkTitle(e.target.value)}
                  placeholder="e.g. Surah Al-Kahf Friday recitation"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#07241A] border border-[#1A4B3A] text-white placeholder-stone-500 focus:outline-none focus:border-[#E2B755]"
                />
              </div>

              <div>
                <label className="block text-[#A0C4B2] font-semibold mb-1">Personal Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={bookmarkNotes}
                  onChange={(e) => setBookmarkNotes(e.target.value)}
                  placeholder="Reflections, Ayah references, or vocabulary reminders..."
                  className="w-full px-3 py-2.5 rounded-xl bg-[#07241A] border border-[#1A4B3A] text-white placeholder-stone-500 focus:outline-none focus:border-[#E2B755]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1A4B3A]">
                <button
                  type="button"
                  onClick={() => setIsAddBookmarkModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#124232] text-white hover:bg-[#185340] font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#E2B755] text-[#051A13] hover:brightness-105 font-bold shadow-md transition cursor-pointer"
                >
                  Save Bookmark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}

export default PdfJsReader
