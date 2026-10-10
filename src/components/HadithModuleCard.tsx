import React, { useState } from 'react';
import {
  BookOpen,
  Copy,
  Check,
  Share2,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Sparkles,
  HelpCircle,
  Volume2,
} from 'lucide-react';
import type { HadithLearningItem, FontSizeOption, HadithViewMode } from '../types/hadithModule';

export interface HadithModuleCardProps {
  hadith: HadithLearningItem;
  fontSize?: FontSizeOption;
  viewMode?: HadithViewMode;
  isBookmarked?: boolean;
  onToggleBookmark?: (hadith: HadithLearningItem) => void;
  onMarkRead?: (hadithId: number) => void;
}

/**
 * Returns grade badge styling and authentic label
 */
function getStatusBadge(status: string | null) {
  if (!status) {
    return {
      label: 'Authentic (صحیح)',
      classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  }

  const s = status.toLowerCase();
  if (s.includes('sahih')) {
    return {
      label: 'Sahih (صحيح)',
      classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  } else if (s.includes('hasan')) {
    return {
      label: 'Hasan (حسن)',
      classes: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  } else if (s.includes('da') || s.includes('weak')) {
    return {
      label: 'Da\'if (ضعيف)',
      classes: 'bg-stone-100 text-stone-700 border-stone-200',
    };
  }

  return {
    label: status,
    classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };
}

/**
 * Font size helper for responsive reading comfort
 */
function getArabicSizeClass(size: FontSizeOption = 'base') {
  switch (size) {
    case 'sm':
      return 'text-[22px] leading-[2]';
    case 'lg':
      return 'text-[28px] leading-[2.1]';
    case 'xl':
      return 'text-[32px] leading-[2.2]';
    case 'base':
    default:
      return 'text-[25px] leading-[2]';
  }
}

export const HadithModuleCard: React.FC<HadithModuleCardProps> = ({
  hadith,
  fontSize = 'base',
  viewMode = 'all',
  isBookmarked = false,
  onToggleBookmark,
  onMarkRead,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showChildReflect, setShowChildReflect] = useState(false);

  // Copy full Hadith text to clipboard
  const handleCopy = async () => {
    const copyText = [
      `${hadith.collectionName} — Hadith #${hadith.hadithNumber}`,
      hadith.chapter?.english ? `Chapter: ${hadith.chapter.english}` : '',
      hadith.arabic ? `\nArabic:\n${hadith.arabic}` : '',
      hadith.romanUrdu ? `\nRoman Urdu:\n"${hadith.romanUrdu}"` : '',
      hadith.urdu ? `\nUrdu:\n${hadith.urdu}` : '',
      hadith.english ? `\nEnglish:\n"${hadith.english}"` : '',
      `\n— Learned via Salah Companion (Hadith Learning Module)`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyText);
      } else {
        const ta = document.createElement('textarea');
        ta.value = copyText;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (onMarkRead && hadith.id) onMarkRead(hadith.id);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy Hadith text:', err);
    }
  };

  // Native share dialog
  const handleShare = async () => {
    if (navigator?.share) {
      try {
        await navigator.share({
          title: `${hadith.collectionName} #${hadith.hadithNumber}`,
          text: `"${hadith.english?.slice(0, 160) || hadith.romanUrdu?.slice(0, 160)}..."\n\n— ${hadith.collectionName} #${hadith.hadithNumber}`,
          url: window.location.href,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const statusBadge = getStatusBadge(hadith.status);
  const arabicSizeClass = getArabicSizeClass(fontSize);

  return (
    <article className="w-full rounded-[26px] bg-white border border-[#ECE6D8] p-5 shadow-[0_2px_12px_rgba(20,38,30,0.03)] hover:border-[#D5CABB] transition duration-200 space-y-4">
      {/* Header: Collection Badge, Hadith Number, Grade, Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F4EFE6] pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF5EF] text-[#0C4E3A] border border-[#CFE5D8] text-[11.5px] font-bold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{hadith.collectionName}</span>
            <span className="font-mono text-stone-500">#{hadith.hadithNumber}</span>
          </div>

          {hadith.status && (
            <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border ${statusBadge.classes}`}>
              {statusBadge.label}
            </span>
          )}

          {hadith.chapter?.english && (
            <span className="text-[11px] text-stone-600 hidden sm:inline truncate max-w-[200px]" title={hadith.chapter.english}>
              📖 {hadith.chapter.english}
            </span>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Bookmark Button */}
          <button
            type="button"
            onClick={() => onToggleBookmark && onToggleBookmark(hadith)}
            className={`p-1.5 rounded-xl border transition active:scale-95 cursor-pointer ${
              isBookmarked
                ? 'bg-amber-50 border-amber-300 text-amber-600 shadow-2xs'
                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
            title={isBookmarked ? 'Bookmarked' : 'Bookmark Hadith'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-500' : ''}`} />
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-[11px] font-semibold transition active:scale-95 cursor-pointer"
            title="Copy Hadith"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Copy</span>
              </>
            )}
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="p-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600 transition active:scale-95 cursor-pointer"
            title="Share Hadith"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* VIEW MODE: UNDERSTAND MODE STEPPER */}
      {viewMode === 'understand' ? (
        <div className="space-y-3.5">
          {/* Step 1: Arabic Recitation */}
          {hadith.arabic && (
            <div className="rounded-2xl bg-[#FCFAF6] border border-[#EFE8DC] p-4 text-right">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 bg-stone-200/60 px-2 py-0.5 rounded-md">
                  Step 1 • Arabic Text (عربی عبارت)
                </span>
                <span className="text-xs text-amber-600">❖</span>
              </div>
              <p dir="rtl" className={`font-serif font-bold text-[#14261E] select-text ${arabicSizeClass}`}>
                {hadith.arabic}
              </p>
            </div>
          )}

          {/* Step 2: Roman Urdu (Pronunciation & Phonics for Kids) */}
          {hadith.romanUrdu && (
            <div className="rounded-2xl bg-[#FAF5EC] border border-[#E9DDC9] p-4">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-800">
                    Step 2 • Roman Urdu (Pronunciation Aid)
                  </span>
                </div>
                <span className="text-[10px] text-amber-800 font-medium">Read Aloud</span>
              </div>
              <p className="font-serif italic text-[14px] text-[#4A2D16] leading-relaxed select-text">
                “{hadith.romanUrdu}”
              </p>
            </div>
          )}

          {/* Step 3: Urdu Meaning */}
          {hadith.urdu && (
            <div className="rounded-2xl bg-[#F4F9F6] border border-[#D5EADB] p-4 text-right">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0C4E3A] bg-[#E2F2E7] px-2 py-0.5 rounded-md">
                  Step 3 • Urdu Translation (اردو ترجمہ)
                </span>
              </div>
              <p dir="rtl" className="font-medium text-[14px] sm:text-[15px] text-[#0C4E3A] leading-relaxed select-text">
                {hadith.urdu}
              </p>
            </div>
          )}

          {/* Step 4: English Meaning */}
          {hadith.english && (
            <div className="rounded-2xl bg-white border border-[#E8E2D6] p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md inline-block mb-2">
                Step 4 • English Meaning
              </span>
              <p className="font-sans text-[13.5px] text-[#203229] leading-relaxed select-text">
                “{hadith.english}”
              </p>
            </div>
          )}
        </div>
      ) : (
        /* STANDARD / READ MODE */
        <div className="space-y-3.5">
          {/* 1. Arabic Text (RTL) */}
          {hadith.arabic && (
            <div dir="rtl" className="text-right py-1">
              <p className={`font-serif font-bold text-[#14261E] select-text ${arabicSizeClass}`}>
                {hadith.arabic}
              </p>
            </div>
          )}

          {/* Subtle Islamic Divider */}
          <div className="flex items-center justify-center gap-2 text-amber-600/70 py-0.5">
            <span className="h-[1px] w-14 bg-amber-200" />
            <span className="text-xs">❖</span>
            <span className="h-[1px] w-14 bg-amber-200" />
          </div>

          {/* 2. Roman Urdu Transliteration (Prominently styled in italics) */}
          {hadith.romanUrdu && (
            <div className="rounded-xl bg-[#FAF6EE] border border-[#EDE1CB] p-3 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Roman Urdu (تلفظ و پڑھائی)
                </span>
                <span className="text-[10px] text-amber-800 italic">Beginner & Child-Friendly</span>
              </div>
              <p className="font-serif italic text-[13.5px] sm:text-[14px] text-[#55361D] leading-relaxed select-text">
                “{hadith.romanUrdu}”
              </p>
            </div>
          )}

          {/* 3. Urdu Translation (RTL) */}
          {hadith.urdu && (
            <div dir="rtl" className="text-right px-1">
              <p className="font-medium text-[13.5px] sm:text-[14.5px] text-[#0C4E3A] leading-relaxed select-text">
                {hadith.urdu}
              </p>
            </div>
          )}

          {/* 4. English Translation */}
          {hadith.english && isExpanded && (
            <div className="text-left px-1 pt-1">
              <p className="font-sans text-[13px] sm:text-[13.5px] text-[#22352B] leading-relaxed select-text">
                “{hadith.english}”
              </p>
            </div>
          )}

          {/* Narrator chain info if present */}
          {(hadith.englishNarrator || hadith.urduNarrator) && isExpanded && (
            <div className="text-[11px] text-stone-600 pt-1 border-t border-[#F2ECE0] flex flex-wrap gap-2">
              {hadith.englishNarrator && <span>{hadith.englishNarrator}</span>}
            </div>
          )}
        </div>
      )}

      {/* Child-Friendly Reflection Pill / Easy Meaning */}
      <div className="pt-2 border-t border-[#F4EFE6] flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowChildReflect(!showChildReflect)}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0E543F] hover:text-emerald-800 transition cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{showChildReflect ? 'Hide Reflection' : 'Child Reflection & Easy Meaning (آسان مفہوم)'}</span>
          {showChildReflect ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {viewMode !== 'understand' && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[11px] text-stone-600 hover:text-stone-800 flex items-center gap-0.5 cursor-pointer ml-auto"
          >
            <span>{isExpanded ? 'Compact' : 'Full Translation'}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Collapsible Child Reflection Box */}
      {showChildReflect && (
        <div className="rounded-2xl bg-[#EAF5EF] border border-[#CFE5D8] p-3.5 text-left space-y-1.5 animate-fade-in">
          <div className="flex items-center gap-1.5 text-[#0C4E3A]">
            <HelpCircle className="w-4 h-4 text-emerald-700" />
            <h4 className="text-[12px] font-bold text-[#14261E]">
              Key Lesson for Young Hearts (اہم سبق)
            </h4>
          </div>
          <p className="text-[11.5px] text-[#2A4436] leading-relaxed">
            {hadith.headingEnglish
              ? `Topic: ${hadith.headingEnglish}. Always remember to put good intentions into every small deed you do for Allah!`
              : 'Every good deed begins in the pure intention of our hearts. When we pray, help our family, or speak truth, Allah rewards us for the kindness in our hearts.'}
          </p>
          <p dir="rtl" className="text-[11px] text-[#0C4E3A] font-medium leading-relaxed">
            ہمارا ہر اچھا کام سچی اور نیک نیت سے شروع ہونا چاہیے تاکہ اللہ تعالیٰ خوش ہو۔
          </p>
        </div>
      )}
    </article>
  );
};
