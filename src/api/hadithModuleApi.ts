import type {
  HadithsApiResponse,
  BooksApiResponse,
  VerifiedBook,
} from '../types/hadithModule';

import { PRIMARY_BASE_URL } from '../services/backendApi';
const FALLBACK_BASE_URL = 'http://localhost:4000/api';

/**
 * Resilient fetcher with automatic fallback to port 4000
 */
async function fetchWithFallback<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
  } catch {
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
          'Unable to connect to Salah Companion backend server. Please ensure the backend is running.'
        );
      }
    } else {
      throw new Error(
        'Unable to connect to Salah Companion backend server. Please ensure the backend is running.'
      );
    }
  }

  const json = await response.json().catch(() => ({
    success: false,
    error: `Invalid response format from server (${response.status})`,
  }));

  if (!response.ok || !json.success) {
    const errorMsg = json.error || `Server responded with status ${response.status}: ${response.statusText}`;
    throw new Error(errorMsg);
  }

  return json;
}

export interface FetchHadithsParams {
  book?: string;
  hadithNumber?: string | number | null;
  page?: number;
  paginate?: number;
}

/**
 * Fetch paginated Hadiths from backend (backed by HadithAPI.com)
 * GET /api/hadiths?book={book}&hadithNumber={num}&page={page}&paginate={paginate}
 */
export async function fetchHadiths(params: FetchHadithsParams = {}): Promise<HadithsApiResponse> {
  const queryParams = new URLSearchParams();

  if (params.book) queryParams.set('book', params.book);
  if (params.hadithNumber) queryParams.set('hadithNumber', String(params.hadithNumber).trim());
  if (params.page) queryParams.set('page', String(params.page));
  if (params.paginate) queryParams.set('paginate', String(params.paginate));

  const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return await fetchWithFallback<HadithsApiResponse>(`/hadiths${qs}`);
}

/**
 * Fetch verified Hadith books metadata
 * GET /api/hadiths/books
 */
export async function fetchVerifiedBooks(): Promise<VerifiedBook[]> {
  const response = await fetchWithFallback<BooksApiResponse>('/hadiths/books');
  return response.data || [];
}
