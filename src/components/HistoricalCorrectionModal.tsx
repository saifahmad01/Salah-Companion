import React, { useState } from 'react'
import { X, Send, AlertCircle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react'
import { salahApi, type SalahCorrectionRequestItem } from '../services/backendApi'

interface HistoricalCorrectionModalProps {
  isOpen: boolean
  onClose: () => void
  prayerId: string
  prayerName: string
  prayerDate: string
  currentStatus: string
  onSuccess?: (request: SalahCorrectionRequestItem) => void
}

export const HistoricalCorrectionModal: React.FC<HistoricalCorrectionModalProps> = ({
  isOpen,
  onClose,
  prayerId,
  prayerName,
  prayerDate,
  currentStatus,
  onSuccess,
}) => {
  const [requestedStatus, setRequestedStatus] = useState<'on_time' | 'late' | 'qada' | 'missed'>('on_time')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const formattedDate = (() => {
    try {
      const [y, m, d] = prayerDate.split('-').map(Number)
      return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return prayerDate
    }
  })()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const trimmedReason = reason.trim()
    if (trimmedReason.length < 3) {
      setErrorMessage('Please provide a clear reason for the historical correction (at least 3 characters).')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await salahApi.submitCorrectionRequest({
        prayerName: prayerId,
        prayerDate,
        requestedStatus,
        reason: trimmedReason,
        notes: notes.trim() || undefined,
      })

      setSuccessMessage('Correction request submitted successfully! An administrator will review your request.')
      setTimeout(() => {
        if (onSuccess && res.data) {
          onSuccess(res.data)
        }
        onClose()
      }, 1600)
    } catch (err: any) {
      console.error('[HistoricalCorrectionModal] Submission failed:', err)
      setErrorMessage(err?.message || 'Failed to submit correction request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-[460px] max-h-[92vh] overflow-y-auto bg-[#FAF8F3] rounded-[24px] sm:rounded-[28px] shadow-2xl border border-stone-200/90 p-5 sm:p-6 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E9E4D8]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-[#14261E] leading-tight">
                Request Historical Salah Correction
              </h3>
              <p className="text-[11px] text-[#55675D]">
                Requires administrator verification before records change
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Read-only rule notice */}
        <div className="mt-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200/90 text-amber-950 text-xs flex items-start gap-2">
          <Clock className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <p className="text-[11.5px] leading-relaxed text-amber-900">
            <strong>Historical Integrity Rule:</strong> Past Salah records cannot be modified directly. Your submission will be queued for review, and your habit records will remain unchanged until an administrator approves your request.
          </p>
        </div>

        {/* Error / Success Feedback */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11.5px] leading-tight break-words">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11.5px] leading-tight">{successMessage}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Target Prayer Summary */}
          <div className="p-3 bg-stone-100/80 rounded-xl border border-stone-200/80 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10.5px] text-stone-500 block uppercase font-semibold">Prayer & Date</span>
              <span className="font-bold text-stone-800">{prayerName}</span>
              <span className="text-[11px] text-stone-600 block">{formattedDate}</span>
            </div>
            <div>
              <span className="text-[10.5px] text-stone-500 block uppercase font-semibold">Current Recorded Status</span>
              <span className="inline-block px-2 py-0.5 mt-0.5 text-[10px] font-bold rounded-md bg-stone-200 text-stone-800 uppercase">
                {currentStatus.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Requested Status */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1">
              Requested Status <span className="text-rose-500">*</span>
            </label>
            <select
              value={requestedStatus}
              onChange={(e) => setRequestedStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#0C4535]"
            >
              <option value="on_time">On Time (وقت پر ادا کی)</option>
              <option value="late">Late (تاخیر سے ادا کی)</option>
              <option value="qada">Qada (قضا ادا کی)</option>
              <option value="missed">Missed (قضا ہو گئی)</option>
            </select>
          </div>

          {/* Reason (Mandatory) */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1">
              Reason for Correction <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Offered prayer at masjid but forgot to record it on time"
              className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#0C4535] placeholder:text-stone-400"
            />
          </div>

          {/* Additional Notes (Optional) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Additional Notes <span className="text-stone-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Congregation at local masjid"
              className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#0C4535] placeholder:text-stone-400"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-stone-200/80 hover:bg-stone-300 text-stone-700 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0C4535] hover:bg-[#093529] text-white flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
