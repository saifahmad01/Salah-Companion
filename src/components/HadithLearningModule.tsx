import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Bookmark,
  Layers,
  Eye,
  BookMarked,
  X,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { useHadithsListQuery, useVerifiedBooksQuery } from '../hooks/useHadithModuleQuery';
import { HadithModuleCard } from './HadithModuleCard';
import type {
  HadithLearningItem,
  HadithViewMode,
  FontSizeOption,
  VerifiedBook,
} from '../types/hadithModule';

export interface HadithLearningModuleProps {
  onBack?: () => void;
  initialBook?: string;
}

// Educational Islamic Words for Children & Beginners
const WORDS_OF_THE_DAY = [
  {
    arabic: 'نِيَّة',
    roman: 'Niyyah',
    meaning: 'Pure Intention of the Heart',
    explanation: 'Doing an action purely to please Allah, without showing off to people.',
  },
  {
    arabic: 'صَبْر',
    roman: 'Sabr',
    meaning: 'Beautiful Patience & Perseverance',
    explanation: 'Remaining calm, thankful, and steadfast when facing hardship or waiting.',
  },
  {
    arabic: 'إِحْسَان',
    roman: 'Ihsan',
    meaning: 'Excellence & Perfection in Worship',
    explanation: 'Worshipping Allah as if you see Him, knowing that He always sees you.',
  },
  {
    arabic: 'شُكْر',
    roman: 'Shukr',
    meaning: 'Heartfelt Gratitude',
    explanation: 'Saying Alhamdulillah from the bottom of your heart for all blessings.',
  },
  {
    arabic: 'تَقْوَى',
    roman: 'Taqwa',
    meaning: 'God-Consciousness & Mindfulness',
    explanation: 'Being conscious of Allah in every choice, seeking what pleases Him.',
  },
  {
    arabic: 'صِدْق',
    roman: 'Sidq',
    meaning: 'Truthfulness in Speech and Action',
    explanation: 'Always telling the truth, keeping promises, and being honest.',
  },
];

const LOCAL_STORAGE_BOOKMARKS_KEY = 'salah_hadith_bookmarks_v1';
const LOCAL_STORAGE_READ_COUNT_KEY = 'salah_hadith_read_ids_v1';

export const HadithLearningModule: React.FC<HadithLearningModuleProps> = ({
  onBack,
  initialBook = 'sahih-bukhari',
}) => {
  // Query parameters state
  const [selectedBook, setSelectedBook] = useState<string>(initialBook);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [searchInput, setSearchInput] = useState<string>('');
  const [activeSearchNumber, setActiveSearchNumber] = useState<string | null>(null);

  // UI display preferences
  const [viewMode, setViewMode] = useState<HadithViewMode>('all');
  const [fontSize, setFontSize] = useState<FontSizeOption>('base');
  const [readModeIndex, setReadModeIndex] = useState<number>(0);

  // Local storage bookmarks
  const [bookmarks, setBookmarks] = useState<HadithLearningItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_BOOKMARKS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Local storage read counter (IDs of explored Hadiths)
  const [readIds, setReadIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_READ_COUNT_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Daily seed for Word of the Day
  const todayWord = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return WORDS_OF_THE_DAY[dayOfYear % WORDS_OF_THE_DAY.length];
  }, []);

  // Fetch verified collections
  const booksQuery = useVerifiedBooksQuery();

  // Fetch paginated Hadiths list
  const hadithsQuery = useHadithsListQuery({
    book: selectedBook,
    page,
    paginate: pageSize,
    hadithNumber: activeSearchNumber,
  });

  // Reset page when book or search changes
  const handleSelectBook = (bookSlug: string) => {
    setSelectedBook(bookSlug);
    setPage(1);
    setActiveSearchNumber(null);
    setSearchInput('');
    setReadModeIndex(0);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) {
      setActiveSearchNumber(null);
      setPage(1);
      return;
    }

    if (!/^\d+$/.test(trimmed)) {
      alert('Please enter a valid numeric Hadith number (e.g. 1, 42, 100).');
      return;
    }

    setActiveSearchNumber(trimmed);
    setPage(1);
    setReadModeIndex(0);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setActiveSearchNumber(null);
    setPage(1);
  };

  // Toggle bookmark
  const handleToggleBookmark = (item: HadithLearningItem) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.id === item.id);
      let updated: HadithLearningItem[];
      if (exists) {
        updated = prev.filter((b) => b.id !== item.id);
      } else {
        updated = [item, ...prev];
      }
      try {
        localStorage.setItem(LOCAL_STORAGE_BOOKMARKS_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Mark hadith as read
  const handleMarkRead = (hadithId: number) => {
    if (!readIds.includes(hadithId)) {
      setReadIds((prev) => {
        const next = [...prev, hadithId];
        try {
          localStorage.setItem(LOCAL_STORAGE_READ_COUNT_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  };

  const hadithsList = hadithsQuery.data?.data || [];
  const pagination = hadithsQuery.data?.pagination;

  // Items to display depending on mode
  const displayedItems = viewMode === 'favorites' ? bookmarks : hadithsList;

  // Available books (use fallback if query pending)
  const availableBooks: VerifiedBook[] = booksQuery.data && booksQuery.data.length > 0
    ? booksQuery.data
    : [
        { id: 1, name: 'Sahih Bukhari', arabicName: 'صحيح البخاري', slug: 'sahih-bukhari', writer: 'Imam Bukhari', totalHadiths: 7563, description: 'Most authentic' },
        { id: 2, name: 'Sahih Muslim', arabicName: 'صحيح مسلم', slug: 'sahih-muslim', writer: 'Imam Muslim', totalHadiths: 7500, description: 'Authentic compilation' },
        { id: 4, name: "Jami' Al-Tirmidhi", arabicName: 'جامع الترمذي', slug: 'al-tirmidhi', writer: 'Imam Tirmidhi', totalHadiths: 3956, description: 'Authentic & graded' },
        { id: 5, name: 'Sunan Abu Dawood', arabicName: 'سنن أبي داود', slug: 'abu-dawood', writer: 'Imam Abu Dawood', totalHadiths: 5274, description: 'Legal rulings' },
        { id: 6, name: 'Sunan Ibn-e-Majah', arabicName: 'سنن ابن ماجه', slug: 'ibn-e-majah', writer: 'Imam Ibn Majah', totalHadiths: 4341, description: 'Daily guidance' },
        { id: 7, name: "Sunan An-Nasa'i", arabicName: 'سنن النسائي', slug: 'sunan-nasai', writer: 'Imam Nasai', totalHadiths: 5758, description: 'Precise chains' },
      ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 pb-12 animate-fade-in">
      {/* 1. TOP HEADER & NAVIGATION */}
      <header className="rounded-[28px] bg-gradient-to-br from-[#0C4535] to-[#082E23] text-white p-5 shadow-[0_4px_20px_rgba(12,69,53,0.15)] relative overflow-hidden">
        {/* Subtle geometric pattern overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none text-8xl flex items-center justify-end pr-4">
          ۞
        </div>

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-white/10 backdrop-blur-xs text-amber-300">
                <BookOpen className="w-5 h-5" />
              </span>
              <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight">
                Daily Hadith
              </h1>
            </div>
            <p className="text-[12.5px] text-emerald-100/90 font-medium">
              Learn, understand, and grow in faith. (بچوں اور بڑوں کے لیے آسان حدیث)
            </p>
          </div>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11.5px] font-semibold transition active:scale-95 cursor-pointer backdrop-blur-xs flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
        </div>

        {/* Quick Toolbar: Reading Progress Counter & Font Size Adjuster */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Gentle reading progress */}
          <div className="flex items-center gap-1.5 text-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="font-semibold text-[11px]">
              {readIds.length} Hadith{readIds.length === 1 ? '' : 's'} explored 🌱
            </span>
          </div>

          {/* Font Size Adjuster */}
          <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1 backdrop-blur-xs">
            <span className="text-[10px] text-emerald-200 px-1 font-medium">Font:</span>
            {(['sm', 'base', 'lg', 'xl'] as FontSizeOption[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setFontSize(size)}
                className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition cursor-pointer ${
                  fontSize === size
                    ? 'bg-amber-400 text-[#093326]'
                    : 'text-white/80 hover:text-white'
                }`}
                title={`Text size: ${size}`}
              >
                {size === 'sm' ? 'A-' : size === 'base' ? 'A' : size === 'lg' ? 'A+' : 'A++'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 2. WORD OF THE DAY (بچوں کے لیے روزانہ ایک اہم اسلامی لفظ) */}
      <section className="rounded-[22px] bg-gradient-to-r from-[#FFFDF8] to-[#FBF6EC] border border-[#EBE0CD] p-4 shadow-2xs flex items-start gap-3.5">
        <div className="p-2.5 rounded-2xl bg-amber-100/70 text-amber-800 flex-shrink-0">
          <Lightbulb className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-200/50 px-2 py-0.5 rounded-md">
              Word of the Day • لفظ برائے فہم
            </span>
            <span dir="rtl" className="font-serif text-lg font-bold text-[#14261E]">
              {todayWord.arabic}
            </span>
          </div>
          <p className="text-[13px] font-bold text-[#14261E]">
            {todayWord.roman} — <span className="text-amber-900 font-medium">{todayWord.meaning}</span>
          </p>
          <p className="text-[11.5px] text-[#4F3F2F] leading-relaxed">
            {todayWord.explanation}
          </p>
        </div>
      </section>

      {/* 3. COLLECTION SELECTOR */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[12px] font-bold text-[#15271F] uppercase tracking-wider">
            Hadith Collections (کتبِ احادیث)
          </span>
          <span className="text-[11px] text-stone-500">
            {availableBooks.length} Authentic Books
          </span>
        </div>

        {/* Horizontal scrollable collection pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {availableBooks.map((book) => {
            const isSelected = selectedBook === book.slug;
            return (
              <button
                key={book.slug}
                type="button"
                onClick={() => handleSelectBook(book.slug)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-2xl text-[12px] font-bold transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#0E543F] text-white shadow-xs border border-[#0E543F]'
                    : 'bg-white text-stone-700 hover:bg-stone-50 border border-[#E7E2D6]'
                }`}
              >
                <span>{book.name}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. SEARCH & VIEW MODE SWITCHER */}
      <section className="bg-white rounded-[24px] border border-[#ECE6D8] p-3 shadow-2xs space-y-3">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            inputMode="numeric"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={`Search Hadith number in ${selectedBook.replace('-', ' ')}... (e.g. 1)`}
            className="w-full pl-9 pr-20 py-2.5 rounded-xl bg-[#FAF8F3] border border-[#E6DFD1] text-[12.5px] text-stone-800 focus:outline-hidden focus:border-[#0E543F] transition placeholder:text-stone-400"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-14 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-[#0E543F] text-white text-[11px] font-bold hover:bg-emerald-900 transition active:scale-95 cursor-pointer"
          >
            Go
          </button>
        </form>

        {/* View Mode Switcher Pills */}
        <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#F2ECE0]">
          <div className="flex items-center gap-1 bg-[#F4EFE6] p-1 rounded-xl w-full">
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-white text-[#0E543F] shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Modes</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode('read');
                setReadModeIndex(0);
              }}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                viewMode === 'read'
                  ? 'bg-white text-[#0E543F] shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Read Mode (بچوں کے لیے)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('understand')}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                viewMode === 'understand'
                  ? 'bg-white text-[#0E543F] shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span>Understand (فہم)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('favorites')}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                viewMode === 'favorites'
                  ? 'bg-white text-[#0E543F] shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved ({bookmarks.length})</span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. SEARCH ACTIVE BANNER */}
      {activeSearchNumber && (
        <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <span>Showing results for Hadith #{activeSearchNumber}</span>
          <button
            type="button"
            onClick={handleClearSearch}
            className="text-amber-800 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>Show all</span>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 6. MAIN CONTENT AREA */}
      {hadithsQuery.isPending && viewMode !== 'favorites' ? (
        /* Loading Skeleton with soft pulse */
        <div className="space-y-4 animate-pulse">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="w-full rounded-[26px] bg-white border border-[#EDE8DC] p-5 space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="h-6 w-40 bg-stone-200 rounded-full" />
                <div className="h-5 w-20 bg-emerald-100 rounded-full" />
              </div>
              <div className="space-y-2 py-3">
                <div className="h-6 bg-stone-200 rounded-md w-full" />
                <div className="h-6 bg-stone-200 rounded-md w-4/5 ml-auto" />
              </div>
              <div className="h-14 bg-amber-50/70 rounded-xl" />
              <div className="space-y-2">
                <div className="h-4 bg-stone-100 rounded-md w-full" />
                <div className="h-4 bg-stone-100 rounded-md w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : hadithsQuery.isError && viewMode !== 'favorites' ? (
        /* Error Banner with retry action */
        <div className="rounded-[26px] bg-red-50/80 border border-red-200 p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <h3 className="text-sm font-bold text-red-900">
            Could not load Hadiths
          </h3>
          <p className="text-xs text-red-700 max-w-md mx-auto">
            {hadithsQuery.error?.message || 'Please check your connection and ensure the backend is running.'}
          </p>
          <button
            type="button"
            onClick={() => hadithsQuery.refetch()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : displayedItems.length === 0 ? (
        /* Empty State */
        <div className="rounded-[26px] bg-white border border-[#EDE8DC] p-8 text-center space-y-3">
          <span className="text-3xl block">📖</span>
          <h3 className="text-sm font-bold text-[#14261E]">
            {viewMode === 'favorites' ? 'No Saved Hadiths Yet' : 'No Hadiths Found'}
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {viewMode === 'favorites'
              ? 'Click the bookmark icon on any Hadith card to save your favorite Hadiths here for daily reading.'
              : `No Hadith matching #${activeSearchNumber} was found in ${selectedBook}.`}
          </p>
          {activeSearchNumber && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-4 py-2 rounded-xl bg-[#0E543F] text-white text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              Reset Search
            </button>
          )}
        </div>
      ) : viewMode === 'read' ? (
        /* READ MODE (Display one Hadith at a time with big text & stepper) */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[11.5px] font-bold text-[#0E543F]">
              Reading #{readModeIndex + 1} of {displayedItems.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={readModeIndex === 0}
                onClick={() => setReadModeIndex((prev) => Math.max(0, prev - 1))}
                className="p-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-stone-700" />
              </button>
              <button
                type="button"
                disabled={readModeIndex >= displayedItems.length - 1}
                onClick={() => setReadModeIndex((prev) => Math.min(displayedItems.length - 1, prev + 1))}
                className="p-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-stone-700" />
              </button>
            </div>
          </div>

          <HadithModuleCard
            key={displayedItems[readModeIndex]?.id || readModeIndex}
            hadith={displayedItems[readModeIndex]}
            fontSize={fontSize}
            viewMode="read"
            isBookmarked={bookmarks.some((b) => b.id === displayedItems[readModeIndex]?.id)}
            onToggleBookmark={handleToggleBookmark}
            onMarkRead={handleMarkRead}
          />
        </div>
      ) : (
        /* ALL MODES & UNDERSTAND MODE LIST */
        <div className="space-y-4">
          {displayedItems.map((hadith) => (
            <HadithModuleCard
              key={hadith.id}
              hadith={hadith}
              fontSize={fontSize}
              viewMode={viewMode}
              isBookmarked={bookmarks.some((b) => b.id === hadith.id)}
              onToggleBookmark={handleToggleBookmark}
              onMarkRead={handleMarkRead}
            />
          ))}
        </div>
      )}

      {/* 7. PAGINATION CONTROLS */}
      {viewMode !== 'favorites' && pagination && pagination.total > 0 && !activeSearchNumber && (
        <footer className="rounded-[22px] bg-white border border-[#EDE8DC] p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="text-[12px] text-stone-600">
            Page <span className="font-bold text-[#0E543F]">{pagination.currentPage}</span> of{' '}
            <span className="font-bold">{pagination.lastPage}</span> •{' '}
            <span className="text-stone-500 font-medium">({pagination.total.toLocaleString()} Hadiths total)</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              disabled={pagination.currentPage <= 1 || hadithsQuery.isPending}
              onClick={() => {
                setPage((prev) => Math.max(1, prev - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed text-stone-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              disabled={!pagination.hasMore || hadithsQuery.isPending}
              onClick={() => {
                setPage((prev) => prev + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#0E543F] hover:bg-emerald-900 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};
