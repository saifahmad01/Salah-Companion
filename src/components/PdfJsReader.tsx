import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  CheckCircle2,
  Bookmark,
  Trash2,
  Plus,
  X,
  AlertCircle,
} from 'lucide-react'
import { offlineQuranService, type OfflinePdfStatus } from '../services/offlineQuranService'
import { salahApi, type QuranPageBookmarkItem } from '../services/backendApi'
import { QURAN_SURAHS } from '../data/quranSurahs'
import { type QuranParaMeta, getParaForQuranPage } from '../data/quranParas'
import { QuranSearchModal } from './QuranSearchModal'
import { QuranParaModal } from './QuranParaModal'
import { type QuranSearchResult } from '../data/quranSearchIndex'
import { QURAN_VOCABULARY_600 } from '../data/quranVocabulary'
import { PdfReaderToolbar } from './PdfReaderToolbar'

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
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<any>(null)

  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState<number>(initialPage)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [pageRendering, setPageRendering] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  // Fit Mode: 'width' (fills screen horizontally with balanced margins) vs 'page' (shows 100% of the page without scrolling)
  // On mobile portrait, 'width' mode provides the ideal readable book experience with balanced margins
  // On desktop / landscape, 'page' mode fits the complete page within viewport height
  const [fitMode, setFitMode] = useState<'page' | 'width'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 && window.innerHeight >= window.innerWidth ? 'width' : 'page'
    }
    return 'width'
  })
  // User zoom multiplier (1.0 = 100%, 1.25 = 125%, 1.5 = 150%, 2.0 = 200%)
  const [userZoom, setUserZoom] = useState<number>(1.0)

  // Smooth drag-to-pan handlers for desktop / mouse panning when zoomed
  const isDraggingRef = useRef<boolean>(false)
  const dragStartPosRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  })

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if (!scrollContainerRef.current) return
    const container = scrollContainerRef.current
    if (
      canvasDisplaySize.width > container.clientWidth ||
      canvasDisplaySize.height > container.clientHeight ||
      userZoom > 1.0
    ) {
      isDraggingRef.current = true
      dragStartPosRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !scrollContainerRef.current) return
    e.preventDefault()
    const dx = e.clientX - dragStartPosRef.current.x
    const dy = e.clientY - dragStartPosRef.current.y
    scrollContainerRef.current.scrollLeft = dragStartPosRef.current.scrollLeft - dx
    scrollContainerRef.current.scrollTop = dragStartPosRef.current.scrollTop - dy
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
  }
  // Display dimensions for canvas CSS styling
  const [canvasDisplaySize, setCanvasDisplaySize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  })

  // Offline caching state
  const [offlineStatus, setOfflineStatus] = useState<OfflinePdfStatus>({ isDownloaded: false })
  const [isDownloading, setIsDownloading] = useState<boolean>(false)
  const [downloadProgress, setDownloadProgress] = useState<number>(0)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  // Direct page input state
  const [pageInputVal, setPageInputVal] = useState<string>(String(initialPage))

  // Search & Para Navigation Modals state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false)
  const [isParaModalOpen, setIsParaModalOpen] = useState<boolean>(false)
  const [currentTargetWord, setCurrentTargetWord] = useState(targetWord)

  useEffect(() => {
    setCurrentTargetWord(targetWord)
  }, [targetWord])

  // Personal Page Bookmarks state
  const [bookmarks, setBookmarks] = useState<QuranPageBookmarkItem[]>([])
  const [isBookmarksDrawerOpen, setIsBookmarksDrawerOpen] = useState<boolean>(false)
  const [isAddBookmarkModalOpen, setIsAddBookmarkModalOpen] = useState<boolean>(false)
  const [bookmarkTitle, setBookmarkTitle] = useState<string>('')
  const [bookmarkNotes, setBookmarkNotes] = useState<string>('')

  // Pinch-to-zoom multi-touch tracking
  const initialPinchDistRef = useRef<number | null>(null)
  const initialZoomRef = useRef<number>(1.0)

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
        let docLoadingTask: any = null
        const offlineBlob =
          resourceKey === 'quran-roman-urdu'
            ? await offlineQuranService.getQuranBlob()
            : await offlineQuranService.getVocabPdfBlob()

        const basePdfConfig = {
          cMapUrl: '/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: '/standard_fonts/',
          enableXfa: false,
        }

        if (offlineBlob && offlineBlob.size > 1024 * 1024) {
          const arrayBuffer = await offlineBlob.arrayBuffer()
          docLoadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            ...basePdfConfig,
          })
        } else {
          // Stream on-demand from Supabase Edge CDN with byte range requests
          docLoadingTask = pdfjsLib.getDocument({
            url: pdfUrl,
            rangeChunkSize: 65536,
            ...basePdfConfig,
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

  // ==========================================================================
  // HIGH-RESOLUTION CANVAS RENDERING ENGINE
  // ==========================================================================
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || !canvasRef.current || !scrollContainerRef.current) return

      try {
        setPageRendering(true)

        // Cancel previous render task safely before starting a new one
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel()
          } catch {
            // ignore
          }
          renderTaskRef.current = null
        }

        const page = await pdfDoc.getPage(pageNum)
        const canvas = canvasRef.current
        const context = canvas.getContext('2d', { alpha: false })
        if (!context) return

        // Measure container available dimensions
        const container = scrollContainerRef.current
        const containerWidth = container.clientWidth || window.innerWidth || 800
        const containerHeight = container.clientHeight || window.innerHeight || 600

        // Balanced, comfortable margins on left and right:
        // Very small phones (<360px): 12px each side (24px total)
        // Standard mobile (<640px): 16px each side (32px total)
        // Tablet/Desktop (>=640px): 24px each side (48px total)
        const isNarrow = window.innerWidth < 360
        const isMobile = window.innerWidth < 640
        const horizontalMargin = isNarrow ? 12 : isMobile ? 16 : 24
        const verticalMargin = isMobile ? 12 : 20

        const availWidth = Math.max(240, containerWidth - horizontalMargin * 2)
        const availHeight = Math.max(240, containerHeight - verticalMargin * 2)

        const unscaledViewport = page.getViewport({ scale: 1.0 })

        // Compute base scale depending on fit mode
        let baseScale = 1.0
        if (fitMode === 'page') {
          // Fit entire page (height AND width) inside screen with all margins visible
          const scaleX = availWidth / unscaledViewport.width
          const scaleY = availHeight / unscaledViewport.height
          baseScale = Math.min(scaleX, scaleY)
        } else {
          // Fit to width: page width matches availWidth exactly, allowing comfortable reading with balanced side margins
          baseScale = availWidth / unscaledViewport.width
        }

        // Apply user zoom multiplier
        const effectiveScale = Math.max(0.35, Math.min(4.0, +(baseScale * userZoom).toFixed(3)))

        // Device pixel ratio for high-DPI retina rendering (up to 3.0 for ultra-sharp mobile displays)
        const pixelRatio = window.devicePixelRatio || 1
        const outputScale = Math.max(1.5, Math.min(3.0, pixelRatio))

        // Viewport scaled for the high-resolution hardware bitmap
        const renderViewport = page.getViewport({ scale: effectiveScale * outputScale })

        // CSS display layout dimensions (strictly maintains page aspect ratio)
        const displayWidth = Math.round(unscaledViewport.width * effectiveScale)
        const displayHeight = Math.round(unscaledViewport.height * effectiveScale)

        // Set hardware canvas dimensions
        canvas.width = Math.floor(renderViewport.width)
        canvas.height = Math.floor(renderViewport.height)

        // Set CSS dimensions for layout
        canvas.style.width = `${displayWidth}px`
        canvas.style.height = `${displayHeight}px`

        setCanvasDisplaySize({ width: displayWidth, height: displayHeight })

        // Enable high quality image smoothing for crisp Arabic calligraphy
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = 'high'

        const renderContext = {
          canvasContext: context,
          viewport: renderViewport,
          intent: 'display',
        }

        const renderTask = page.render(renderContext)
        renderTaskRef.current = renderTask

        await renderTask.promise
        setPageRendering(false)

        onPageChange?.(pageNum, pdfDoc.numPages)

        // Auto-save reading position locally and remotely
        if (resourceKey === 'quran-roman-urdu') {
          const surahName = getSurahForQuranPage(pageNum)
          offlineQuranService.saveReadingProgress({
            lastPage: pageNum,
            lastSurah: surahName,
          })
          salahApi
            .saveQuranReadingProgressState({
              resourceKey: 'quran-roman-urdu',
              lastPage: pageNum,
              lastSurah: surahName,
            })
            .catch(() => {})
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('[PdfJsReader] Page render error:', err)
        }
        setPageRendering(false)
      }
    },
    [pdfDoc, fitMode, userZoom, onPageChange, resourceKey]
  )

  useEffect(() => {
    if (pdfDoc && currentPage > 0) {
      renderPage(currentPage)
    }
  }, [pdfDoc, currentPage, fitMode, userZoom, renderPage])

  // Handle device rotation and window resize smoothly
  useEffect(() => {
    let timer: any = null
    const handleResize = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (pdfDoc && currentPage > 0) {
          renderPage(currentPage)
        }
      }, 150)
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [pdfDoc, currentPage, renderPage])

  // ==========================================================================
  // NAVIGATION & ZOOM HANDLERS
  // ==========================================================================
  const handleFirstPage = () => {
    if (currentPage > 1) {
      setCurrentPage(1)
      setPageInputVal('1')
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  const handleLastPage = () => {
    if (pdfDoc && currentPage < totalPages) {
      setCurrentPage(totalPages)
      setPageInputVal(String(totalPages))
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  const handleSelectSearchResult = (result: QuranSearchResult) => {
    setIsSearchModalOpen(false)
    const targetPage = Math.min(Math.max(1, result.pageNumber), totalPages || 608)
    setCurrentPage(targetPage)
    setPageInputVal(String(targetPage))
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
    if (result.vocabData) {
      setCurrentTargetWord({
        id: result.vocabData.id,
        arabic: result.vocabData.arabic,
        transliteration: result.vocabData.transliteration,
        meaning: result.vocabData.meaningEnglish || result.vocabData.meaning,
        reference: result.vocabData.surahAyahRef,
      })
    }
  }

  const handleSelectPara = (para: QuranParaMeta) => {
    setIsParaModalOpen(false)
    const targetPage = Math.min(Math.max(1, para.startPage), totalPages || 608)
    setCurrentPage(targetPage)
    setPageInputVal(String(targetPage))
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

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
  const handleZoomIn = () => {
    setUserZoom((prev) => Math.min(3.5, +(prev + (prev >= 2 ? 0.5 : 0.25)).toFixed(2)))
  }

  const handleZoomOut = () => {
    setUserZoom((prev) => Math.max(0.5, +(prev - (prev > 2 ? 0.5 : 0.25)).toFixed(2)))
  }

  const handleSetFitPage = () => {
    setFitMode('page')
    setUserZoom(1.0)
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSetFitWidth = () => {
    setFitMode('width')
    setUserZoom(1.0)
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleResetZoom = () => {
    setUserZoom(1.0)
  }

  const handleSetZoom = (zoom: number) => {
    setUserZoom(zoom)
  }

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

  // Offline Download & Delete Handlers
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
    } catch (err: any) {
      console.error('[PdfJsReader] Download failed:', err)
      setDownloadError(err.message || 'Download failed. Please check network/storage quota.')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDeleteOffline = async () => {
    if (!confirm('Remove downloaded PDF from device storage? You can redownload it anytime.')) {
      return
    }
    if (resourceKey === 'quran-roman-urdu') {
      await offlineQuranService.deleteDownloadedQuran()
      setOfflineStatus(await offlineQuranService.getQuranDownloadStatus())
    } else {
      await offlineQuranService.deleteDownloadedVocabPdf()
      setOfflineStatus(await offlineQuranService.getVocabDownloadStatus())
    }
  }

  // ==========================================================================
  // BOOKMARK MANAGEMENT
  // ==========================================================================
  const isCurrentPageBookmarked = bookmarks.some((b) => b.pageNumber === currentPage)

  const handleOpenAddBookmark = () => {
    const existing = bookmarks.find((b) => b.pageNumber === currentPage)
    setBookmarkTitle(
      existing?.title ||
        (resourceKey === 'quran-roman-urdu'
          ? `Surah ${getSurahForQuranPage(currentPage)} • Page ${currentPage}`
          : targetWord
          ? `Word #${targetWord.id}: ${targetWord.arabic} (${targetWord.transliteration})`
          : `Page ${currentPage}`)
    )
    setBookmarkNotes(existing?.notes || '')
    setIsAddBookmarkModalOpen(true)
  }

  const handleSaveBookmark = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const saved = await offlineQuranService.addBookmark({
        resourceKey,
        pageNumber: currentPage,
        title: bookmarkTitle.trim() || `Page ${currentPage}`,
        notes: bookmarkNotes.trim() || undefined,
      })

      setBookmarks((prev) => {
        const filtered = prev.filter((b) => b.pageNumber !== currentPage)
        return [saved, ...filtered].sort((a, b) => a.pageNumber - b.pageNumber)
      })

      setIsAddBookmarkModalOpen(false)
    } catch (err) {
      console.error('Failed to save bookmark:', err)
    }
  }

  const handleDeleteBookmark = async (bookmarkId: string, pageNum: number) => {
    try {
      await offlineQuranService.deleteBookmark(resourceKey, bookmarkId, pageNum)
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId))
    } catch (err) {
      console.error('Failed to delete bookmark:', err)
    }
  }

  const handleJumpToBookmark = (pageNum: number) => {
    setCurrentPage(pageNum)
    setPageInputVal(String(pageNum))
    setIsBookmarksDrawerOpen(false)
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // ==========================================================================
  // HARDWARE-ACCELERATED MOBILE PINCH-TO-ZOOM GESTURE
  // ==========================================================================
  useEffect(() => {
    const container = scrollContainerRef.current
    const wrapper = canvasWrapperRef.current
    if (!container || !wrapper) return

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        initialPinchDistRef.current = dist
        initialZoomRef.current = userZoom
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistRef.current && wrapper) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        const ratio = dist / initialPinchDistRef.current
        wrapper.style.transform = `scale(${ratio})`
        wrapper.style.transformOrigin = 'center top'
      }
    }

    const onTouchEnd = () => {
      if (initialPinchDistRef.current && wrapper) {
        const styleTransform = wrapper.style.transform
        const match = styleTransform.match(/scale\(([^)]+)\)/)
        const ratio = match ? parseFloat(match[1]) : 1.0

        wrapper.style.transform = 'none'
        initialPinchDistRef.current = null

        if (Math.abs(ratio - 1.0) > 0.04) {
          const newZoom = Math.max(0.5, Math.min(3.5, +(initialZoomRef.current * ratio).toFixed(2)))
          setUserZoom(newZoom)
        }
      }
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: true })
    container.addEventListener('touchend', onTouchEnd)
    container.addEventListener('touchcancel', onTouchEnd)

    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
      container.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [userZoom])

  // Keyboard navigation & global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Hotkey to open Search (Ctrl+K or Cmd+K)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setIsSearchModalOpen(true)
        return
      }

      // If user is currently focused on an input or textarea, let default typing happen
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      // Forward slash "/" hotkey opens search
      if (e.key === '/') {
        e.preventDefault()
        setIsSearchModalOpen(true)
        return
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') handlePrevPage()
      else if (e.key === 'ArrowRight' || e.key === 'PageDown') handleNextPage()
      else if (e.key === 'Home') handleFirstPage()
      else if (e.key === 'End') handleLastPage()
      else if (e.key === 'Escape') {
        if (isSearchModalOpen) setIsSearchModalOpen(false)
        else if (isParaModalOpen) setIsParaModalOpen(false)
        else if (isBookmarksDrawerOpen) setIsBookmarksDrawerOpen(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, totalPages, isSearchModalOpen, isParaModalOpen, isBookmarksDrawerOpen])

  const currentPara = getParaForQuranPage(currentPage)

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[99999] flex flex-col bg-[#03120D] text-[#F5EEDB] select-none overflow-hidden touch-manipulation w-screen h-screen"
      style={{
        overscrollBehavior: 'contain',
      }}
    >
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* 1. TOP RESPONSIVE HEADER BAR (WITH SAFE AREA & MORE MENU) */}
      {/* ======================================================== */}
      <PdfReaderToolbar
        title={title}
        subtitle={subtitle}
        resourceKey={resourceKey}
        currentPage={currentPage}
        totalPages={totalPages}
        currentPara={currentPara}
        targetWord={currentTargetWord}
        fitMode={fitMode}
        userZoom={userZoom}
        isFullscreen={isFullscreen}
        isCurrentPageBookmarked={isCurrentPageBookmarked}
        bookmarksCount={bookmarks.length}
        offlineStatus={offlineStatus}
        isDownloading={isDownloading}
        downloadProgress={downloadProgress}
        backButtonLabel={backButtonLabel}
        onClose={onClose}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenParaSelector={resourceKey === 'quran-roman-urdu' ? () => setIsParaModalOpen(true) : undefined}
        onSetFitPage={handleSetFitPage}
        onSetFitWidth={handleSetFitWidth}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onSetZoom={handleSetZoom}
        onOpenBookmarksDrawer={() => setIsBookmarksDrawerOpen(true)}
        onOpenAddBookmark={handleOpenAddBookmark}
        onDownloadOffline={handleDownloadForOffline}
        onDeleteOffline={handleDeleteOffline}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Download Error Banner */}
      {downloadError && (
        <div className="flex-shrink-0 bg-red-950/90 border-b border-red-800 px-4 py-2 flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{downloadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setDownloadError(null)}
            className="text-red-400 hover:text-white font-bold p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Target Word Sub-banner (When opened from 600 words) */}
      {currentTargetWord && (
        <div className="flex-shrink-0 bg-[#0A261D] border-b border-[#1D4A3A] px-3 sm:px-5 py-2 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-md bg-[#E2B755] text-[#051A13] font-bold text-[11px] shadow-xs">
              Word #{currentTargetWord.id}
            </span>
            <span className="font-arabic text-sm text-[#E2B755]">{currentTargetWord.arabic}</span>
            <span className="text-white font-semibold truncate">({currentTargetWord.transliteration})</span>
            <span className="text-[#A0C4B2] truncate hidden sm:inline">— {currentTargetWord.meaning}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onToggleBookmark && (
              <button
                type="button"
                onClick={() => onToggleBookmark(currentTargetWord.id)}
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
                type="button"
                onClick={() => onToggleLearned(currentTargetWord.id)}
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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 overflow-auto bg-[#03120D] relative overscroll-contain select-none ${
          userZoom > 1.0 || (canvasDisplaySize.width > (scrollContainerRef.current?.clientWidth || 0))
            ? 'cursor-grab active:cursor-grabbing'
            : ''
        }`}
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x pan-y',
        }}
      >
        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#03120D]/90 z-20 backdrop-blur-xs">
            <div className="w-12 h-12 rounded-full border-3 border-[#1A4B3A] border-t-[#E2B755] animate-spin mb-3 shadow-lg" />
            <p className="text-sm font-bold text-white">Loading Quran PDF...</p>
            <p className="text-xs text-[#A0C4B2] mt-1">
              {offlineStatus.isDownloaded
                ? 'Reading original PDF from device storage'
                : 'Streaming original PDF from Supabase Storage'}
            </p>
          </div>
        )}

        {/* Error State */}
        {errorMessage && (
          <div className="max-w-md p-6 bg-[#0E281F] border border-red-500/30 rounded-2xl text-center shadow-2xl m-auto my-12">
            <p className="text-red-400 font-bold mb-2">Error Loading Document</p>
            <p className="text-xs text-[#A0C4B2] mb-4">{errorMessage}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-[#124232] text-xs font-bold text-[#E2B755] hover:bg-[#185340] border border-[#235845] cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Centering Wrapper: Guarantees full page margins are visible without cropping */}
        <div
          className="min-h-full min-w-full flex items-center justify-center"
          style={{
            padding: `${window.innerWidth < 640 ? 12 : 20}px ${
              window.innerWidth < 360 ? 12 : window.innerWidth < 640 ? 16 : 24
            }px`,
            boxSizing: 'border-box',
            width:
              canvasDisplaySize.width > (scrollContainerRef.current?.clientWidth || 0)
                ? 'max-content'
                : '100%',
          }}
        >
          <div
            ref={canvasWrapperRef}
            className="relative shadow-2xl rounded-sm overflow-hidden bg-[#07241A] border border-[#1A4B3A]/60 flex-shrink-0 transition-shadow duration-150"
            style={{
              width: canvasDisplaySize.width ? `${canvasDisplaySize.width}px` : 'auto',
              height: canvasDisplaySize.height ? `${canvasDisplaySize.height}px` : 'auto',
              margin: 'auto',
            }}
          >
            <canvas ref={canvasRef} className="block w-full h-full" />
            {pageRendering && !isLoading && (
              <div className="absolute top-3 right-3 bg-[#092E22]/90 text-[#E2B755] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md border border-[#235845] backdrop-blur-xs">
                <Loader2 className="w-3 h-3 animate-spin text-[#E2B755]" />
                <span>Rendering...</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* 3. BOTTOM FLOATING NAVIGATION & JUMP TOOLBAR              */}
      {/* ======================================================== */}
      <footer
        className="flex-shrink-0 flex items-center justify-between px-3 md:px-8 py-2 sm:py-2.5 bg-[#092E22] border-t border-[#1A4B3A] shadow-2xl z-30 gap-2 min-h-[52px]"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
        }}
      >
        {/* Navigation Left: First Page & Previous Page */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleFirstPage}
            disabled={currentPage <= 1 || isLoading}
            className="flex items-center justify-center p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#124232] hover:bg-[#185340] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs font-bold text-white border border-[#235845] cursor-pointer touch-target"
            title="Go to First Page (Page 1)"
            aria-label="First Page"
          >
            <ChevronsLeft className="w-4 h-4 text-[#E2B755]" />
            <span className="hidden md:inline ml-1 text-xs">First</span>
          </button>

          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || isLoading}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#124232] hover:bg-[#185340] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs sm:text-sm font-bold text-white border border-[#235845] cursor-pointer touch-target"
            title="Go to Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4 text-[#E2B755]" />
            <span className="hidden sm:inline">Prev</span>
          </button>
        </div>

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
            className="w-16 sm:w-44 h-1.5 bg-[#124232] rounded-lg appearance-none cursor-pointer accent-[#E2B755]"
            title={`Slide page (1 to ${totalPages || 1})`}
          />

          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1.5 text-xs text-[#A0C4B2]">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={totalPages || 1}
              value={pageInputVal}
              onChange={(e) => setPageInputVal(e.target.value)}
              className="w-12 sm:w-16 px-1.5 py-1 text-center bg-[#124232] text-white font-mono font-bold rounded-lg border border-[#235845] focus:outline-none focus:border-[#E2B755] text-xs"
            />
            <span>of {totalPages || '...'}</span>
          </form>
        </div>

        {/* Navigation Right: Next Page & Last Page */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages || isLoading}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#124232] hover:bg-[#185340] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs sm:text-sm font-bold text-white border border-[#235845] cursor-pointer touch-target"
            title="Go to Next Page"
            aria-label="Next Page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4 text-[#E2B755]" />
          </button>

          <button
            type="button"
            onClick={handleLastPage}
            disabled={currentPage >= totalPages || isLoading}
            className="flex items-center justify-center p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#124232] hover:bg-[#185340] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs font-bold text-white border border-[#235845] cursor-pointer touch-target"
            title={`Go to Last Page (Page ${totalPages || 608})`}
            aria-label="Last Page"
          >
            <span className="hidden md:inline mr-1 text-xs">Last</span>
            <ChevronsRight className="w-4 h-4 text-[#E2B755]" />
          </button>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* 4. SLIDE-OUT BOOKMARKS DRAWER                            */}
      {/* ======================================================== */}
      {isBookmarksDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-[#092E22] text-[#F5EEDB] h-full shadow-2xl border-l border-[#1A4B3A] flex flex-col">
            <div className="p-4 bg-[#062018] border-b border-[#1A4B3A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-[#E2B755]" fill="currentColor" />
                <h3 className="font-bold text-sm text-white">Saved Bookmarks</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#124232] text-[#E2B755]">
                  {bookmarks.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsBookmarksDrawerOpen(false)}
                className="p-1.5 rounded-lg text-[#A0C4B2] hover:text-white hover:bg-[#124232] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 no-scrollbar">
              {bookmarks.length === 0 ? (
                <div className="text-center py-12 text-[#A0C4B2] text-xs">
                  <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#E2B755]" />
                  <p className="font-bold text-white">No bookmarks saved yet</p>
                  <p className="mt-1">Tap the &quot;+&quot; button in the top toolbar to bookmark this page.</p>
                </div>
              ) : (
                bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="p-3 rounded-xl bg-[#0E3527] border border-[#1A4B3A] hover:border-[#E2B755]/50 transition flex items-start justify-between gap-3 group"
                  >
                    <div
                      onClick={() => handleJumpToBookmark(bm.pageNumber)}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#E2B755] text-[#051A13] font-bold text-[10px]">
                          Page {bm.pageNumber}
                        </span>
                        <h4 className="font-bold text-xs text-white truncate">{bm.title}</h4>
                      </div>
                      {bm.notes && (
                        <p className="text-[11px] text-[#A0C4B2] mt-1.5 line-clamp-2 italic">
                          &ldquo;{bm.notes}&rdquo;
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteBookmark(bm.id, bm.pageNumber)}
                      className="p-1 text-stone-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition cursor-pointer opacity-70 group-hover:opacity-100"
                      title="Delete bookmark"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-[#062018] border-t border-[#1A4B3A]">
              <button
                type="button"
                onClick={handleOpenAddBookmark}
                className="w-full py-2.5 rounded-xl bg-[#E2B755] hover:bg-[#D4A33B] active:scale-98 text-[#051A13] font-bold text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
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
          <div className="w-full max-w-sm bg-[#092E22] text-[#F5EEDB] rounded-2xl shadow-2xl border border-[#1A4B3A] overflow-hidden">
            <div className="p-4 bg-[#062018] border-b border-[#1A4B3A] flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#E2B755]" />
                <span>Bookmark Page {currentPage}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddBookmarkModalOpen(false)}
                className="text-[#A0C4B2] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBookmark} className="p-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#A0C4B2] uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={bookmarkTitle}
                  onChange={(e) => setBookmarkTitle(e.target.value)}
                  placeholder="e.g. Surah Al-Kahf - Friday Recitation"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#124232] border border-[#235845] text-white text-xs placeholder:text-stone-400 focus:outline-none focus:border-[#E2B755]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A0C4B2] uppercase tracking-wider mb-1">
                  Reflection / Notes (Optional)
                </label>
                <textarea
                  value={bookmarkNotes}
                  onChange={(e) => setBookmarkNotes(e.target.value)}
                  placeholder="Personal reflection or note on this page..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-[#124232] border border-[#235845] text-white text-xs placeholder:text-stone-400 focus:outline-none focus:border-[#E2B755] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddBookmarkModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#A0C4B2] hover:bg-[#124232] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#E2B755] text-[#051A13] hover:brightness-105 font-bold text-xs shadow-md transition cursor-pointer"
                >
                  Save Bookmark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. ADVANCED QURAN SEARCH MODAL (SURAH, PARA, AYAH, PAGE) */}
      {/* ======================================================== */}
      <QuranSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectResult={handleSelectSearchResult}
        resourceKey={resourceKey}
        vocabWords={QURAN_VOCABULARY_600}
        currentPage={currentPage}
      />

      {/* ======================================================== */}
      {/* 7. DEDICATED 30 PARA / JUZ SELECTOR MODAL                */}
      {/* ======================================================== */}
      <QuranParaModal
        isOpen={isParaModalOpen}
        onClose={() => setIsParaModalOpen(false)}
        onSelectPara={handleSelectPara}
        currentPage={currentPage}
      />
    </div>,
    document.body
  )
}

export default PdfJsReader
