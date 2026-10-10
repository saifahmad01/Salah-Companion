import { useQuery, keepPreviousData, type UseQueryResult } from '@tanstack/react-query';
import {
  fetchHadiths,
  fetchVerifiedBooks,
  type FetchHadithsParams,
} from '../api/hadithModuleApi';
import type {
  HadithsApiResponse,
  VerifiedBook,
} from '../types/hadithModule';

/**
 * Query Key Factory for Hadith Module
 */
export const hadithModuleKeys = {
  all: ['hadithModule'] as const,
  list: (params: FetchHadithsParams) => [
    'hadithModule',
    'list',
    params.book || 'sahih-bukhari',
    params.page || 1,
    params.paginate || 10,
    params.hadithNumber || 'all',
  ] as const,
  books: () => ['hadithModule', 'books'] as const,
};

/**
 * Hook to fetch paginated Hadiths with TanStack Query caching
 */
export function useHadithsListQuery(
  params: FetchHadithsParams = {},
  options?: { enabled?: boolean }
): UseQueryResult<HadithsApiResponse, Error> {
  return useQuery({
    queryKey: hadithModuleKeys.list(params),
    queryFn: () => fetchHadiths(params),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
    gcTime: 1000 * 60 * 60, // 1 hour memory retention
    placeholderData: keepPreviousData, // Smooth pagination transitions
    retry: 1,
    enabled: options?.enabled ?? true,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch verified Hadith collections metadata
 */
export function useVerifiedBooksQuery(): UseQueryResult<VerifiedBook[], Error> {
  return useQuery({
    queryKey: hadithModuleKeys.books(),
    queryFn: fetchVerifiedBooks,
    staleTime: Infinity, // Static metadata
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
  });
}
