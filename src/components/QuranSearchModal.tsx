import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  Search,
  X,
  BookOpen,
  Layers,
  Sparkles,
  ArrowRight,
  Hash,
  FileText,
} from 'lucide-react'
import {
  searchQuranIndex,
  searchVocabIndex,
  FAMOUS_AYAHS,
  type QuranSearchResult,
} from '../data/quranSearchIndex'
import { QURAN_PARAS } from '../data/quranParas'

export interface QuranSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectResult: (result: QuranSearchResult) => void
  resourceKey: 'quran-roman-urdu' | 'vocab-600-words'
  vocabWords?: any[]
  currentPage?: number
}

export const QuranSearchModal: React.FC<QuranSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult,
  resourceKey,
  vocabWords = [],
  currentPage,
}) => {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | 'surah' | 'para' | 'ayah' | 'page' | 'vocab'>('all')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setActiveCategory('all')
    }
  }, [isOpen])

  // Compute search results dynamically
  const rawResults = useMemo(() => {
    if (!query.trim()) return []

    if (resourceKey === 'vocab-600-words') {
      return searchVocabIndex(query, vocabWords, 40)
    }

    return searchQuranIndex(query, { maxResults: 35 })
  }, [query, resourceKey, vocabWords])

  // Filter results by active category tab
  const filteredResults = useMemo(() => {
    if (activeCategory === 'all') return rawResults
    return rawResults.filter((r) => r.type === activeCategory)
  }, [rawResults, activeCategory])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in touch-manipulation">
      <div className="w-full max-w-2xl bg-[#092B21] text-[#FAF8F3] rounded-3xl shadow-2xl border border-[#1C5441] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]">
        {/* Search Header Bar */}
        <div className="p-3 sm:p-4 bg-[#062018] border-b border-[#1C5441] flex items-center gap-2.5">
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 text-[#E2B755] absolute left-3 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                resourceKey === 'vocab-600-words'
                  ? 'Search by Arabic word, meaning, Roman Urdu, or Word #...'
                  : 'Search Surah, Para (1-30), Page (1-608), Ayah (e.g. 2:255), or Keyword...'
              }
              className="w-full pl-9 pr-8 py-2.5 bg-[#0E3527] border border-[#235845] rounded-2xl text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-[#E2B755] transition"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 p-1 rounded-full text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl text-[#A0C4B2] hover:text-white hover:bg-[#124232] transition cursor-pointer flex-shrink-0"
            title="Close Search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Category Chips (when results or query active) */}
        {resourceKey === 'quran-roman-urdu' && query.trim() && (
          <div className="px-3 sm:px-4 py-2 bg-[#08261D] border-b border-[#1C5441]/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Results' },
              { id: 'surah', label: 'Surahs' },
              { id: 'para', label: 'Paras / Juz' },
              { id: 'ayah', label: 'Ayahs' },
              { id: 'page', label: 'Pages' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-[#E2B755] text-[#051A13] font-bold shadow-xs'
                    : 'bg-[#0E3527] text-stone-300 hover:bg-[#154634]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Results Container / Empty Shortcuts Screen */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 no-scrollbar">
          {query.trim() === '' ? (
            /* Suggested Shortcuts & Highlights */
            <div className="space-y-4 py-1">
              {resourceKey === 'quran-roman-urdu' ? (
                <>
                  {/* Current Position Banner */}
                  {currentPage && (
                    <div className="p-3 rounded-2xl bg-[#0E3527]/70 border border-[#235845] flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span className="text-stone-300">Currently Reading:</span>
                        <strong className="text-white">Page {currentPage}</strong>
                      </div>
                      <span className="text-[11px] text-[#E2B755] font-semibold">In View</span>
                    </div>
                  )}

                  {/* Frequently Visited Surahs */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#A0C4B2] block mb-2">
                      Frequently Recited Surahs
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { num: 1, name: 'Al-Fatihah', page: 1, arabic: 'الفاتحة' },
                        { num: 18, name: 'Al-Kahf', page: 293, arabic: 'الكهف' },
                        { num: 36, name: 'Ya-Sin', page: 440, arabic: 'يس' },
                        { num: 55, name: 'Ar-Rahman', page: 531, arabic: 'الرحمن' },
                        { num: 56, name: 'Al-Waqiah', page: 534, arabic: 'الواقعة' },
                        { num: 67, name: 'Al-Mulk', page: 562, arabic: 'الملك' },
                        { num: 112, name: 'Al-Ikhlas', page: 604, arabic: 'الإخلاص' },
                        { num: 114, name: 'An-Nas', page: 604, arabic: 'الناس' },
                      ].map((s) => (
                        <button
                          key={s.num}
                          type="button"
                          onClick={() => {
                            onSelectResult({
                              id: `surah-${s.num}`,
                              type: 'surah',
                              title: `Surah #${s.num}: ${s.name}`,
                              arabicTitle: s.arabic,
                              subtitle: `Page ${s.page}`,
                              pageNumber: s.page,
                              surahNumber: s.num,
                              surahName: s.name,
                              badgeText: `PAGE ${s.page}`,
                              badgeColor: 'bg-[#0E543F] text-white',
                            })
                            onClose()
                          }}
                          className="p-2.5 rounded-xl bg-[#0E3527] border border-[#235845] hover:border-[#E2B755] text-left transition cursor-pointer group"
                        >
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-white group-hover:text-[#E2B755] truncate">
                              {s.name}
                            </span>
                            <span className="font-serif text-[#E2B755] text-[11px]">{s.arabic}</span>
                          </div>
                          <span className="text-[10px] text-stone-400 mt-1 block">Page {s.page}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Famous Ayahs */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#A0C4B2] block mb-2">
                      Special Verses & Duas
                    </span>
                    <div className="space-y-1.5">
                      {FAMOUS_AYAHS.slice(0, 5).map((f) => (
                        <div
                          key={f.title}
                          onClick={() => {
                            onSelectResult({
                              id: `famous-${f.surahNumber}-${f.ayahNumber}`,
                              type: 'ayah',
                              title: f.title,
                              arabicTitle: f.arabicTitle,
                              subtitle: `${f.surahName} (${f.surahNumber}:${f.ayahNumber}) • Page ${f.pageNumber}`,
                              pageNumber: f.pageNumber,
                              surahNumber: f.surahNumber,
                              surahName: f.surahName,
                              ayahNumber: f.ayahNumber,
                              badgeText: `AYAH ${f.surahNumber}:${f.ayahNumber}`,
                              badgeColor: 'bg-purple-700 text-white',
                            })
                            onClose()
                          }}
                          className="p-2.5 rounded-xl bg-[#0E3527] border border-[#235845] hover:border-[#E2B755] flex items-center justify-between gap-3 cursor-pointer transition group"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-3.5 h-3.5 text-[#E2B755] flex-shrink-0" />
                              <h4 className="font-bold text-xs text-white group-hover:text-[#E2B755] truncate">
                                {f.title}
                              </h4>
                            </div>
                            <p className="text-[11px] text-stone-400 mt-0.5 truncate">{f.meaning}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-[#124232] text-[#E2B755] text-[10.5px] font-bold border border-[#235845] flex-shrink-0">
                            Page {f.pageNumber}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 30 Paras / Juz Quick Access */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#A0C4B2] block mb-2">
                      Key Paras / Juz
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        QURAN_PARAS[0],
                        QURAN_PARAS[14], // Subhanallazi
                        QURAN_PARAS[21], // Wa May-Yaqnut
                        QURAN_PARAS[25], // Ha-Meem
                        QURAN_PARAS[28], // Tabarakallazi
                        QURAN_PARAS[29], // Amma
                      ].map((p) => (
                        <button
                          key={p.number}
                          type="button"
                          onClick={() => {
                            onSelectResult({
                              id: `para-${p.number}`,
                              type: 'para',
                              title: `Para ${p.number}: ${p.name}`,
                              arabicTitle: p.arabicName,
                              subtitle: `Page ${p.startPage}`,
                              pageNumber: p.startPage,
                              paraNumber: p.number,
                              paraName: p.name,
                              badgeText: `PARA ${p.number}`,
                              badgeColor: 'bg-amber-600 text-white',
                            })
                            onClose()
                          }}
                          className="p-2 rounded-xl bg-[#0E3527] border border-[#235845] hover:border-[#E2B755] text-left transition cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-xs text-white block">Juz {p.number}</span>
                            <span className="text-[10px] text-stone-400 block truncate">{p.name}</span>
                          </div>
                          <span className="text-xs font-serif text-[#E2B755]">{p.arabicName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Vocabulary Shortcuts */
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#A0C4B2] block mb-2">
                    Frequently Studied Quranic Words
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {vocabWords.slice(0, 8).map((w: any) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          onSelectResult({
                            id: `vocab-${w.id}`,
                            type: 'vocab',
                            title: `Word #${w.id}: ${w.transliteration} (${w.meaningEnglish || w.meaning})`,
                            arabicTitle: w.arabic,
                            subtitle: `Page ${w.pdfPage || w.pageIndex + 1} • Ref: ${w.surahAyahRef}`,
                            pageNumber: w.pdfPage || (w.pageIndex !== undefined ? w.pageIndex + 1 : 1),
                            badgeText: `WORD #${w.id}`,
                            badgeColor: 'bg-[#E2B755] text-[#0C382B]',
                            vocabData: w,
                          })
                          onClose()
                        }}
                        className="p-2.5 rounded-xl bg-[#0E3527] border border-[#235845] hover:border-[#E2B755] text-left transition cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-bold text-white block">
                            #{w.id} {w.transliteration}
                          </span>
                          <span className="text-[10.5px] text-stone-400 block truncate">
                            {w.meaningEnglish || w.meaning}
                          </span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-[#124232] text-[#E2B755] font-bold">
                          p. {w.pdfPage || w.pageIndex + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : filteredResults.length === 0 ? (
            /* No Results Found */
            <div className="text-center py-12 text-[#A0C4B2]">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#E2B755]" />
              <p className="font-bold text-white text-sm">No matches found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs mt-1 max-w-sm mx-auto text-stone-400">
                Try searching by exact page number (1-608), Para number (1-30), Surah name, or verse reference like &ldquo;2:255&rdquo;.
              </p>
            </div>
          ) : (
            /* Results List */
            <div className="space-y-2">
              {filteredResults.map((result) => {
                const IconComp =
                  result.type === 'surah'
                    ? BookOpen
                    : result.type === 'para'
                    ? Layers
                    : result.type === 'ayah'
                    ? Sparkles
                    : result.type === 'page'
                    ? Hash
                    : FileText

                return (
                  <div
                    key={result.id}
                    onClick={() => {
                      onSelectResult(result)
                      onClose()
                    }}
                    className="p-3 rounded-2xl bg-[#0E3527] border border-[#235845] hover:border-[#E2B755] transition flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#124232] text-[#E2B755] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <IconComp className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-[#E2B755] truncate">
                            {result.title}
                          </h4>
                          {result.arabicTitle && (
                            <span className="font-serif text-[#E2B755] text-xs flex-shrink-0">
                              {result.arabicTitle}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-[#A0C4B2] mt-0.5 truncate">{result.subtitle}</p>

                        {result.matchedText && (
                          <p className="text-[10.5px] text-amber-200/80 mt-1 line-clamp-1 italic">
                            &ldquo;{result.matchedText}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${result.badgeColor}`}>
                        {result.badgeText}
                      </span>
                      <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-[#E2B755] transition" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
