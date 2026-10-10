/**
 * TypeScript Interfaces for Fawaz Ahmed Hadith API & Backend Service
 */

export interface HadithGrade {
  name: string;
  grade: string;
}

export interface HadithReference {
  book?: number;
  hadith?: number;
  [key: string]: any;
}

/**
 * Single Hadith representation (e.g. from /hadith/single or inside /hadith/daily)
 */
export interface SingleHadith {
  edition: string;
  bookName: string;
  sectionNumber: number | null;
  sectionName: string | null;
  hadithNumber: number;
  arabicNumber: number | null;
  text: string;
  grades: HadithGrade[];
  reference: HadithReference;
  cached?: boolean;
}

/**
 * Bilingual Hadith representation (from /hadith/bilingual)
 */
export interface BilingualHadith {
  book: string;
  hadithNumber: number;
  arabicNumber: number | null;
  arabicText: string;
  englishText: string;
  grades: HadithGrade[];
  reference: HadithReference;
  bookName: string;
  sectionNumber: number | null;
  sectionName: string | null;
  cached?: boolean;
}

/**
 * Daily Hadith representation (from /hadith/daily)
 */
export interface DailyHadithData {
  date: string;
  dayOfYear: number;
  year: number;
  dailySeedNumber: number;
  hadith: SingleHadith;
  cached?: boolean;
}

/**
 * Standard API Envelope
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  code?: string;
}
