import React, { useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Search,
  Layers,
  ArrowUpDown,
  ArrowLeftRight,
  ZoomIn,
  ZoomOut,
  Bookmark,
  Plus,
  CheckCircle2,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  MoreVertical,
  X,
  FileText,
  RotateCcw,
} from 'lucide-react'
import { type OfflinePdfStatus } from '../services/offlineQuranService'
import { type QuranParaMeta } from '../data/quranParas'

export interface PdfReaderToolbarProps {
  title: string
  subtitle?: string
  resourceKey: 'quran-roman-urdu' | 'vocab-600-words'
  currentPage: number
  totalPages: number
  currentPara?: QuranParaMeta
  targetWord?: {
    id: number
    arabic: string
    transliteration: string
    meaning: string
    reference?: string
  }
  fitMode: 'page' | 'width'
  userZoom: number
  isFullscreen: boolean
  isCurrentPageBookmarked: boolean
  bookmarksCount: number
  offlineStatus: OfflinePdfStatus
  isDownloading: boolean
  downloadProgress: number
  backButtonLabel?: string
  onClose: () => void
  onOpenSearch: () => void
  onOpenParaSelector?: () => void
  onSetFitPage: () => void
  onSetFitWidth: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onOpenBookmarksDrawer: () => void
  onOpenAddBookmark: () => void
  onDownloadOffline: () => void
  onDeleteOffline: () => void
  onToggleFullscreen: () => void
}

export const PdfReaderToolbar: React.FC<PdfReaderToolbarProps> = ({
  title,
  subtitle,
  resourceKey,
  currentPage,
  totalPages,
  currentPara,
  targetWord,
  fitMode,
  userZoom,
  isFullscreen,
  isCurrentPageBookmarked,
  bookmarksCount,
  offlineStatus,
  isDownloading,
  downloadProgress,
  backButtonLabel = 'Back',
  onClose,
  onOpenSearch,
  onOpenParaSelector,
  onSetFitPage,
  onSetFitWidth,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOpenBookmarksDrawer,
  onOpenAddBookmark,
  onDownloadOffline,
  onDeleteOffline,
  onToggleFullscreen,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)

  // Subtitle calculation
  const computedSubtitle =
    resourceKey === 'quran-roman-urdu' && currentPara
      ? `Para ${currentPara.number} (${currentPara.name}) • Page ${currentPage} of ${totalPages || '...'}`
      : targetWord
      ? `Word #${targetWord.id} (${targetWord.transliteration}) • Page ${currentPage} of ${totalPages || '...'}`
      : subtitle || `Page ${currentPage} of ${totalPages || '...'}`

  return (
    <>
      <header
        className="flex-shrink-0 flex items-center justify-between px-2.5 sm:px-4 md:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-[#0C382B] via-[#092B21] to-[#0C382B] border-b border-[#E2B755]/20 shadow-md z-30 gap-2 min-h-[52px]"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 8px)',
        }}
      >
        {/* ======================================================== */}
        {/* LEFT: BACK BUTTON & TITLE (ALWAYS VISIBLE & UNCLIPPED)   */}
        {/* ======================================================== */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Back Button with 44px touch target */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 px-3 min-h-[44px] min-w-[44px] rounded-xl bg-[#E2B755] hover:bg-[#D4A33B] active:scale-95 transition text-xs sm:text-sm font-bold text-[#0C382B] border border-[#E2B755] shadow-xs cursor-pointer touch-target flex-shrink-0"
            title="Return to previous section"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">{backButtonLabel}</span>
          </button>

          {/* Title & Subtitle */}
          <div className="min-w-0 flex-1">
            <h1 className="text-xs sm:text-sm md:text-base font-bold text-white truncate flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E2B755] flex-shrink-0" />
              <span className="truncate">{title}</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-emerald-200/80 truncate">
              {computedSubtitle}
            </p>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT CONTROLS: MOBILE COMPACT VS DESKTOP EXPANDED       */}
        {/* ======================================================== */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0">
          {/* 1. Quick Search Button (Always directly accessible) */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 min-h-[44px] min-w-[44px] rounded-xl bg-[#124232] hover:bg-[#185340] active:scale-95 text-[#E2B755] border border-[#235845] text-xs font-semibold shadow-xs transition cursor-pointer touch-target flex-shrink-0"
            title="Search Quran by Surah, Para, Page, Ayah or Word (Ctrl+K or /)"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
            <span className="hidden md:inline">Search</span>
            <kbd className="hidden lg:inline text-[9px] px-1 py-0.5 rounded bg-black/40 text-emerald-200/80 border border-white/10 font-mono">
              ⌘K
            </kbd>
          </button>

          {/* 2. Bookmarks Trigger Button (Always directly accessible) */}
          <button
            type="button"
            onClick={onOpenBookmarksDrawer}
            className="relative flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#124232] hover:bg-[#185340] text-[#E2B755] border border-[#235845] active:scale-95 transition cursor-pointer touch-target flex-shrink-0"
            title="View saved bookmarks"
            aria-label="Bookmarks"
          >
            <Bookmark className="w-4 h-4" fill={isCurrentPageBookmarked ? 'currentColor' : 'none'} />
            {bookmarksCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E2B755] text-[#051A13] text-[10px] font-bold flex items-center justify-center shadow-xs">
                {bookmarksCount}
              </span>
            )}
          </button>

          {/* ======================================================== */}
          {/* DESKTOP-ONLY INLINE CONTROLS (HIDDEN ON MOBILE < 768px)  */}
          {/* ======================================================== */}
          <div className="hidden md:flex items-center gap-1.5 md:gap-2">
            {/* Dedicated Para / Juz Selector (Quran only) */}
            {resourceKey === 'quran-roman-urdu' && onOpenParaSelector && currentPara && (
              <button
                type="button"
                onClick={onOpenParaSelector}
                className="flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl bg-[#124232] hover:bg-[#185340] active:scale-95 text-[#E2B755] border border-[#235845] text-xs font-semibold shadow-xs transition cursor-pointer touch-target"
                title="Select Para / Juz (1 to 30)"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Para {currentPara.number}</span>
              </button>
            )}

            {/* Fit Page / Fit Width Mode Switcher */}
            <div className="flex items-center bg-[#124232] rounded-xl p-0.5 border border-[#235845]">
              <button
                type="button"
                onClick={onSetFitPage}
                className={`flex items-center gap-1 px-2.5 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold transition cursor-pointer touch-target ${
                  fitMode === 'page' && userZoom === 1.0
                    ? 'bg-[#E2B755] text-[#051A13] font-bold shadow-xs'
                    : 'text-[#A0C4B2] hover:text-white'
                }`}
                title="Fit Full Page (Display entire page with all margins)"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Fit Page</span>
              </button>
              <button
                type="button"
                onClick={onSetFitWidth}
                className={`flex items-center gap-1 px-2.5 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold transition cursor-pointer touch-target ${
                  fitMode === 'width' && userZoom === 1.0
                    ? 'bg-[#E2B755] text-[#051A13] font-bold shadow-xs'
                    : 'text-[#A0C4B2] hover:text-white'
                }`}
                title="Fit to Width (Fills screen horizontally for easy reading)"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Fit Width</span>
              </button>
            </div>

            {/* Zoom In / Out / Reset Controls */}
            <div className="flex items-center bg-[#124232] rounded-xl p-0.5 border border-[#235845]">
              <button
                type="button"
                onClick={onZoomOut}
                disabled={userZoom <= 0.5}
                className="p-2 min-h-[38px] min-w-[36px] flex items-center justify-center text-[#E2B755] hover:text-white disabled:opacity-40 transition cursor-pointer"
                title="Zoom out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onResetZoom}
                className="px-2 py-1 min-h-[38px] flex items-center justify-center text-xs font-mono font-bold text-white hover:text-[#E2B755] transition cursor-pointer"
                title="Reset Zoom to 100%"
              >
                {Math.round(userZoom * 100)}%
              </button>
              <button
                type="button"
                onClick={onZoomIn}
                disabled={userZoom >= 3.5}
                className="p-2 min-h-[38px] min-w-[36px] flex items-center justify-center text-[#E2B755] hover:text-white disabled:opacity-40 transition cursor-pointer"
                title="Zoom in (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Add Bookmark Button */}
            <button
              type="button"
              onClick={onOpenAddBookmark}
              className={`p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition cursor-pointer touch-target ${
                isCurrentPageBookmarked
                  ? 'bg-[#E2B755] text-[#051A13] border-[#E2B755]'
                  : 'bg-[#124232] hover:bg-[#185340] text-[#E2B755] border-[#235845]'
              }`}
              title={isCurrentPageBookmarked ? 'Page is bookmarked' : 'Bookmark this page'}
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Offline Status / Download Pill */}
            {offlineStatus.isDownloaded ? (
              <div
                onClick={onDeleteOffline}
                className="flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl bg-[#0E3B2E] text-[#55D6A0] border border-[#1D6B4F] text-xs font-semibold cursor-pointer hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-800 transition touch-target"
                title="Downloaded offline. Click to manage/delete."
              >
                <CheckCircle2 className="w-4 h-4 text-[#55D6A0]" />
                <span>Saved Offline</span>
              </div>
            ) : isDownloading ? (
              <div className="flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl bg-[#1A4B3A] text-xs font-bold text-[#E2B755] border border-[#2D6A4F]">
                <Loader2 className="w-4 h-4 animate-spin text-[#E2B755]" />
                <span>{downloadProgress}%</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onDownloadOffline}
                className="flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl bg-[#1A5340] hover:bg-[#236850] active:scale-95 text-xs font-bold text-white border border-[#31785E] transition shadow-xs cursor-pointer touch-target"
                title="Download full PDF for permanent offline reading"
              >
                <Download className="w-4 h-4 text-[#E2B755]" />
                <span>Save Offline</span>
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#124232] hover:bg-[#185340] text-[#E2B755] border border-[#235845] transition cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {/* ======================================================== */}
          {/* MOBILE "MORE ACTIONS" BUTTON (< 768px)                   */}
          {/* ======================================================== */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(true)}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#124232] hover:bg-[#185340] active:scale-95 text-[#E2B755] border border-[#235845] transition cursor-pointer touch-target"
              title="More reader options (Zoom, View Mode, Offline, Bookmarks)"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MOBILE MORE OPTIONS BOTTOM SHEET / MODAL                 */}
      {/* ======================================================== */}
      {isMoreMenuOpen && (
        <div
          className="fixed inset-0 z-[100000] flex flex-col justify-end bg-black/75 backdrop-blur-xs animate-fade-in touch-manipulation"
          onClick={() => setIsMoreMenuOpen(false)}
        >
          <div
            className="w-full max-w-lg mx-auto bg-[#0A261D] text-[#FAF8F3] rounded-t-3xl border-t border-x border-[#1D4A3A] p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1A4B3A] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#E2B755]" />
                <h3 className="font-bold text-sm text-white">Reader Options</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(false)}
                className="w-9 h-9 rounded-full bg-[#124232] hover:bg-[#185340] text-[#A0C4B2] hover:text-white flex items-center justify-center transition cursor-pointer"
                aria-label="Close options"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Page View Mode */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#A0C4B2] uppercase tracking-wider">
                Display Mode
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSetFitPage()
                    setIsMoreMenuOpen(false)
                  }}
                  className={`flex items-center justify-center gap-2 p-3 min-h-[48px] rounded-xl text-xs font-bold border transition cursor-pointer ${
                    fitMode === 'page' && userZoom === 1.0
                      ? 'bg-[#E2B755] text-[#051A13] border-[#E2B755]'
                      : 'bg-[#124232] text-white border-[#235845] hover:bg-[#185340]'
                  }`}
                >
                  <ArrowUpDown className="w-4 h-4" />
                  <span>Fit Full Page</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSetFitWidth()
                    setIsMoreMenuOpen(false)
                  }}
                  className={`flex items-center justify-center gap-2 p-3 min-h-[48px] rounded-xl text-xs font-bold border transition cursor-pointer ${
                    fitMode === 'width' && userZoom === 1.0
                      ? 'bg-[#E2B755] text-[#051A13] border-[#E2B755]'
                      : 'bg-[#124232] text-white border-[#235845] hover:bg-[#185340]'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Fit to Width</span>
                </button>
              </div>
            </div>

            {/* 2. Zoom Controls */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#A0C4B2] uppercase tracking-wider">
                <span>Zoom Level</span>
                <span className="text-white font-mono">{Math.round(userZoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-2 bg-[#124232] rounded-xl p-1.5 border border-[#235845]">
                <button
                  type="button"
                  onClick={onZoomOut}
                  disabled={userZoom <= 0.5}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] rounded-lg bg-[#0E382B] text-[#E2B755] font-bold text-xs disabled:opacity-40 transition cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                  <span>Zoom Out</span>
                </button>
                <button
                  type="button"
                  onClick={onResetZoom}
                  className="px-3 py-2.5 min-h-[44px] flex items-center justify-center rounded-lg bg-[#0E382B] text-white font-bold text-xs hover:text-[#E2B755] transition cursor-pointer"
                  title="Reset to 100%"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onZoomIn}
                  disabled={userZoom >= 3.5}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] rounded-lg bg-[#0E382B] text-[#E2B755] font-bold text-xs disabled:opacity-40 transition cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                  <span>Zoom In</span>
                </button>
              </div>
            </div>

            {/* 3. Bookmark Current Page */}
            <button
              type="button"
              onClick={() => {
                setIsMoreMenuOpen(false)
                onOpenAddBookmark()
              }}
              className={`w-full flex items-center justify-center gap-2 p-3 min-h-[48px] rounded-xl text-xs font-bold border transition cursor-pointer ${
                isCurrentPageBookmarked
                  ? 'bg-[#E2B755] text-[#051A13] border-[#E2B755]'
                  : 'bg-[#124232] text-[#E2B755] border-[#235845] hover:bg-[#185340]'
              }`}
            >
              <Bookmark className="w-4 h-4" fill={isCurrentPageBookmarked ? 'currentColor' : 'none'} />
              <span>{isCurrentPageBookmarked ? 'Page is Bookmarked ✓' : 'Bookmark This Page'}</span>
            </button>

            {/* 4. Para / Juz Selector (Quran only) */}
            {resourceKey === 'quran-roman-urdu' && onOpenParaSelector && currentPara && (
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false)
                  onOpenParaSelector()
                }}
                className="w-full flex items-center justify-center gap-2 p-3 min-h-[48px] rounded-xl bg-[#124232] hover:bg-[#185340] text-[#E2B755] border border-[#235845] text-xs font-bold transition cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Select Para / Juz (Current: Para {currentPara.number} - {currentPara.name})</span>
              </button>
            )}

            {/* 5. Offline Storage Download / Management */}
            {offlineStatus.isDownloaded ? (
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false)
                  onDeleteOffline()
                }}
                className="w-full flex items-center justify-center gap-2 p-3 min-h-[48px] rounded-xl bg-[#0E3B2E] text-[#55D6A0] hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-800 border border-[#1D6B4F] text-xs font-bold transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-[#55D6A0]" />
                <span>Saved Offline (Tap to Remove from Device)</span>
              </button>
            ) : isDownloading ? (
              <div className="w-full flex items-center justify-center gap-2 p-3 min-h-[48px] rounded-xl bg-[#1A4B3A] text-xs font-bold text-[#E2B755] border border-[#2D6A4F]">
                <Loader2 className="w-4 h-4 animate-spin text-[#E2B755]" />
                <span>Downloading PDF ({downloadProgress}%)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false)
                  onDownloadOffline()
                }}
                className="w-full flex items-center justify-center gap-2 p-3 min-h-[48px] rounded-xl bg-[#1A5340] hover:bg-[#236850] text-white border border-[#31785E] text-xs font-bold transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#E2B755]" />
                <span>Download Full PDF for Permanent Offline Use</span>
              </button>
            )}

            {/* 6. Fullscreen */}
            <button
              type="button"
              onClick={() => {
                setIsMoreMenuOpen(false)
                onToggleFullscreen()
              }}
              className="w-full flex items-center justify-center gap-2 p-3 min-h-[48px] rounded-xl bg-[#124232] hover:bg-[#185340] text-[#A0C4B2] border border-[#235845] text-xs font-bold transition cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span>{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Mode'}</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
