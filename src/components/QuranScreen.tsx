import React, { useState, useEffect, useMemo } from 'react'
import {
  ChevronLeft,
  BookOpen,
  Search,
  Bookmark,
  CheckCircle2,
  Download,
  Trash2,
  Sparkles,
  Eye,
  FileText,
} from 'lucide-react'
import {
  QURAN_VOCABULARY_600,
  VOCABULARY_CATEGORIES,
  VOCABULARY_DIFFICULTIES,
} from '../data/quranVocabulary'
import {
  offlineQuranService,
  type QuranReadingProgress,
} from '../services/offlineQuranService'
import { device } from '../platform/device'

interface QuranScreenProps {
  onBack: () => void
  onOpenHadithView?: () => void
}

export const QuranScreen: React.FC<QuranScreenProps> = ({ onBack, onOpenHadithView }) => {
  const [activeTab, setActiveTab] = useState<'vocabulary' | 'reader'>('vocabulary')

  // Vocabulary search & filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All')
  const [onlyBookmarked, setOnlyBookmarked] = useState(false)
  const [onlyLearned, setOnlyLearned] = useState(false)
  const [wordProgressMap, setWordProgressMap] = useState(() =>
    offlineQuranService.getWordProgressMap()
  )

  // Reader state
  const [readingProgress] = useState<QuranReadingProgress>(() =>
    offlineQuranService.getReadingProgress()
  )
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false)
  const [isDownloading, setIsDownloading] = useState<boolean>(false)
  const [downloadPercent, setDownloadPercent] = useState<number>(0)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    offlineQuranService.isQuranDownloaded().then(setIsDownloaded)
  }, [])

  const handleToggleLearned = (wordId: number) => {
    const isLearned = !wordProgressMap[wordId]?.isLearned
    const updated = offlineQuranService.updateWordProgress(wordId, { isLearned })
    setWordProgressMap({ ...updated })
    device.hapticFeedback('light')
  }

  const handleToggleBookmark = (wordId: number) => {
    const isBookmarked = !wordProgressMap[wordId]?.isBookmarked
    const updated = offlineQuranService.updateWordProgress(wordId, { isBookmarked })
    setWordProgressMap({ ...updated })
    device.hapticFeedback('light')
  }

  const filteredWords = useMemo(() => {
    return QURAN_VOCABULARY_600.filter((word) => {
      // Category filter
      if (selectedCategory !== 'All' && word.category !== selectedCategory) return false

      // Difficulty filter
      if (selectedDifficulty !== 'All' && word.difficulty !== selectedDifficulty) return false

      // Progress filters
      const p = wordProgressMap[word.id]
      if (onlyBookmarked && !p?.isBookmarked) return false
      if (onlyLearned && !p?.isLearned) return false

      // Text search
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        word.arabic.includes(q) ||
        word.transliteration.toLowerCase().includes(q) ||
        word.meaning.toLowerCase().includes(q) ||
        word.surahAyahRef.toLowerCase().includes(q)
      )
    })
  }, [searchQuery, selectedCategory, selectedDifficulty, onlyBookmarked, onlyLearned, wordProgressMap])

  const learnedCount = Object.values(wordProgressMap).filter((p) => p.isLearned).length
  const bookmarkedCount = Object.values(wordProgressMap).filter((p) => p.isBookmarked).length

  // Start on-demand Quran PDF download
  const handleDownloadQuran = async () => {
    setIsDownloading(true)
    setDownloadError(null)
    setDownloadPercent(0)

    try {
      const pdfUrl = '/Quran Roman Urdu Hindi .pdf'
      await offlineQuranService.downloadQuranPdf(pdfUrl, (percent) => {
        setDownloadPercent(percent)
      })
      setIsDownloaded(true)
      device.hapticFeedback('medium')
    } catch {
      setDownloadError('Download failed. Ensure a stable network connection.')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDeleteQuran = async () => {
    if (confirm('Remove downloaded Quran from offline storage?')) {
      await offlineQuranService.deleteDownloadedQuran()
      setIsDownloaded(false)
      setDownloadPercent(0)
    }
  }

  return (
    <div className="w-full pb-24 md:pb-10 animate-fade-in select-none">
      {/* Header Bar */}
      <div className="relative px-5 sm:px-6 lg:px-8 pt-4 pb-3 overflow-hidden border-b border-[#E8E4DA] bg-gradient-to-b from-[#0C382B] to-[#0A2D23] text-white">
        <div className="flex items-center justify-between pt-1 pb-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to home"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white active:scale-95 transition cursor-pointer touch-target"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="font-serif font-bold text-lg text-[#F6E6C2] tracking-wide">
              The Holy Quran
            </h1>
            <p className="text-[11px] text-emerald-200/80 font-medium">
              600 Vocabulary Words & Roman Urdu Reader
            </p>
          </div>
          {onOpenHadithView && (
            <button
              type="button"
              onClick={onOpenHadithView}
              className="px-2.5 py-1 rounded-full bg-[#E2B755] text-[#0C382B] text-xs font-bold shadow-xs hover:bg-[#D4A33B] transition cursor-pointer"
            >
              Hadith →
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => setActiveTab('vocabulary')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'vocabulary'
                ? 'bg-[#E2B755] text-[#0C382B] shadow-md'
                : 'bg-white/10 text-emerald-100 hover:bg-white/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>600 Words ({learnedCount}/600)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reader')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'reader'
                ? 'bg-[#E2B755] text-[#0C382B] shadow-md'
                : 'bg-white/10 text-emerald-100 hover:bg-white/20'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Offline Reader</span>
          </button>
        </div>
      </div>

      {/* TAB 1: 600 VOCABULARY WORDS */}
      {activeTab === 'vocabulary' && (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl p-3 shadow-xs border border-stone-200/80 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Arabic, transliteration or English meaning..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-stone-50 border border-stone-200 focus:outline-none focus:border-emerald-700 text-stone-900"
              />
            </div>

            {/* Difficulty & Category horizontal scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
              <span className="text-[11px] font-bold text-stone-500 uppercase flex-shrink-0">Difficulty:</span>
              {VOCABULARY_DIFFICULTIES.map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-2.5 py-0.5 rounded-full whitespace-nowrap font-semibold transition cursor-pointer text-[11px] ${
                    selectedDifficulty === diff
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {diff}
                </button>
              ))}

              <span className="text-stone-300 mx-1">|</span>

              <span className="text-[11px] font-bold text-stone-500 uppercase flex-shrink-0">Category:</span>
              {VOCABULARY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full whitespace-nowrap font-semibold transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#0C382B] text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Quick toggles */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyLearned(!onlyLearned)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                    onlyLearned ? 'bg-emerald-100 text-emerald-900' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Learned ({learnedCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyBookmarked(!onlyBookmarked)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                    onlyBookmarked ? 'bg-amber-100 text-amber-900' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                  <span>Saved ({bookmarkedCount})</span>
                </button>
              </div>

              <span className="text-stone-500 font-medium">
                Showing {filteredWords.length} words
              </span>
            </div>
          </div>

          {/* Words Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredWords.slice(0, 90).map((w) => {
              const isLearned = wordProgressMap[w.id]?.isLearned
              const isBookmarked = wordProgressMap[w.id]?.isBookmarked

              return (
                <div
                  key={w.id}
                  className={`p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
                    isLearned
                      ? 'bg-emerald-50/70 border-emerald-200/90'
                      : 'bg-white border-stone-200 hover:border-emerald-600/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                        #{w.id} • {w.category}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(w.id)}
                          aria-label="Bookmark word"
                          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-stone-100 text-stone-400 hover:text-amber-500 transition cursor-pointer"
                        >
                          <Bookmark
                            className={`w-4 h-4 ${
                              isBookmarked ? 'text-amber-500 fill-amber-500' : ''
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleLearned(w.id)}
                          aria-label="Mark word as learned"
                          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-stone-100 text-stone-400 hover:text-emerald-600 transition cursor-pointer"
                        >
                          <CheckCircle2
                            className={`w-4 h-4 ${
                              isLearned ? 'text-emerald-700 fill-emerald-100' : ''
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Arabic Word Display */}
                    <p className="font-amiri text-2xl text-right text-[#0C382B] font-bold py-1">
                      {w.arabic}
                    </p>

                    <div className="mt-1">
                      <p className="font-bold text-xs text-stone-800">{w.transliteration}</p>
                      <p className="text-xs text-stone-600 font-medium mt-0.5">{w.meaning}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                    <span className="font-mono text-[10px] text-emerald-800 font-semibold">
                      {w.surahAyahRef}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-stone-400">
                      {w.difficulty}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredWords.length > 90 && (
            <p className="text-center text-xs text-stone-500 py-3">
              Showing first 90 results. Use search or category filter to explore all 600 words.
            </p>
          )}
        </div>
      )}

      {/* TAB 2: OFFLINE QURAN & ROMAN URDU READER */}
      {activeTab === 'reader' && (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
          {/* Download & Offline Status Banner */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0C382B] p-2 flex items-center justify-center text-[#E2B755] flex-shrink-0 shadow-md">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Quran Roman Urdu Hindi PDF
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Full authenticated translation for offline study & recitation
                  </p>
                </div>
              </div>

              {isDownloaded ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Saved Offline</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleDeleteQuran}
                    title="Remove from storage"
                    className="w-9 h-9 rounded-xl border border-stone-200 text-stone-500 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={handleDownloadQuran}
                    disabled={isDownloading}
                    className="px-4 py-2 rounded-xl bg-[#0C382B] hover:bg-emerald-950 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50 touch-target"
                  >
                    <Download className="w-4 h-4 text-[#E2B755]" />
                    <span>{isDownloading ? `Downloading ${downloadPercent}%` : 'Download for Offline Use'}</span>
                  </button>
                </div>
              )}
            </div>

            {isDownloading && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-stone-600 mb-1 font-semibold">
                  <span>Downloading Quran file...</span>
                  <span>{downloadPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-[#E2B755] transition-all duration-200"
                    style={{ width: `${downloadPercent}%` }}
                  ></div>
                </div>
              </div>
            )}

            {downloadError && (
              <p className="text-xs text-red-600 font-semibold mt-2">{downloadError}</p>
            )}
          </div>

          {/* Reading Progress Card */}
          <div className="bg-[#FAF8F3] rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-stone-500">
                Last Reading Session
              </p>
              <h4 className="font-serif font-bold text-base text-emerald-950 mt-1">
                Surah {readingProgress.lastSurah} • Page {readingProgress.lastPage}
              </h4>
              <p className="text-xs text-stone-600 mt-0.5">
                Last read on {readingProgress.lastReadDate}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/Quran Roman Urdu Hindi .pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-[#0C382B] text-white font-bold text-xs shadow-xs hover:bg-emerald-950 transition flex items-center gap-1.5 cursor-pointer touch-target"
              >
                <Eye className="w-4 h-4 text-[#E2B755]" />
                <span>Open Reader</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
