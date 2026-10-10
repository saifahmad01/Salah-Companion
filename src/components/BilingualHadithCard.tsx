import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  Share2,
  AlertCircle,
  BookOpen,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import type { BilingualHadith, HadithGrade } from '../types/hadith';

export interface BilingualHadithCardProps {
  hadith?: BilingualHadith | null;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  onNext?: () => void;
  title?: string;
}

/**
 * Format and color-code Hadith grades (Sahih, Hasan, Da'if)
 */
function getGradeBadge(grades?: HadithGrade[]) {
  if (!grades || grades.length === 0) {
    return {
      label: 'Sahih (صحيح)',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  }

  const primary = grades[0];
  const gradeLower = primary.grade.toLowerCase();

  if (gradeLower.includes('sahih')) {
    return {
      label: `${primary.grade}${primary.name ? ` • ${primary.name}` : ''}`,
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  } else if (gradeLower.includes('hasan')) {
    return {
      label: `${primary.grade}${primary.name ? ` • ${primary.name}` : ''}`,
      color: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  } else {
    return {
      label: `${primary.grade}${primary.name ? ` • ${primary.name}` : ''}`,
      color: 'bg-stone-100 text-stone-700 border-stone-200',
    };
  }
}

export const BilingualHadithCard: React.FC<BilingualHadithCardProps> = ({
  hadith,
  isLoading = false,
  isError = false,
  errorMessage = 'Failed to load Hadith. Please try again.',
  onRetry,
  onNext,
  title,
}) => {
  const [copied, setCopied] = useState(false);

  // Copy combined Arabic + English Hadith to clipboard
  const handleCopy = async () => {
    if (!hadith) return;

    const copyText = `${hadith.bookName} - Hadith #${hadith.hadithNumber}\n${hadith.sectionName ? `Chapter: ${hadith.sectionName}\n\n` : '\n'}${hadith.arabicText}\n\nTranslation:\n"${hadith.englishText}"\n\n— Shared via Salah Companion`;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = copyText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy Hadith to clipboard:', err);
    }
  };

  // Native share dialog if available
  const handleShare = async () => {
    if (!hadith) return;
    if (navigator?.share) {
      try {
        await navigator.share({
          title: `${hadith.bookName} #${hadith.hadithNumber}`,
          text: `"${hadith.englishText.slice(0, 150)}..."\n\n${hadith.bookName} #${hadith.hadithNumber}`,
          url: window.location.href,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  // 1. Loading Skeleton State
  if (isLoading) {
    return (
      <div className="w-full rounded-[24px] bg-white border border-[#EDE8DC] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-36 bg-[#EBE7DD] rounded-full" />
          <div className="h-5 w-24 bg-[#EBE7DD] rounded-full" />
        </div>

        {/* Arabic Skeleton */}
        <div className="space-y-2.5 my-6 flex flex-col items-end">
          <div className="h-4.5 w-full bg-[#EBE7DD] rounded-md" />
          <div className="h-4.5 w-4/5 bg-[#EBE7DD] rounded-md" />
          <div className="h-4.5 w-3/5 bg-[#EBE7DD] rounded-md" />
        </div>

        {/* Divider */}
        <div className="h-[1px] w-full bg-[#F0EDE4] my-5" />

        {/* English Skeleton */}
        <div className="space-y-2.5 my-4">
          <div className="h-4 w-full bg-[#EBE7DD] rounded-md" />
          <div className="h-4 w-11/12 bg-[#EBE7DD] rounded-md" />
          <div className="h-4 w-2/3 bg-[#EBE7DD] rounded-md" />
        </div>

        {/* Action Buttons Skeleton */}
        <div className="flex items-center justify-between pt-4 border-t border-[#F0EDE4] mt-4">
          <div className="h-8 w-24 bg-[#EBE7DD] rounded-xl" />
          <div className="h-8 w-24 bg-[#EBE7DD] rounded-xl" />
        </div>
      </div>
    );
  }

  // 2. Error State Banner
  if (isError) {
    return (
      <div className="w-full rounded-[24px] bg-[#FFF8F8] border border-rose-200 p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-rose-900">
              Unable to load Hadith
            </h4>
            <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
              {errorMessage}
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!hadith) return null;

  const gradeInfo = getGradeBadge(hadith.grades);

  return (
    <div className="w-full rounded-[24px] bg-white border border-[#EDE8DC] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-[#F0EDE4]">
        <div className="flex items-center gap-2">
          {/* Book & Hadith Number Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF5EF] border border-[#CEE5D8] text-[11.5px] font-bold text-[#0E543F]">
            <BookOpen className="w-3.5 h-3.5" />
            <span>
              {hadith.bookName} #{hadith.hadithNumber}
            </span>
          </div>

          {/* Optional Chapter Title */}
          {hadith.sectionName && (
            <span className="hidden sm:inline-block text-xs font-medium text-[#65776E] truncate max-w-[200px]">
              {hadith.sectionName}
            </span>
          )}
        </div>

        {/* Authenticity Grade Pill */}
        <div
          className={`inline-flex items-center gap-1 px-2.5 py-0.8 rounded-full border text-[11px] font-semibold ${gradeInfo.color}`}
          title={gradeInfo.label}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="truncate max-w-[160px]">{gradeInfo.label}</span>
        </div>
      </div>

      {/* Section Subheading (if passed as title, e.g. "Hadith of the Day") */}
      {title && (
        <div className="flex items-center gap-1.5 mt-3 mb-2 text-xs font-bold text-[#0E543F]">
          <Sparkles className="w-3.5 h-3.5 text-[#0E543F]" />
          <span>{title}</span>
        </div>
      )}

      {/* Arabic Script Section */}
      <div className="mt-4 mb-5">
        <p
          dir="rtl"
          lang="ar"
          className="text-[19px] sm:text-[21px] text-[#14261E] font-serif leading-[2.1] text-right tracking-wide select-text selection:bg-emerald-100 selection:text-emerald-900"
          style={{ fontFamily: "'Traditional Arabic', 'Amiri', 'Scheherazade New', 'Lateef', serif" }}
        >
          {hadith.arabicText}
        </p>
      </div>

      {/* Elegant Separator with Central Islamic Diamond Ornament */}
      <div className="relative flex items-center justify-center my-4">
        <div className="w-full border-t border-[#EFEAE0]"></div>
        <div className="absolute px-3 bg-white text-[#9CA9A1] text-xs">
          ✦ ✦ ✦
        </div>
      </div>

      {/* English Translation Section */}
      <div className="mt-3 mb-5">
        <p className="text-[13.5px] sm:text-[14.5px] text-[#2C3E35] leading-relaxed font-normal select-text selection:bg-emerald-100 selection:text-emerald-900">
          "{hadith.englishText}"
        </p>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between pt-3.5 border-t border-[#F0EDE4] text-xs">
        {/* Left Actions: Copy & Share */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition active:scale-95 cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-[#F5F2EA] hover:bg-[#EBE6DB] text-[#26372E]'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleShare}
            aria-label="Share Hadith"
            className="p-1.5 rounded-xl bg-[#F5F2EA] hover:bg-[#EBE6DB] text-[#26372E] transition active:scale-95 cursor-pointer"
            title="Share Hadith"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Action: Next / Refresh Button */}
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0E543F] hover:bg-[#093d2d] text-white font-semibold shadow-xs transition active:scale-95 cursor-pointer"
          >
            <span>Next Hadith</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
