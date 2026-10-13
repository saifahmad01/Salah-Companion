import React from 'react'
import { LogOut, ShieldCheck, X, Loader2 } from 'lucide-react'

interface SignOutConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => Promise<void> | void
  onConfirmSignOut?: () => Promise<void> | void
  userName?: string
  isLoading?: boolean
  error?: string | null
}

/**
 * Islamic-themed Sign Out Confirmation Dialog
 * Adheres strictly to Salah Companion design system and UX requirements:
 * - Title: "Are you sure you want to sign out?"
 * - Description: "You will need to sign in again to access your Salah Companion account."
 * - Buttons: "Cancel" and "Sign Out" with loading indicator and duplicate-click protection
 * - Assures user that their prayer records remain safely preserved in the database
 */
export const SignOutConfirmationModal: React.FC<SignOutConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onConfirmSignOut,
  userName,
  isLoading: propLoading = false,
  error: propError = null,
}) => {
  const [internalLoading, setInternalLoading] = React.useState(false)
  const [internalError, setInternalError] = React.useState<string | null>(null)

  const isLoading = propLoading || internalLoading
  const error = propError || internalError

  const handleExecuteSignOut = async () => {
    if (isLoading) return
    setInternalLoading(true)
    setInternalError(null)
    try {
      const fn = onConfirmSignOut || onConfirm
      if (fn) {
        await fn()
      }
    } catch (err: any) {
      setInternalError(err?.message || 'Failed to sign out. Please try again.')
      setInternalLoading(false)
    }
  }
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-sans select-none"
      onClick={() => {
        if (!isLoading) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signout-modal-title"
    >
      <div
        className="w-full max-w-md bg-[#FAF7EE] rounded-3xl p-6 sm:p-7 border border-[#E4D9C7] shadow-2xl text-[#132A1F] relative space-y-5 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#EAE2D0] hover:bg-[#DCD0BB] flex items-center justify-center text-[#5D6F66] hover:text-[#122A20] transition cursor-pointer disabled:opacity-50 touch-manipulation"
          aria-label="Cancel and close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Islamic Header Emblem */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0C4535] to-[#061F17] border border-amber-400/40 shadow-lg flex items-center justify-center text-amber-300">
            <LogOut className="w-8 h-8 text-rose-300" />
          </div>

          <p className="text-xs font-serif text-[#B58728] tracking-widest uppercase font-semibold">
            فِي أَمَانِ اللَّهِ • Fi Amanillah
          </p>

          <h3
            id="signout-modal-title"
            className="font-serif font-bold text-xl sm:text-2xl text-[#122A20] leading-snug"
          >
            Are you sure you want to sign out?
          </h3>

          <p className="text-xs sm:text-sm text-[#5D6F66] leading-relaxed max-w-xs">
            {userName ? `Salam, ${userName.split(' ')[0]}. ` : ''}You will need to sign in again to access your Salah Companion account.
          </p>
        </div>

        {/* Error Feedback if logout fails */}
        {error && (
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 text-center animate-fade-in font-medium">
            {error}
          </div>
        )}

        {/* Data Preservation Assurance Notice */}
        <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50/90 rounded-2xl border border-emerald-200/90 text-xs text-emerald-950 text-left">
          <ShieldCheck className="w-4.5 h-4.5 text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Prayer records safe:</strong> Signing out will not delete your account, completed Salah logs, or streaks. Your worship history is safely preserved.
          </p>
        </div>

        {/* Action Buttons: Cancel vs Sign Out */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-[#EAE2D0] hover:bg-[#DFD5BE] text-[#122A20] border border-[#D5C9B5] transition active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 touch-manipulation"
          >
            <span>Cancel</span>
          </button>

          <button
            type="button"
            onClick={handleExecuteSignOut}
            disabled={isLoading}
            className="py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:shadow-lg transition active:scale-[0.98] cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5 touch-manipulation"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Signing Out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4 text-white" />
                <span>Sign Out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
