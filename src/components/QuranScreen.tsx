import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
  Plus,
  Calendar,
  Layers,
  History,
  Check,
  X,
  ArrowRight,
  TrendingUp,
  Info,
} from 'lucide-react'
import {
  QURAN_VOCABULARY_600,
  VOCABULARY_CATEGORIES,
  VOCABULARY_DIFFICULTIES,
  type QuranWord,
  type UserWordProgress,
} from '../data/quranVocabulary'
import { QURAN_SURAHS, type SurahMeta } from '../data/quranSurahs'
import {
  offlineQuranService,
  type QuranReadingProgress,
} from '../services/offlineQuranService'
import {
  salahApi,
  type QuranReadingSession,
  type QuranReadingDashboardData,
} from '../services/backendApi'
import { device } from '../platform/device'
import { QuranPdfModal } from './QuranPdfModal'

interface QuranScreenProps {
  onBack: () => void
  onOpenHadithView?: () => void
}

export const QuranScreen: React.FC<QuranScreenProps> = ({ onBack, onOpenHadithView }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'vocabulary' | 'reader'>('dashboard')

  // ===================== DASHBOARD / READING TRACKER STATE =====================
  const [dashboardData, setDashboardData] = useState<QuranReadingDashboardData | null>(null)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState<boolean>(true)
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false)
  const [isSubmittingLog, setIsSubmittingLog] = useState<boolean>(false)
  const [logError, setLogError] = useState<string | null>(null)

  // Log Modal Form Fields
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const [readingDate, setReadingDate] = useState<string>(todayStr)
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number>(1)
  const [startPage, setStartPage] = useState<number>(1)
  const [endPage, setEndPage] = useState<number>(1)
  const [startRuku, setStartRuku] = useState<number>(1)
  const [endRuku, setEndRuku] = useState<number>(1)
  const [notes, setNotes] = useState<string>('')

  // ===================== 600 VOCABULARY WORDS STATE =====================
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All')
  const [onlyBookmarked, setOnlyBookmarked] = useState(false)
  const [onlyLearned, setOnlyLearned] = useState(false)
  const [selectedWordDetail, setSelectedWordDetail] = useState<QuranWord | null>(null)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false)
  const [pdfModalInitialWord, setPdfModalInitialWord] = useState<QuranWord | null>(null)
  const [pdfModalInitialPageIndex, setPdfModalInitialPageIndex] = useState<number>(0)
  const [wordProgressMap, setWordProgressMap] = useState<Record<number, UserWordProgress>>(() =>
    offlineQuranService.getWordProgressMap()
  )

  // ===================== OFFLINE READER STATE =====================
  const [readingProgress, setReadingProgress] = useState<QuranReadingProgress>(() =>
    offlineQuranService.getReadingProgress()
  )
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false)
  const [isDownloading, setIsDownloading] = useState<boolean>(false)
  const [downloadPercent, setDownloadPercent] = useState<number>(0)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  // Fetch Dashboard from backend (with offline cache fallback)
  const loadDashboard = useCallback(async () => {
    setIsLoadingDashboard(true)
    try {
      const res = await salahApi.getQuranReadingDashboard()
      if (res && res.data) {
        setDashboardData(res.data)
        if (res.data.lastReadingSession) {
          const last = res.data.lastReadingSession
          setReadingProgress((prev) => ({
            ...prev,
            lastSurah: last.surahName,
            lastPage: last.lastPage,
            lastReadDate: last.date,
          }))
        }
      }
    } catch {
      // Offline fallback: synthesize from offline storage if server unreachable
      const offline = offlineQuranService.getReadingProgress()
      setDashboardData({
        stats: {
          totalPagesRead: offline.lastPage || 0,
          totalRukusRead: 0,
          totalSessions: offline.lastPage ? 1 : 0,
          todayPagesRead: 0,
          todayRukusRead: 0,
        },
        lastReadingSession: offline.lastPage ? {
          id: 'local',
          date: offline.lastReadDate,
          surahName: offline.lastSurah,
          lastPage: offline.lastPage,
          lastRuku: 1,
          pagesRead: offline.lastPage,
          notes: null,
        } : null,
        history: [],
        historyGrouped: {},
      })
    } finally {
      setIsLoadingDashboard(false)
    }
  }, [])

  // Sync Vocabulary Progress with Server
  const loadVocabularyProgress = useCallback(async () => {
    try {
      const res = await salahApi.getQuranVocabularyProgress()
      if (res && res.data && res.data.progressMap) {
        const newMap = { ...wordProgressMap }
        Object.entries(res.data.progressMap).forEach(([wIdStr, p]: [string, { isLearned: boolean; isBookmarked: boolean; reviewCount: number; lastReviewed?: string }]) => {
          const wId = parseInt(wIdStr)
          newMap[wId] = {
            wordId: wId,
            isLearned: p.isLearned,
            isBookmarked: p.isBookmarked,
            reviewCount: p.reviewCount,
            lastReviewedAt: p.lastReviewed || null,
          }
        })
        setWordProgressMap(newMap)
      }
    } catch {}
  }, [wordProgressMap])

  useEffect(() => {
    offlineQuranService.isQuranDownloaded().then(setIsDownloaded)
    loadDashboard()
    loadVocabularyProgress()
  }, [loadDashboard, loadVocabularyProgress])

  // Handle Surah Selection change in Log Modal: auto-fills page range
  const handleSurahChange = (surahNum: number) => {
    setSelectedSurahNumber(surahNum)
    const meta = QURAN_SURAHS.find((s) => s.number === surahNum)
    if (meta) {
      setStartPage(meta.startPage)
      setEndPage(meta.startPage)
      setStartRuku(1)
      setEndRuku(1)
    }
  }

  // Open Log Modal prefilled
  const handleOpenLogModal = () => {
    setReadingDate(todayStr)
    setLogError(null)
    if (dashboardData?.lastReadingSession) {
      const last = dashboardData.lastReadingSession
      const foundSurah = QURAN_SURAHS.find((s) => s.name.toLowerCase() === last.surahName.toLowerCase())
      const nextSurahNum = foundSurah ? foundSurah.number : 1
      setSelectedSurahNumber(nextSurahNum)
      const lastEndPage = last.lastPage
      setStartPage(Math.min(604, lastEndPage + 1))
      setEndPage(Math.min(604, lastEndPage + 1))
      setStartRuku(last.lastRuku + 1)
      setEndRuku(last.lastRuku + 1)
    } else {
      handleSurahChange(1)
    }
    setIsLogModalOpen(true)
  }

  // Save Today's Quran Reading Session
  const handleSaveReadingSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setLogError(null)

    if (endPage < startPage) {
      setLogError('Ending page cannot be smaller than starting page.')
      return
    }
    if (endRuku < startRuku) {
      setLogError('Ending Ruku cannot be smaller than starting Ruku.')
      return
    }

    const surah = QURAN_SURAHS.find((s) => s.number === selectedSurahNumber)
    const surahName = surah ? surah.name : `Surah ${selectedSurahNumber}`

    setIsSubmittingLog(true)
    try {
      await salahApi.logQuranReading({
        date: readingDate,
        surahName,
        startPage,
        endPage,
        startRuku,
        endRuku,
        notes: notes.trim() || undefined,
      })

      // Update offline reading progress bookmark
      offlineQuranService.saveReadingProgress({
        lastSurah: surahName,
        lastSurahNumber: selectedSurahNumber,
        lastPage: endPage,
        lastAyah: 1,
        totalReadPages: endPage,
        lastReadDate: readingDate,
      })
      setReadingProgress((prev) => ({
        ...prev,
        lastSurah: surahName,
        lastSurahNumber: selectedSurahNumber,
        lastPage: endPage,
        lastReadDate: readingDate,
      }))

      device.hapticFeedback('medium')
      setIsLogModalOpen(false)
      setNotes('')
      await loadDashboard()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save reading log. Please try again.'
      setLogError(msg)
    } finally {
      setIsSubmittingLog(false)
    }
  }

  // Delete a reading session
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this reading session?')) return
    try {
      await salahApi.deleteQuranReadingSession(sessionId)
      device.hapticFeedback('light')
      await loadDashboard()
    } catch {
      alert('Could not delete reading session.')
    }
  }

  // Toggle Learned status of a word (syncs to server + offline)
  const handleToggleLearned = async (wordId: number) => {
    const isLearned = !wordProgressMap[wordId]?.isLearned
    const isBookmarked = !!wordProgressMap[wordId]?.isBookmarked
    const updated = offlineQuranService.updateWordProgress(wordId, { isLearned })
    setWordProgressMap({ ...updated })
    device.hapticFeedback('light')

    try {
      await salahApi.updateQuranWordProgress(wordId, { isLearned, isBookmarked })
    } catch {}
  }

  // Toggle Bookmark status of a word (syncs to server + offline)
  const handleToggleBookmark = async (wordId: number) => {
    const isBookmarked = !wordProgressMap[wordId]?.isBookmarked
    const isLearned = !!wordProgressMap[wordId]?.isLearned
    const updated = offlineQuranService.updateWordProgress(wordId, { isBookmarked })
    setWordProgressMap({ ...updated })
    device.hapticFeedback('light')

    try {
      await salahApi.updateQuranWordProgress(wordId, { isLearned, isBookmarked })
    } catch {}
  }

  // Word Navigation in Modal
  const handlePrevWord = () => {
    if (!selectedWordDetail) return
    const idx = QURAN_VOCABULARY_600.findIndex((w) => w.id === selectedWordDetail.id)
    if (idx > 0) {
      setSelectedWordDetail(QURAN_VOCABULARY_600[idx - 1])
      device.hapticFeedback('light')
    }
  }

  const handleNextWord = () => {
    if (!selectedWordDetail) return
    const idx = QURAN_VOCABULARY_600.findIndex((w) => w.id === selectedWordDetail.id)
    if (idx < QURAN_VOCABULARY_600.length - 1) {
      setSelectedWordDetail(QURAN_VOCABULARY_600[idx + 1])
      device.hapticFeedback('light')
    }
  }

  // Open Full Original PDF at Word Page
  const handleOpenWordPdf = (word: QuranWord) => {
    setPdfModalInitialWord(word)
    setPdfModalInitialPageIndex(word.pageIndex)
    setIsPdfModalOpen(true)
    device.hapticFeedback('light')
  }

  // Open Full Original PDF at custom page
  const handleOpenFullPdf = (pageIndex = 0) => {
    setPdfModalInitialWord(null)
    setPdfModalInitialPageIndex(pageIndex)
    setIsPdfModalOpen(true)
    device.hapticFeedback('light')
  }

  // Filter 600 words
  const filteredWords = useMemo(() => {
    return QURAN_VOCABULARY_600.filter((word) => {
      if (selectedCategory !== 'All' && word.category !== selectedCategory) return false
      if (selectedDifficulty !== 'All' && word.difficulty !== selectedDifficulty) return false

      const p = wordProgressMap[word.id]
      if (onlyBookmarked && !p?.isBookmarked) return false
      if (onlyLearned && !p?.isLearned) return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        word.arabic.includes(q) ||
        word.transliteration.toLowerCase().includes(q) ||
        word.meaning.toLowerCase().includes(q) ||
        (word.meaningUrdu && word.meaningUrdu.toLowerCase().includes(q)) ||
        (word.meaningEnglish && word.meaningEnglish.toLowerCase().includes(q)) ||
        word.surahAyahRef.toLowerCase().includes(q)
      )
    })
  }, [searchQuery, selectedCategory, selectedDifficulty, onlyBookmarked, onlyLearned, wordProgressMap])

  const learnedCount = Object.values(wordProgressMap).filter((p) => p.isLearned).length
  const bookmarkedCount = Object.values(wordProgressMap).filter((p) => p.isBookmarked).length
  const learnedPercentage = Math.round((learnedCount / 600) * 100)

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
      {/* Top Header Bar */}
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
              Reading Tracker • 600 Words • Offline Reader
            </p>
          </div>
          {onOpenHadithView && (
            <button
              type="button"
              onClick={onOpenHadithView}
              className="px-3 py-1.5 rounded-full bg-[#E2B755] text-[#0C382B] text-xs font-bold shadow-xs hover:bg-[#D4A33B] transition cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <span>Hadith</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 3 Sub-Tabs Switcher */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-2">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'bg-[#E2B755] text-[#0C382B] shadow-md'
                : 'bg-white/10 text-emerald-100 hover:bg-white/20'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Tracker</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vocabulary')}
            className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
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
            className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'reader'
                ? 'bg-[#E2B755] text-[#0C382B] shadow-md'
                : 'bg-white/10 text-emerald-100 hover:bg-white/20'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Reader</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: PERSONAL QURAN READING TRACKER & DASHBOARD     */}
      {/* ======================================================== */}
      {activeTab === 'dashboard' && (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
          {/* Action Hero Header */}
          <div className="bg-gradient-to-br from-[#064E3B] to-[#043327] rounded-3xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden border border-emerald-800/40">
            <div className="absolute right-0 top-0 w-48 h-48 bg-[#E2B755]/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#E2B755] text-xs font-bold uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Personal Quran Habit
                </span>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight">
                  Log Today&apos;s Recitation
                </h2>
                <p className="text-xs sm:text-sm text-emerald-200/90 mt-1 max-w-md">
                  Keep your daily Quran reading consistent. Record pages, rukus, and reflect on the verses of Allah.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenLogModal}
                className="self-start sm:self-auto px-5 py-3 rounded-2xl bg-[#E2B755] hover:bg-[#D4A33B] text-[#064E3B] font-bold text-sm shadow-lg transition flex items-center gap-2 cursor-pointer active:scale-95 touch-target flex-shrink-0"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span>Log Today&apos;s Reading</span>
              </button>
            </div>
          </div>

          {/* 4 Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Total Pages */}
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Pages</span>
                <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">
                  {isLoadingDashboard ? '—' : dashboardData?.stats.totalPagesRead || 0}
                </p>
                <p className="text-[11px] text-stone-500 font-medium mt-0.5">Pages completed</p>
              </div>
            </div>

            {/* 2. Total Rukus */}
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Rukus</span>
                <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">
                  {isLoadingDashboard ? '—' : dashboardData?.stats.totalRukusRead || 0}
                </p>
                <p className="text-[11px] text-stone-500 font-medium mt-0.5">Rukus studied</p>
              </div>
            </div>

            {/* 3. Total Sessions */}
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Sessions</span>
                <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">
                  {isLoadingDashboard ? '—' : dashboardData?.stats.totalSessions || 0}
                </p>
                <p className="text-[11px] text-stone-500 font-medium mt-0.5">Reading logs</p>
              </div>
            </div>

            {/* 4. Today's Progress */}
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Today</span>
                <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">
                  {isLoadingDashboard ? '—' : `${dashboardData?.stats.todayPagesRead || 0} p`}
                </p>
                <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                  {dashboardData?.stats.todayRukusRead || 0} Rukus today
                </p>
              </div>
            </div>
          </div>

          {/* Continue Reading Hero Card */}
          {dashboardData?.lastReadingSession && (
            <div className="bg-[#FAF8F3] rounded-2xl p-5 border border-[#E4E0D6] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#064E3B] text-[#E2B755] flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                    Last Reading Position
                  </span>
                  <h4 className="font-serif font-bold text-lg text-stone-900 leading-tight mt-0.5">
                    Surah {dashboardData.lastReadingSession.surahName}
                  </h4>
                  <p className="text-xs text-stone-600 mt-1">
                    Page {dashboardData.lastReadingSession.lastPage} • Ruku {dashboardData.lastReadingSession.lastRuku} • {dashboardData.lastReadingSession.date}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('reader')}
                className="px-4 py-2 rounded-xl bg-[#064E3B] hover:bg-[#085a44] text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Continue Reading</span>
                <ArrowRight className="w-4 h-4 text-[#E2B755]" />
              </button>
            </div>
          )}

          {/* Reading History Grouped by Date */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-800" />
                <h3 className="font-serif font-bold text-base text-stone-900">
                  Reading History
                </h3>
              </div>
              <span className="text-xs text-stone-500 font-medium">
                {dashboardData?.history ? dashboardData.history.length : 0} entries
              </span>
            </div>

            {isLoadingDashboard ? (
              <div className="py-8 text-center text-xs text-stone-400">Loading your reading logs...</div>
            ) : !dashboardData?.historyGrouped || Object.keys(dashboardData.historyGrouped).length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <BookOpen className="w-10 h-10 text-stone-300 mx-auto stroke-[1.5]" />
                <p className="text-sm font-semibold text-stone-700">No reading sessions recorded yet</p>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Click &ldquo;Log Today&apos;s Reading&rdquo; above to record your first recitation and start building your lifelong Quran streak.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(dashboardData.historyGrouped).map(([dateKey, sessions]) => (
                  <div key={dateKey} className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span>{dateKey}</span>
                    </div>

                    <div className="space-y-2">
                      {sessions.map((sess: QuranReadingSession) => (
                        <div
                          key={sess.id}
                          className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E9E5DC] flex items-center justify-between gap-3 hover:border-emerald-300 transition"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-stone-900">
                                Surah {sess.surahName}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-semibold text-[10px]">
                                {sess.pagesRead} pages ({sess.startPage}–{sess.endPage})
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold text-[10px]">
                                {sess.rukusRead} Rukus ({sess.startRuku}–{sess.endRuku})
                              </span>
                            </div>

                            {sess.notes && (
                              <p className="text-xs text-stone-600 mt-1 italic line-clamp-2">
                                &ldquo;{sess.notes}&rdquo;
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteSession(sess.id)}
                            title="Delete entry"
                            className="w-8 h-8 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition cursor-pointer flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: 600 ARABIC QURAN VOCABULARY WORDS TRAINER       */}
      {/* ======================================================== */}
      {activeTab === 'vocabulary' && (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
          {/* Progress Banner */}
          <div className="bg-gradient-to-r from-[#0C382B] via-[#0E4938] to-[#0A2D23] rounded-3xl p-5 text-white shadow-md border border-emerald-800/50">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold uppercase tracking-wider text-[#E2B755] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                600 Essential Quran Words (Al Hidaya)
              </span>
              <span className="font-mono font-bold text-white">
                {learnedCount} / 600 ({learnedPercentage}%)
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-[#E2B755] to-amber-300 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${Math.max(2, learnedPercentage)}%` }}
              ></div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-emerald-800/60">
              <p className="text-[11px] text-emerald-200/80">
                Mastering these 600 words accounts for ~82% of all vocabulary in the Holy Quran.
              </p>
              <button
                type="button"
                onClick={() => handleOpenFullPdf(0)}
                className="px-4 py-2 rounded-2xl bg-[#E2B755] hover:bg-[#D4A33B] text-[#0C382B] text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 touch-target flex-shrink-0"
              >
                <BookOpen className="w-4 h-4 stroke-[2.5]" />
                <span>View Full PDF (319 Pages)</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Arabic, Transliteration, English or Roman Urdu meaning..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0C382B]/20 focus:border-[#0C382B] transition"
              />
            </div>

            {/* Quick Filter Chips */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyLearned(!onlyLearned)}
                  className={`px-3 py-1 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    onlyLearned ? 'bg-emerald-100 text-emerald-900' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Learned ({learnedCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyBookmarked(!onlyBookmarked)}
                  className={`px-3 py-1 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    onlyBookmarked ? 'bg-amber-100 text-amber-900' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                  <span>Saved ({bookmarkedCount})</span>
                </button>
              </div>

              <span className="text-stone-500 font-medium text-xs">
                Showing {filteredWords.length} words
              </span>
            </div>

            {/* Difficulty Scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 text-xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase flex-shrink-0">Level:</span>
              {VOCABULARY_DIFFICULTIES.map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-2.5 py-0.5 rounded-full font-semibold transition cursor-pointer text-[11px] whitespace-nowrap ${
                    selectedDifficulty === diff
                      ? 'bg-[#064E3B] text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {diff}
                </button>
              ))}
              <span className="text-stone-300 mx-1">|</span>
              <span className="text-[10px] font-bold text-stone-400 uppercase flex-shrink-0">Category:</span>
              {VOCABULARY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-0.5 rounded-full font-semibold transition cursor-pointer text-[11px] whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-[#064E3B] text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Words Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredWords.slice(0, 120).map((w) => {
              const isLearned = wordProgressMap[w.id]?.isLearned
              const isBookmarked = wordProgressMap[w.id]?.isBookmarked

              return (
                <div
                  key={w.id}
                  onClick={() => handleOpenWordPdf(w)}
                  className={`p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between cursor-pointer ${
                    isLearned
                      ? 'bg-emerald-50/70 border-emerald-200/90'
                      : 'bg-white border-stone-200 hover:border-emerald-600/40 hover:shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                          #{w.id}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                          PDF p.{w.pdfPage}
                        </span>
                        {w.repeats && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
                            {w.repeats}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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

                    {/* Authentic Arabic Word Display from PDF */}
                    <div className="flex items-center justify-end py-1 h-14 overflow-hidden">
                      {w.image ? (
                        <img
                          src={w.image}
                          alt={w.transliteration}
                          className="max-h-12 max-w-[150px] object-contain drop-shadow-xs"
                          loading="lazy"
                        />
                      ) : (
                        <p className="font-amiri text-2xl text-right text-[#0C382B] font-bold">
                          {w.arabic}
                        </p>
                      )}
                    </div>

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

          {filteredWords.length > 120 && (
            <p className="text-center text-xs text-stone-500 py-3">
              Showing first 120 results. Use search or category filter to explore all 600 words.
            </p>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: OFFLINE QURAN & ROMAN URDU READER               */}
      {/* ======================================================== */}
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

          {/* Top 600 Words of the Quran Official PDF Card */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0C382B] to-[#043327] p-2 flex items-center justify-center text-[#E2B755] flex-shrink-0 shadow-md">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-base text-stone-900">
                      Top 600 Words of the Quran (Al-Hidaya)
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      319 Pages
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Authentic PDF with Arabic Calligraphy, English, and Roman Urdu Meanings
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleOpenFullPdf(0)}
                  className="px-4 py-2 rounded-xl bg-[#0C382B] hover:bg-emerald-950 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer touch-target"
                >
                  <Eye className="w-4 h-4 text-[#E2B755]" />
                  <span>Open PDF Reader</span>
                </button>
                <a
                  href="/top_600_words_quran.pdf"
                  download="Top 600 Words of the Quran.pdf"
                  className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer touch-target"
                >
                  <Download className="w-4 h-4 text-stone-600" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* LOG TODAY'S QURAN READING MODAL                          */}
      {/* ======================================================== */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#064E3B]" />
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  Log Today&apos;s Quran Reading
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReadingSession} className="mt-4 space-y-4">
              {logError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{logError}</span>
                </div>
              )}

              {/* Reading Date */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Reading Date
                </label>
                <input
                  type="date"
                  value={readingDate}
                  onChange={(e) => setReadingDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B]"
                />
              </div>

              {/* Surah Picker */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Surah
                </label>
                <select
                  value={selectedSurahNumber}
                  onChange={(e) => handleSurahChange(parseInt(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B]"
                >
                  {QURAN_SURAHS.map((s: SurahMeta) => (
                    <option key={s.number} value={s.number}>
                      #{s.number} {s.name} ({s.arabicName}) — {s.meaning} (p. {s.startPage})
                    </option>
                  ))}
                </select>
              </div>

              {/* Page Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Start Page
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="604"
                    value={startPage}
                    onChange={(e) => setStartPage(parseInt(e.target.value) || 1)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    End Page
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="604"
                    value={endPage}
                    onChange={(e) => setEndPage(parseInt(e.target.value) || 1)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B]"
                  />
                </div>
              </div>

              {/* Ruku Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Start Ruku
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={startRuku}
                    onChange={(e) => setStartRuku(parseInt(e.target.value) || 1)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    End Ruku
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={endRuku}
                    onChange={(e) => setEndRuku(parseInt(e.target.value) || 1)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B]"
                  />
                </div>
              </div>

              {/* Personal Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Personal Reflections / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes, reflections, or verses that touched your heart..."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B]"
                ></textarea>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLog}
                  className="px-5 py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#085a44] text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-[#E2B755]" />
                  <span>{isSubmittingLog ? 'Saving...' : 'Save Today&apos;s Reading'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 600 WORDS DETAIL MODAL                                   */}
      {/* ======================================================== */}
      {selectedWordDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700">
                  Word #{selectedWordDetail.id} / 600
                </span>
                {selectedWordDetail.progressPercentage && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {selectedWordDetail.progressPercentage}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevWord}
                  disabled={selectedWordDetail.id <= 1}
                  aria-label="Previous word"
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextWord}
                  disabled={selectedWordDetail.id >= 600}
                  aria-label="Next word"
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWordDetail(null)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {/* Authentic Arabic Calligraphy Image & Transliteration Card */}
              <div className="bg-[#FAF8F3] rounded-2xl p-5 border border-[#E7E2D6] text-center space-y-2">
                {selectedWordDetail.image && (
                  <div className="flex justify-center py-2">
                    <img
                      src={selectedWordDetail.image}
                      alt={selectedWordDetail.transliteration}
                      className="max-h-20 max-w-[240px] object-contain drop-shadow-sm"
                    />
                  </div>
                )}
                {selectedWordDetail.arabic && selectedWordDetail.arabic !== selectedWordDetail.transliteration && (
                  <p className="font-amiri text-2xl text-[#064E3B] font-bold">
                    {selectedWordDetail.arabic}
                  </p>
                )}
                <h3 className="text-lg font-bold text-stone-900">
                  {selectedWordDetail.transliteration}
                </h3>
                <p className="text-sm font-semibold text-emerald-800">
                  {selectedWordDetail.meaning}
                </p>

                <div className="flex items-center justify-center gap-2 pt-2 text-[11px] font-semibold text-stone-500 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-700">
                    {selectedWordDetail.partOfSpeech}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {selectedWordDetail.repeats}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {selectedWordDetail.surahAyahRef}
                  </span>
                </div>
              </div>

              {/* Quranic Verse Context */}
              <div className="bg-white rounded-2xl p-4 border border-stone-200 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Quranic Verse ({selectedWordDetail.surahAyahRef})
                </span>

                {selectedWordDetail.verseArabic && (
                  <p className="font-amiri text-xl text-right text-stone-900 leading-loose">
                    {selectedWordDetail.verseArabic}
                  </p>
                )}

                {selectedWordDetail.verseEnglish && (
                  <p className="text-xs text-stone-700 leading-relaxed font-medium">
                    &ldquo;{selectedWordDetail.verseEnglish}&rdquo;
                  </p>
                )}

                {selectedWordDetail.verseRomanUrdu && (
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs text-amber-950 leading-relaxed">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-amber-900 block mb-1">
                      Roman Urdu Translation:
                    </span>
                    {selectedWordDetail.verseRomanUrdu}
                  </div>
                )}
              </div>

              {/* Action Buttons in Modal */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenWordPdf(selectedWordDetail)
                    setSelectedWordDetail(null)
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#E2B755] text-[#0C382B] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:bg-[#D4A33B]"
                >
                  <BookOpen className="w-4 h-4 stroke-[2.5]" />
                  <span>View Full PDF Page #{selectedWordDetail.pdfPage}</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => handleToggleBookmark(selectedWordDetail.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                      wordProgressMap[selectedWordDetail.id]?.isBookmarked
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <Bookmark
                      className={`w-4 h-4 ${
                        wordProgressMap[selectedWordDetail.id]?.isBookmarked ? 'fill-amber-500 text-amber-500' : ''
                      }`}
                    />
                    <span>
                      {wordProgressMap[selectedWordDetail.id]?.isBookmarked ? 'Saved' : 'Bookmark'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleLearned(selectedWordDetail.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      wordProgressMap[selectedWordDetail.id]?.isLearned
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-[#064E3B] text-white hover:bg-[#085a44]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#E2B755]" />
                    <span>
                      {wordProgressMap[selectedWordDetail.id]?.isLearned ? 'Learned ✓' : 'Mark Learned'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* INTEGRATED FULL ORIGINAL PDF VIEWER MODAL                */}
      {/* ======================================================== */}
      <QuranPdfModal
        isOpen={isPdfModalOpen}
        initialWord={pdfModalInitialWord}
        initialPageIndex={pdfModalInitialPageIndex}
        onClose={() => setIsPdfModalOpen(false)}
        wordProgressMap={wordProgressMap}
        onToggleBookmark={handleToggleBookmark}
        onToggleLearned={handleToggleLearned}
      />
    </div>
  )
}
