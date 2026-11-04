import React, { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Check,
  X,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, type SalahCorrectionRequestItem } from '../../services/backendApi'

export const AdminCorrectionRequestsView: React.FC = () => {
  const queryClient = useQueryClient()
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING_APPROVAL')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  // Action modals state
  const [approvingItem, setApprovingItem] = useState<SalahCorrectionRequestItem | null>(null)
  const [adminNotes, setAdminNotes] = useState('')

  const [rejectingItem, setRejectingItem] = useState<SalahCorrectionRequestItem | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-correction-requests', selectedStatus, searchQuery, page],
    queryFn: () =>
      adminApi.getCorrectionRequests({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        q: searchQuery.trim() || undefined,
        page,
        limit: 25,
      }),
    staleTime: 5000,
  })

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      adminApi.approveCorrectionRequest(id, { adminNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-correction-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-prayers'] })
      setApprovingItem(null)
      setAdminNotes('')
      setActionError(null)
    },
    onError: (err: any) => {
      setActionError(err?.message || 'Failed to approve correction request.')
    },
  })

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.rejectCorrectionRequest(id, { rejectionReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-correction-requests'] })
      setRejectingItem(null)
      setRejectionReason('')
      setActionError(null)
    },
    onError: (err: any) => {
      setActionError(err?.message || 'Failed to reject correction request.')
    },
  })

  const requests: SalahCorrectionRequestItem[] = data?.data?.requests || []
  const summary = data?.data?.summary || { pending: 0, approved: 0, rejected: 0, totalAll: 0 }
  const totalPages = data?.data?.totalPages || 1

  return (
    <div className="space-y-4">
      {/* Top Banner / Summary */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#F7F4EB] border border-[#E5DECD] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#14261E]">Salah Historical Correction Requests</h2>
          <p className="text-xs text-[#55675D] mt-0.5">
            Review and adjudicate user requests to modify historical prayer records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold border border-stone-200 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { id: 'PENDING_APPROVAL', label: 'Pending Review', count: summary.pending, color: 'text-amber-800 bg-amber-50 border-amber-200' },
          { id: 'APPROVED', label: 'Approved', count: summary.approved, color: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
          { id: 'REJECTED', label: 'Rejected', count: summary.rejected, color: 'text-rose-800 bg-rose-50 border-rose-200' },
          { id: 'ALL', label: 'All Requests', count: summary.totalAll, color: 'text-stone-800 bg-stone-100 border-stone-200' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setSelectedStatus(tab.id)
              setPage(1)
            }}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
              selectedStatus === tab.id
                ? 'ring-2 ring-[#0C4535] shadow-xs ' + tab.color
                : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold">{tab.label}</span>
              <span className="text-sm font-bold font-mono">{tab.count}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Search by user name or email..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#0C4535] placeholder:text-stone-400"
          />
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-16 text-center text-stone-500 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0C4535]" />
            Loading correction requests...
          </div>
        ) : isError ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-center">
            Failed to load correction requests.
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center text-stone-500 bg-white rounded-2xl border border-stone-200 p-6">
            <Clock className="w-8 h-8 mx-auto mb-2 text-stone-400 stroke-1" />
            <p className="text-xs font-semibold text-stone-700">No requests match this filter</p>
          </div>
        ) : (
          requests.map((item) => {
            const prayerDisplay = item.prayerName.charAt(0).toUpperCase() + item.prayerName.slice(1)
            const isPending = item.status === 'PENDING_APPROVAL'
            const isApproved = item.status === 'APPROVED'
            const isRejected = item.status === 'REJECTED'

            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3 transition hover:border-stone-300"
              >
                {/* Header: User details + Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-stone-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600 font-bold text-xs uppercase flex-shrink-0">
                      {item.user?.name ? item.user.name.charAt(0) : 'U'}
                    </div>
                    <div>
                      <span className="font-bold text-stone-900 text-xs block">{item.user?.name || 'Unknown User'}</span>
                      <span className="text-[11px] text-stone-500 font-mono">{item.user?.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[10.5px] border border-amber-300">
                        <Clock className="w-3 h-3 text-amber-700" />
                        Pending Review
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10.5px] border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        Approved
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 font-bold text-[10.5px] border border-rose-300">
                        <XCircle className="w-3 h-3 text-rose-700" />
                        Rejected
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                    <span className="text-[10px] text-stone-500 uppercase font-bold block">Prayer & Target Date</span>
                    <span className="font-bold text-stone-900 text-xs">{prayerDisplay} Salah</span>
                    <span className="text-[11px] text-stone-600 font-mono block mt-0.5">{item.prayerDate}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                    <span className="text-[10px] text-stone-500 uppercase font-bold block">Status Transition</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-stone-200 text-stone-700 uppercase">
                        {item.previousStatus.replace('_', ' ')}
                      </span>
                      <span className="text-stone-400">➔</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#0C4535] text-white uppercase">
                        {item.requestedStatus.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                    <span className="text-[10px] text-stone-500 uppercase font-bold block">Submitted On</span>
                    <span className="text-[11px] text-stone-700 font-mono mt-0.5 block">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* User Reason */}
                <div className="p-2.5 rounded-xl bg-stone-50/80 border border-stone-200/70 text-xs">
                  <span className="text-[10.5px] font-bold text-stone-600 uppercase block">User's Stated Reason</span>
                  <p className="mt-0.5 text-stone-800 text-[11.5px] leading-relaxed">{item.reason}</p>
                  {item.notes && (
                    <p className="mt-1 text-stone-500 italic text-[11px]">Note: {item.notes}</p>
                  )}
                </div>

                {/* Rejection reason display if rejected */}
                {isRejected && item.rejectionReason && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                    <span className="text-[10.5px] font-bold text-rose-800 uppercase block">Admin Rejection Reason</span>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed">{item.rejectionReason}</p>
                  </div>
                )}

                {/* Reviewer info */}
                {item.reviewedAt && (
                  <div className="text-[10.5px] text-stone-400 flex items-center justify-between pt-1">
                    <span>Reviewed by: {item.reviewer?.name || item.reviewer?.email || 'Administrator'}</span>
                    <span>Reviewed on: {new Date(item.reviewedAt).toLocaleString()}</span>
                  </div>
                )}

                {/* Action buttons (only when PENDING) */}
                {isPending && (
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingItem(item)
                        setRejectionReason('')
                        setActionError(null)
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject Request</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setApprovingItem(item)
                        setAdminNotes('')
                        setActionError(null)
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0C4535] hover:bg-[#093529] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve Request</span>
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-xs font-semibold disabled:opacity-50 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs text-stone-600 font-mono">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-xs font-semibold disabled:opacity-50 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}

      {/* Approve Modal */}
      {approvingItem && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => !approveMutation.isPending && setApprovingItem(null)}
        >
          <div
            className="relative w-full max-w-[440px] bg-white rounded-2xl shadow-2xl border border-stone-200 p-5 space-y-3.5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="font-bold text-sm text-stone-900">Approve Correction Request</h3>
              <button
                type="button"
                onClick={() => setApprovingItem(null)}
                className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to approve updating <strong>{approvingItem.prayerName}</strong> on <strong>{approvingItem.prayerDate}</strong> to <strong>{approvingItem.requestedStatus.toUpperCase().replace('_', ' ')}</strong> for <strong>{approvingItem.user?.name}</strong>?
            </p>

            {actionError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {actionError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Admin Note <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="e.g. Verified with user"
                className="w-full px-3 py-1.5 text-xs bg-white rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#0C4535]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={approveMutation.isPending}
                onClick={() => setApprovingItem(null)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={approveMutation.isPending}
                onClick={() =>
                  approveMutation.mutate({
                    id: approvingItem.id,
                    notes: adminNotes.trim() || undefined,
                  })
                }
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#0C4535] hover:bg-[#093529] text-white shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {approveMutation.isPending ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingItem && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => !rejectMutation.isPending && setRejectingItem(null)}
        >
          <div
            className="relative w-full max-w-[440px] bg-white rounded-2xl shadow-2xl border border-stone-200 p-5 space-y-3.5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="font-bold text-sm text-stone-900">Reject Correction Request</h3>
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Historical prayer logs will remain unchanged. Please provide a clear rejection reason for the user.
            </p>

            {actionError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {actionError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Insufficient verification or conflicting log"
                className="w-full px-3 py-1.5 text-xs bg-white rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#0C4535]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={rejectMutation.isPending}
                onClick={() => setRejectingItem(null)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejectMutation.isPending || rejectionReason.trim().length < 3}
                onClick={() =>
                  rejectMutation.mutate({
                    id: rejectingItem.id,
                    reason: rejectionReason.trim(),
                  })
                }
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-700 hover:bg-rose-800 text-white shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
