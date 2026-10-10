import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  fetchDailyHadith,
  fetchBilingualHadith,
  fetchSingleHadith,
} from '../api/hadithClient';
import type {
  BilingualHadith,
  DailyHadithData,
  SingleHadith,
} from '../types/hadith';

/**
 * Query Key Factory for Hadith domain
 * Keeps cache invalidation and prefetching organized
 */
export const hadithKeys = {
  all: ['hadith'] as const,
  daily: (date?: string, edition?: string) =>
    ['hadith', 'daily', date || 'today', edition || 'eng-bukhari'] as const,
  bilingual: (book: string, hadithNumber: number) =>
    ['hadith', 'bilingual', book.toLowerCase(), hadithNumber] as const,
  single: (edition: string, hadithNumber: number) =>
    ['hadith', 'single', edition, hadithNumber] as const,
};

/**
 * Custom Hook: Fetch Daily Hadith (Hadith of the Day)
 * - staleTime: 12 Hours (Daily hadith only rotates once per calendar day)
 * - gcTime: 24 Hours
 */
export function useDailyHadith(options?: {
  date?: string;
  edition?: string;
  enabled?: boolean;
}): UseQueryResult<DailyHadithData, Error> {
  const { date, edition = 'eng-bukhari', enabled = true } = options || {};

  return useQuery({
    queryKey: hadithKeys.daily(date, edition),
    queryFn: () => fetchDailyHadith(date, edition),
    staleTime: 1000 * 60 * 60 * 12, // 12 hours
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 2,
    enabled,
    refetchOnWindowFocus: false,
  });
}

/**
 * Custom Hook: Fetch Bilingual Hadith (Arabic + English)
 * - staleTime: Infinity (Hadith scriptures are immutable and never mutate)
 * - gcTime: 24 Hours
 */
export function useBilingualHadith(
  book = 'bukhari',
  hadithNumber: number,
  options?: { enabled?: boolean }
): UseQueryResult<BilingualHadith, Error> {
  const isEnabled =
    Boolean(book && hadithNumber > 0) && (options?.enabled ?? true);

  return useQuery({
    queryKey: hadithKeys.bilingual(book, hadithNumber),
    queryFn: () => fetchBilingualHadith(book, hadithNumber),
    staleTime: Infinity, // Immutable data
    gcTime: 1000 * 60 * 60 * 24, // 24 hours in cache
    retry: 1,
    enabled: isEnabled,
    refetchOnWindowFocus: false,
  });
}

/**
 * Custom Hook: Fetch Single Hadith by Edition and Number
 */
export function useSingleHadith(
  hadithNumber: number,
  edition = 'eng-bukhari',
  options?: { enabled?: boolean }
): UseQueryResult<SingleHadith, Error> {
  const isEnabled =
    Boolean(hadithNumber > 0) && (options?.enabled ?? true);

  return useQuery({
    queryKey: hadithKeys.single(edition, hadithNumber),
    queryFn: () => fetchSingleHadith(hadithNumber, edition),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
    enabled: isEnabled,
    refetchOnWindowFocus: false,
  });
}
