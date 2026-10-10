/**
 * TypeScript Interfaces for the Hadith Learning Module
 * (Backed by official HadithAPI.com via Salah Companion backend)
 */

export interface HadithChapter {
  id?: number | null;
  number?: number | null;
  english?: string | null;
  urdu?: string | null;
  arabic?: string | null;
}

export interface HadithLearningItem {
  id: number;
  collectionName: string;
  bookSlug: string;
  hadithNumber: string;
  status: string | null; // e.g. "Sahih", "Hasan", "Da'if"
  arabic: string | null;
  english: string | null;
  urdu: string | null;
  romanUrdu: string | null;
  chapter: HadithChapter | null;
  englishNarrator: string | null;
  urduNarrator: string | null;
  headingEnglish: string | null;
  headingUrdu: string | null;
  headingArabic: string | null;
  volume?: number | null;
}

export interface PaginationMetadata {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  from: number;
  to: number;
  hasMore: boolean;
}

export interface HadithsApiResponse {
  success: boolean;
  data: HadithLearningItem[];
  pagination: PaginationMetadata;
  cached?: boolean;
  error?: string;
}

export interface VerifiedBook {
  id: number;
  name: string;
  arabicName: string;
  slug: string;
  writer: string;
  totalHadiths: number;
  description: string;
}

export interface BooksApiResponse {
  success: boolean;
  data: VerifiedBook[];
  error?: string;
}

export type HadithViewMode = 'all' | 'read' | 'understand' | 'favorites';

export type FontSizeOption = 'sm' | 'base' | 'lg' | 'xl';
