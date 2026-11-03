import React, { useState, useMemo } from 'react'
import { X, Layers, Search, Bookmark, ChevronRight } from 'lucide-react'
import { QURAN_PARAS, type QuranParaMeta } from '../data/quranParas'

export interface QuranParaModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectPara: (para: QuranParaMeta) => void
  currentPage?: number
  onBookmarkPara?: (para: QuranParaMeta) => void
}

export const QuranParaModal: React.FC<QuranParaModalProps> = ({
  isOpen,
  onClose,
  onSelectPara,
  currentPage,
  onBookmarkPara,
}) => {
  const [filterQuery, setFilterQuery] = useState('')

  const filteredParas = useMemo(() => {
    if (!filterQuery.trim()) return QURAN_PARAS
    const q = filterQuery.toLowerCase().trim()
    return QURAN_PARAS.filter((p) => {
      const matchNum = p.number.toString() === q
      const matchName = p.name.toLowerCase().includes(q)
      const matchRoman = p.romanUrduName.toLowerCase().includes(q)
      const matchArabic = p.arabicName.includes(filterQuery.trim())
      const matchSurah = p.startSurahName.toLowerCase().includes(q)
      return matchNum || matchName || matchRoman || matchArabic || matchSurah
    })
  }, [filterQuery])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in touch-manipulation">
      <div className="w-full max-w-2xl bg-[#092B21] text-[#FAF8F3] rounded-3xl shadow-2xl border border-[#1C5441] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#062018] border-b border-[#1C5441] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#124232] text-[#E2B755] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-white">Select Para / Juz (پارہ)</h3>
              <p className="text-[11px] text-[#A0C4B2]">30 Paras of the Holy Qur'an with verified page mappings</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#A0C4B2] hover:text-white rounded-xl hover:bg-[#124232] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Input */}
        <div className="p-3 bg-[#08261D] border-b border-[#1C5441]/60">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#E2B755] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter by Para # (1-30), name, or starting Surah..."
              className="w-full pl-9 pr-3 py-2 bg-[#0E3527] border border-[#235845] rounded-xl text-xs text-white placeholder-stone-400 focus:outline-none focus:border-[#E2B755]"
            />
          </div>
        </div>

        {/* Paras List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 no-scrollbar">
          {filteredParas.map((para) => {
            const isCurrent =
              currentPage !== undefined &&
              currentPage >= para.startPage &&
              currentPage <= para.endPage

            return (
              <div
                key={para.number}
                className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                  isCurrent
                    ? 'bg-[#124232] border-[#E2B755] shadow-sm'
                    : 'bg-[#0E3527] border-[#235845] hover:border-[#E2B755]/60'
                }`}
              >
                <div
                  onClick={() => {
                    onSelectPara(para)
                    onClose()
                  }}
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                >
                  {/* Para Number Badge */}
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      isCurrent
                        ? 'bg-[#E2B755] text-[#051A13] shadow-xs'
                        : 'bg-[#062018] text-[#E2B755] border border-[#235845]'
                    }`}
                  >
                    #{para.number}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                        {para.name} <span className="text-stone-400 font-normal text-[11px]">({para.romanUrduName})</span>
                      </h4>
                      <span className="font-serif text-[#E2B755] text-sm flex-shrink-0">
                        {para.arabicName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#A0C4B2] truncate">
                      <span>Starts at {para.startSurahName} (v. {para.startAyah})</span>
                      <span>•</span>
                      <span className="font-mono font-bold text-amber-300">
                        Pages {para.startPage}–{para.endPage}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {onBookmarkPara && (
                    <button
                      type="button"
                      onClick={() => onBookmarkPara(para)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-[#E2B755] hover:bg-[#124232] transition cursor-pointer"
                      title="Bookmark this Para"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPara(para)
                      onClose()
                    }}
                    className="p-1.5 rounded-lg text-[#E2B755] hover:bg-[#124232] transition cursor-pointer flex items-center gap-0.5 text-xs font-semibold"
                  >
                    <span>Read</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
