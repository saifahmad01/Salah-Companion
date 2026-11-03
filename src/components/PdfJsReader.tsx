import React, { useState, useEffect, useRef, useCallback } from 'react'
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
} from 'lucide-react'

import { offlineQuranService } from '../services/offlineQuranService'

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
  const [isOfflineReady, setIsOfflineReady] = useState<boolean>(false)
  const [isDownloading, setIsDownloading] = useState<boolean>(false)
  const [downloadProgress, setDownloadProgress] = useState<number>(0)

  // Direct page input state
  const [pageInputVal, setPageInputVal] = useState<string>(String(initialPage))

  // Check if PDF is cached offline on mount
  useEffect(() => {
    let mounted = true
    const checkOffline = async () => {
      const isCached =
        resourceKey === 'quran-roman-urdu'
          ? await offlineQuranService.isQuranDownloaded()
          : await offlineQuranService.isVocabPdfDownloaded()
      if (mounted) setIsOfflineReady(isCached)
    }
    checkOffline()
    return () => {
      mounted = false
    }
  }, [resourceKey])

  // Load PDF Document
  useEffect(() => {
    let active = true
    setIsLoading(true)
    setErrorMessage(null)

    const loadPdf = async () => {
      try {
        let docLoadingTask: any

        // Check if offline blob exists in IndexedDB
        const offlineBlob =
          resourceKey === 'quran-roman-urdu'
            ? await offlineQuranService.getQuranBlob()
            : await offlineQuranService.getVocabPdfBlob()

        if (offlineBlob) {
          const arrayBuffer = await offlineBlob.arrayBuffer()
          docLoadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
            cMapPacked: true,
          })
        } else {
          // Stream from Supabase Storage with range requests
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
        setErrorMessage(err.message || 'Failed to load Quran PDF. Please check your connection.')
        setIsLoading(false)
      }
    }

    loadPdf()

    return () => {
      active = false
    }
  }, [pdfUrl, resourceKey, initialPage])

  // Render Current Page onto Canvas
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || !canvasRef.current || !containerRef.current) return

      try {
        setPageRendering(true)

        // Cancel active render task if any
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel()
          } catch {
            // ignore cancel exception
          }
        }

        const page = await pdfDoc.getPage(pageNum)
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        if (!context) return

        // Calculate responsive scale
        const containerWidth = containerRef.current.clientWidth || 800
        const unscaledViewport = page.getViewport({ scale: 1.0 })
        const baseFitScale = (containerWidth - 32) / unscaledViewport.width
        const effectiveScale = Math.max(0.6, baseFitScale * scale)

        // HiDPI pixel ratio for crisp text
        const pixelRatio = window.devicePixelRatio || 1
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
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('[PdfJsReader] Page render error:', err)
        }
        setPageRendering(false)
      }
    },
    [pdfDoc, scale, onPageChange]
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
    }
  }

  const handleNextPage = () => {
    if (pdfDoc && currentPage < totalPages) {
      const next = currentPage + 1
      setCurrentPage(next)
      setPageInputVal(String(next))
    }
  }

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseInt(pageInputVal, 10)
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      setCurrentPage(parsed)
    } else {
      setPageInputVal(String(currentPage))
    }
  }

  // Zoom handlers
  const handleZoomIn = () => setScale((prev) => Math.min(2.5, +(prev + 0.2).toFixed(1)))
  const handleZoomOut = () => setScale((prev) => Math.max(0.6, +(prev - 0.2).toFixed(1)))
  const handleResetZoom = () => setScale(1.0)

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

  // Offline Download Handler
  const handleDownloadForOffline = async () => {
    if (isOfflineReady || isDownloading) return

    setIsDownloading(true)
    setDownloadProgress(0)

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
      setIsOfflineReady(true)
      setIsDownloading(false)
    } catch (err) {
      console.error('[PdfJsReader] Download failed:', err)
      alert('Download failed. Please check your internet connection and try again.')
      setIsDownloading(false)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'ArrowLeft') handlePrevPage()
      else if (e.key === 'ArrowRight') handleNextPage()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, totalPages])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex flex-col bg-[#061e16] text-[#f4efe6] select-none overflow-hidden"
    >
      {/* Top Navigation & Toolbar Bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-3 md:px-6 py-2.5 bg-[#0a2e23] border-b border-[#1b4332]/60 shadow-md">
        {/* Left: Back Button & Title */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#144233] hover:bg-[#1a5340] active:scale-95 transition-all text-xs md:text-sm font-semibold text-[#f5f0e6] shadow-sm border border-[#235845]"
            title="Return to previous section"
          >
            <ArrowLeft className="w-4 h-4 text-[#e6c687]" />
            <span className="hidden sm:inline">{backButtonLabel}</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="min-w-0">
            <h1 className="text-sm md:text-base font-bold text-[#f5f0e6] truncate flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#e6c687] flex-shrink-0" />
              <span className="truncate">{title}</span>
            </h1>
            {subtitle && (
              <p className="text-[10px] md:text-xs text-[#a0c4b2] truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right: Zoom, Fullscreen, and Offline Download Controls */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Zoom Controls (hidden on ultra-small screens) */}
          <div className="hidden sm:flex items-center bg-[#144233] rounded-lg p-0.5 border border-[#235845]">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.6}
              className="p-1.5 text-[#e6c687] hover:text-white disabled:opacity-40 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 text-xs font-mono font-medium text-[#f5f0e6] hover:text-[#e6c687] transition-colors"
              title="Reset Zoom to 100%"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={scale >= 2.5}
              className="p-1.5 text-[#e6c687] hover:text-white disabled:opacity-40 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-[#144233] hover:bg-[#1a5340] text-[#e6c687] border border-[#235845] transition-all"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Offline Ready / Download Button */}
          {isOfflineReady ? (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0e3b2e] text-[#55d6a0] border border-[#1d6b4f] text-xs font-medium"
              title="Available offline without internet"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#55d6a0]" />
              <span className="hidden md:inline">Offline Ready</span>
            </div>
          ) : isDownloading ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1b4332] text-xs font-medium text-[#e6c687] border border-[#2d6a4f]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#e6c687]" />
              <span>{downloadProgress}%</span>
            </div>
          ) : (
            <button
              onClick={handleDownloadForOffline}
              className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg bg-[#1a5340] hover:bg-[#236850] active:scale-95 text-xs font-semibold text-[#f5f0e6] border border-[#31785e] transition-all shadow-sm"
              title="Download for offline access"
            >
              <Download className="w-3.5 h-3.5 text-[#e6c687]" />
              <span className="hidden sm:inline">Save Offline</span>
            </button>
          )}
        </div>
      </header>

      {/* Target Word Highlight Pill (If opened from 600 words) */}
      {targetWord && (
        <div className="flex-shrink-0 bg-[#0e3b2e] border-b border-[#235845] px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded bg-[#e6c687] text-[#061e16] font-bold text-[11px]">
              Word #{targetWord.id}
            </span>
            <span className="font-arabic text-sm text-[#e6c687]">{targetWord.arabic}</span>
            <span className="text-[#f5f0e6] font-semibold truncate">({targetWord.transliteration})</span>
            <span className="text-[#a0c4b2] truncate hidden sm:inline">— {targetWord.meaning}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onToggleBookmark && (
              <button
                onClick={() => onToggleBookmark(targetWord.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition ${
                  isBookmarked
                    ? 'bg-[#e6c687] text-[#061e16] border-[#e6c687]'
                    : 'bg-[#144233] text-[#e6c687] border-[#235845] hover:bg-[#1a5340]'
                }`}
              >
                <Bookmark className="w-3 h-3" fill={isBookmarked ? 'currentColor' : 'none'} />
                <span className="hidden sm:inline">{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
              </button>
            )}

            {onToggleLearned && (
              <button
                onClick={() => onToggleLearned(targetWord.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition ${
                  isLearned
                    ? 'bg-[#1d7355] text-white border-[#27916c]'
                    : 'bg-[#144233] text-[#a0c4b2] border-[#235845] hover:bg-[#1a5340]'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span className="hidden sm:inline">{isLearned ? 'Learned' : 'Mark Learned'}</span>
              </button>
            )}
          </div>
        </div>
      )}


      {/* Main Canvas Scrollable Area */}
      <main className="flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4 bg-[#041510] relative">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#041510]/80 z-20 backdrop-blur-xs">
            <div className="w-12 h-12 rounded-full border-3 border-[#1b4332] border-t-[#e6c687] animate-spin mb-3" />
            <p className="text-sm font-medium text-[#f5f0e6]">Streaming Quran from Supabase...</p>
            <p className="text-xs text-[#a0c4b2] mt-1">Byte-range on-demand loading</p>
          </div>
        )}

        {errorMessage && (
          <div className="max-w-md p-6 bg-[#1a2d26] border border-red-500/30 rounded-xl text-center shadow-lg">
            <p className="text-red-400 font-semibold mb-2">Error Loading Document</p>
            <p className="text-xs text-[#a0c4b2] mb-4">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-[#144233] text-sm text-[#e6c687] hover:bg-[#1b5542] border border-[#235845]"
            >
              Retry
            </button>
          </div>
        )}

        <div className="relative flex justify-center items-center shadow-2xl rounded-sm overflow-hidden bg-[#0a231b] border border-[#1b4332]/40">
          <canvas ref={canvasRef} className="block max-w-full h-auto transition-opacity duration-150" />
          {pageRendering && !isLoading && (
            <div className="absolute top-3 right-3 bg-[#0a2e23]/90 text-[#e6c687] px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-md border border-[#235845]">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Rendering...</span>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Floating Navigation & Pagination Bar */}
      <footer className="flex-shrink-0 flex items-center justify-between px-3 md:px-8 py-2.5 bg-[#0a2e23] border-t border-[#1b4332]/60 shadow-lg">
        {/* Previous Page */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage <= 1 || isLoading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#144233] hover:bg-[#1a5340] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs md:text-sm font-medium text-[#f5f0e6] border border-[#235845]"
        >
          <ChevronLeft className="w-4 h-4 text-[#e6c687]" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Center: Page Slider & Direct Input */}
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
            className="w-24 sm:w-44 h-1.5 bg-[#144233] rounded-lg appearance-none cursor-pointer accent-[#e6c687]"
            title="Drag to browse pages"
          />

          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
            <span className="text-xs text-[#a0c4b2] hidden sm:inline">Page</span>
            <input
              type="text"
              value={pageInputVal}
              onChange={(e) => setPageInputVal(e.target.value)}
              onBlur={() => setPageInputVal(String(currentPage))}
              className="w-12 text-center text-xs sm:text-sm font-semibold bg-[#144233] border border-[#235845] rounded px-1 py-0.5 text-[#f5f0e6] focus:border-[#e6c687] focus:outline-none"
            />
            <span className="text-xs sm:text-sm text-[#a0c4b2]">/ {totalPages || '...'}</span>
          </form>
        </div>

        {/* Next Page */}
        <button
          onClick={handleNextPage}
          disabled={currentPage >= totalPages || isLoading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#144233] hover:bg-[#1a5340] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs md:text-sm font-medium text-[#f5f0e6] border border-[#235845]"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4 text-[#e6c687]" />
        </button>
      </footer>
    </div>
  )
}

export default PdfJsReader
