import React, { useState } from 'react';
import { useDailyHadith, useBilingualHadith } from '../hooks/useHadithQuery';
import { BilingualHadithCard } from './BilingualHadithCard';
import { Sparkles, Calendar } from 'lucide-react';

export const DailyHadithSection: React.FC = () => {
  const [hadithNumberOverride, setHadithNumberOverride] = useState<number | null>(null);

  // 1. Fetch deterministic Hadith of the Day
  const dailyQuery = useDailyHadith();

  // Selected number: either user's override (Next button) or today's seed number
  const activeNumber = hadithNumberOverride || dailyQuery.data?.dailySeedNumber || 1;

  // 2. Fetch bilingual (Arabic + English) content for active number
  const bilingualQuery = useBilingualHadith('bukhari', activeNumber, {
    enabled: Boolean(dailyQuery.data?.dailySeedNumber || hadithNumberOverride),
  });

  const isLoading = dailyQuery.isPending || bilingualQuery.isPending;
  const isError = dailyQuery.isError || bilingualQuery.isError;
  const errorMessage =
    dailyQuery.error?.message ||
    bilingualQuery.error?.message ||
    'Failed to load Hadith. Please check your network connection.';

  const handleNextHadith = () => {
    // Increment to next Hadith in Sahih al-Bukhari (wrap around 2000)
    setHadithNumberOverride((prev) => ((prev || activeNumber) % 2000) + 1);
  };

  const handleRetry = () => {
    if (dailyQuery.isError) dailyQuery.refetch();
    if (bilingualQuery.isError) bilingualQuery.refetch();
  };

  return (
    <div className="w-full space-y-3">
      {/* Header with Islamic Calendar Tag */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#0E543F]" />
          <h3 className="text-sm font-bold text-[#14261E]">
            {hadithNumberOverride ? 'Hadith Explorer' : 'Hadith of the Day (حدیثِ نبوی)'}
          </h3>
        </div>

        {dailyQuery.data && !hadithNumberOverride && (
          <span className="text-[10.5px] font-semibold text-[#0E543F] bg-[#EBF5EF] px-2 py-0.5 rounded-full flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Day {dailyQuery.data.dayOfYear} of {dailyQuery.data.year}</span>
          </span>
        )}
      </div>

      {/* Render Bilingual Hadith Card */}
      <BilingualHadithCard
        hadith={bilingualQuery.data}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={handleRetry}
        onNext={handleNextHadith}
      />
    </div>
  );
};
