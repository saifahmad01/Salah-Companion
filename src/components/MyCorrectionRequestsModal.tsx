import React, { useState } from 'react'
import { X, Clock, CheckCircle2, XCircle, RefreshCw, Plus, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { salahApi, type SalahCorrectionRequestItem } from '../services/backendApi'
import { HistoricalCorrectionModal } from './HistoricalCorrectionModal'

interface MyCorrectionRequestsModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenNewRequest?: () => void
}

export const MyCorrectionRequestsModal: React.FC<MyCorrectionRequestsModalProps> = ({
  isOpen,
  onClose,
  onOpenNewRequest,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['my-correction-requests', filterStatus],
    queryFn: () => salahApi.getMyCorrectionRequests({ status: filterStatus === 'ALL' ? undefined : filterStatus }),
    enabled: isOpen,
    staleTime: 5000,
  })

  if (!isOpen) return null

  const rawRequests: SalahCorrectionRequestItem[] = data?.data?.requests || []
  const requests = rawRequests.filter((req) => !deletedIds.has(req.id))

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (deletingId) return
    try {
      setDeletingId(id)
      const res = await salahApi.deleteCorrectionRequest(id)
      if (res.success) {
        setDeletedIds((prev) => new Set(prev).add(id))
        setFeedbackMessage('Correction message deleted.')
        setTimeout(() => setFeedbackMessage(null), 3500)
        queryClient.invalidateQueries({ queryKey: ['my-correction-requests'] })
      } else {
        alert(res.message || 'Failed to delete message.')
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'Failed to delete message.'
      alert(errorMsg)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="relative w-full max-w-[520px] max-h-[90vh] flex flex-col bg-[#FAF8F3] rounded-[24px] sm:rounded-[28px] shadow-2xl border border-stone-200/90 animate-scale-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E9E4D8]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#0C4535] flex items-center justify-center flex-shrink-0">
                <Clock className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#14261E] leading-tight">
                  My Salah Correction Requests
                </h3>
                <p className="text-[11px] text-[#55675D]">
                  Track approval status of your past prayer adjustments
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onOpenNewRequest) {
                    onOpenNewRequest()
                  } else {
                    setIsCreatingNew(true)
                  }
                }}
                className="px-2.5 py-1 rounded-full bg-[#0C4535] hover:bg-[#093529] text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                title="Create a new historical prayer correction request"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Request</span>
              </button>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                title="Refresh requests"
                className="w-7 h-7 rounded-full bg-stone-200/60 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-stone-200/60 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-5 pt-3 pb-1 flex items-center gap-2 overflow-x-auto text-xs">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'PENDING_APPROVAL', label: 'Pending Review' },
              { id: 'APPROVED', label: 'Approved' },
              { id: 'REJECTED', label: 'Rejected' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                  filterStatus === tab.id
                    ? 'bg-[#0C4535] text-white shadow-xs'
                    : 'bg-stone-200/70 text-stone-700 hover:bg-stone-300/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Feedback message banner */}
          {feedbackMessage && (
            <div className="mx-4 sm:mx-5 mt-2.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium flex items-center justify-between animate-fade-in">
              <span>{feedbackMessage}</span>
              <button
                type="button"
                onClick={() => setFeedbackMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 cursor-pointer ml-2"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Content List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-stone-500 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mb-2 text-[#0C4535]" />
                <span>Loading correction requests...</span>
              </div>
            ) : isError ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-center">
                Failed to load correction requests. Please check your network.
              </div>
            ) : requests.length === 0 ? (
              <div className="py-12 text-center text-stone-500">
                <Clock className="w-8 h-8 mx-auto mb-2 text-stone-400 stroke-1" />
                <p className="text-xs font-semibold text-stone-700">No correction requests found</p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {filterStatus === 'ALL'
                    ? 'You can request corrections for past prayers here or by clicking any past prayer in the weekly tracker.'
                    : `No requests with status "${filterStatus.replace('_', ' ')}".`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenNewRequest) {
                      onOpenNewRequest()
                    } else {
                      setIsCreatingNew(true)
                    }
                  }}
                  className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0C4535] text-white text-xs font-bold shadow-xs hover:bg-[#093529] transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Submit a Correction Request</span>
                </button>
              </div>
            ) : (
              requests.map((req) => {
                const prayerDisplay = req.prayerName.charAt(0).toUpperCase() + req.prayerName.slice(1)
                const isPending = req.status === 'PENDING_APPROVAL'
                const isApproved = req.status === 'APPROVED'
                const isRejected = req.status === 'REJECTED'

                return (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#14261E] text-[13px]">{prayerDisplay} Salah</span>
                          <span className="text-[11px] text-stone-500 font-mono">• {req.prayerDate}</span>
                        </div>
                        <div className="text-[11px] text-stone-600 mt-0.5">
                          Requested: <span className="font-semibold text-stone-800 uppercase">{req.requestedStatus.replace('_', ' ')}</span>
                          {req.previousStatus && req.previousStatus !== 'none' && (
                            <span className="text-stone-400"> (was {req.previousStatus.replace('_', ' ')})</span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex-shrink-0">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-700" />
                            Pending Review
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px] border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 font-bold text-[10px] border border-rose-300">
                            <XCircle className="w-3 h-3 text-rose-700" />
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="p-2 rounded-xl bg-stone-50 border border-stone-100 text-[11px] text-stone-700">
                      <span className="font-semibold text-stone-500 block text-[10px] uppercase">Reason</span>
                      <p className="mt-0.5 leading-relaxed">{req.reason}</p>
                      {req.notes && (
                        <p className="mt-1 text-stone-500 italic text-[10.5px]">Note: {req.notes}</p>
                      )}
                    </div>

                    {/* Rejection notice if rejected */}
                    {isRejected && req.rejectionReason && (
                      <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-900">
                        <div className="flex items-center gap-1 font-bold text-rose-800 text-[10px] uppercase">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Rejection Reason
                        </div>
                        <p className="mt-0.5 leading-relaxed">{req.rejectionReason}</p>
                      </div>
                    )}

                    {/* Footer metadata & Delete option */}
                    <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-[10px] text-stone-400">
                      <div className="flex items-center gap-2">
                        <span>Submitted: {new Date(req.createdAt).toLocaleDateString()}</span>
                        {req.reviewedAt && (
                          <span>• Reviewed: {new Date(req.reviewedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                      {!isPending && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(req.id, e)}
                          disabled={deletingId === req.id}
                          className="inline-flex items-center gap-1 text-[10.5px] font-medium text-stone-400 hover:text-rose-600 hover:bg-rose-50 px-2 py-0.5 rounded transition cursor-pointer disabled:opacity-50"
                          title="Delete message from inbox"
                        >
                          {deletingId === req.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {isCreatingNew && (
        <HistoricalCorrectionModal
          isOpen={true}
          onClose={() => setIsCreatingNew(false)}
          onSuccess={() => {
            setIsCreatingNew(false)
            refetch()
          }}
        />
      )}
    </>
  )
}
