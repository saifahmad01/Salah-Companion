import React, { useEffect } from 'react'
import { AlertTriangle, LogOut, X, ShieldAlert } from 'lucide-react'

export interface ExitModalConfig {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'unsaved' | 'logout' | 'navigation'
  hasUnsaved?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ExitConfirmationModal: React.FC<ExitModalConfig> = ({
  isOpen,
  title,
  message,
  confirmText = 'Leave Page',
  cancelText = 'Stay on Page',
  type = 'unsaved',
  hasUnsaved = false,
  onConfirm,
  onCancel,
}) => {
  // Trap Escape key for accessibility
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const isLogout = type === 'logout'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-modal-title"
      aria-describedby="exit-modal-description"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-[440px] bg-[#FAF8F3] rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-2xl border border-stone-200/90 p-5 sm:p-6 animate-scale-up text-[#14261E]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E9E4D8]">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                isLogout && !hasUnsaved
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isLogout && !hasUnsaved ? (
                <LogOut className="w-5 h-5" />
              ) : hasUnsaved ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 id="exit-modal-title" className="text-base sm:text-[17px] font-bold text-[#14261E] leading-tight">
                {title}
              </h3>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[#8E5B36]">
                {isLogout ? 'Account Session' : 'Unsaved Changes Warning'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Content */}
        <div className="py-4 space-y-3">
          <p id="exit-modal-description" className="text-xs sm:text-sm text-[#4A5D53] leading-relaxed">
            {message}
          </p>

          {hasUnsaved && (
            <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Notice on Browser Tab Close &amp; Refresh</span>
              </div>
              <p className="text-amber-800/90 leading-relaxed">
                If you close the tab or reload the window, your browser will display its native prompt to prevent accidental data loss.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 font-semibold text-xs sm:text-sm transition cursor-pointer active:scale-98 text-center shadow-xs"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition shadow-sm cursor-pointer active:scale-98 flex items-center justify-center gap-1.5 text-white ${
              isLogout
                ? 'bg-rose-700 hover:bg-rose-800'
                : 'bg-[#B45309] hover:bg-[#92400E]'
            }`}
          >
            {isLogout ? <LogOut className="w-3.5 h-3.5" /> : null}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
