import type {
  ApiResponse,
  BilingualHadith,
  DailyHadithData,
  SingleHadith,
} from '../types/hadith';

/**
 * Primary Backend Base URL: configured to http://localhost:5000/api by default
 * with fallbacks to environment variable or port 4000
 */
import { PRIMARY_BASE_URL } from '../services/backendApi';
const FALLBACK_BASE_URL = 'http://localhost:4000/api';

/**
 * Robust fetcher with error normalization and automatic server fallback
 */
async function fetchHadithApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  let usedUrl = `${PRIMARY_BASE_URL}${endpoint}`;

  try {
    response = await fetch(usedUrl, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch (primaryErr) {
    if (import.meta.env.DEV) {
      try {
        usedUrl = `${FALLBACK_BASE_URL}${endpoint}`;
        response = await fetch(usedUrl, {
          ...options,
          headers: {
            'Accept': 'application/json',
            ...(options.headers || {}),
          },
        });
      } catch {
        throw new Error(
          'Unable to connect to Hadith API server. Please ensure the backend is running.'
        );
      }
    } else {
      throw new Error(
        'Unable to connect to Hadith API server. Please ensure the backend is running.'
      );
    }
  }

  const json: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    error: `Invalid response format from server (${response.status})`,
    data: null as any,
  }));

  if (!response.ok || !json.success) {
    const errorMsg = json.error || `Server responded with status ${response.status}: ${response.statusText}`;
    const err = new Error(errorMsg);
    (err as any).status = response.status;
    (err as any).code = json.code;
    throw err;
  }

  return json.data;
}

/**
 * 1. Fetch Daily Hadith (Hadith of the Day)
 * GET /hadith/daily?date=...&edition=...
 */
export async function fetchDailyHadith(
  date?: string,
  edition = 'eng-bukhari'
): Promise<DailyHadithData> {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (edition) params.append('edition', edition);

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return await fetchHadithApi<DailyHadithData>(`/hadith/daily${queryStr}`);
}

/**
 * 2. Fetch Bilingual Hadith (Arabic + English)
 * GET /hadith/bilingual?book=bukhari&hadithNumber=1
 */
export async function fetchBilingualHadith(
  book = 'bukhari',
  hadithNumber: number
): Promise<BilingualHadith> {
  const params = new URLSearchParams({
    book: book.trim().toLowerCase(),
    hadithNumber: hadithNumber.toString(),
  });

  return await fetchHadithApi<BilingualHadith>(`/hadith/bilingual?${params.toString()}`);
}

/**
 * 3. Fetch Single Hadith
 * GET /hadith/single?hadithNumber=1&edition=eng-bukhari
 */
export async function fetchSingleHadith(
  hadithNumber: number,
  edition = 'eng-bukhari'
): Promise<SingleHadith> {
  const params = new URLSearchParams({
    hadithNumber: hadithNumber.toString(),
    edition,
  });

  return await fetchHadithApi<SingleHadith>(`/hadith/single?${params.toString()}`);
}
