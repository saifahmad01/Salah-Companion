import axios from 'axios';
import { config } from '../config/env.js';
import { hadithCache } from '../utils/cache.js';
import { transliterateUrdu } from '../utils/transliterateUrdu.js';

// Verified collection metadata from HadithAPI.com
export const VERIFIED_BOOKS = [
  {
    id: 1,
    name: 'Sahih Bukhari',
    arabicName: 'صحيح البخاري',
    slug: 'sahih-bukhari',
    writer: 'Imam Muhammad al-Bukhari',
    totalHadiths: 7563,
    description: 'The most authentic collection of Hadith, compiled by Imam Bukhari.',
  },
  {
    id: 2,
    name: 'Sahih Muslim',
    arabicName: 'صحيح مسلم',
    slug: 'sahih-muslim',
    writer: 'Imam Muslim ibn al-Hajjaj',
    totalHadiths: 7500,
    description: 'The second most authentic Hadith compilation, known for systematic arrangement.',
  },
  {
    id: 4,
    name: "Jami' Al-Tirmidhi",
    arabicName: 'جامع الترمذي',
    slug: 'al-tirmidhi',
    writer: 'Imam Abu Isa al-Tirmidhi',
    totalHadiths: 3956,
    description: 'Distinguished by precise gradings (Sahih, Hasan, Da\'if) for each narration.',
  },
  {
    id: 5,
    name: 'Sunan Abu Dawood',
    arabicName: 'سنن أبي داود',
    slug: 'abu-dawood',
    writer: 'Imam Abu Dawood al-Sijistani',
    totalHadiths: 5274,
    description: 'Focused primarily on Hadiths of legal rulings and practical jurisprudence.',
  },
  {
    id: 6,
    name: 'Sunan Ibn-e-Majah',
    arabicName: 'سنن ابن ماجه',
    slug: 'ibn-e-majah',
    writer: 'Imam Ibn Majah al-Qazwini',
    totalHadiths: 4341,
    description: 'Part of the Kutub al-Sittah containing essential daily guidance.',
  },
  {
    id: 7,
    name: "Sunan An-Nasa'i",
    arabicName: 'سنن النسائي',
    slug: 'sunan-nasai',
    writer: 'Imam Ahmad al-Nasa\'i',
    totalHadiths: 5758,
    description: 'Renowned for rigorous critique of narrators and chain variations.',
  },
  {
    id: 8,
    name: 'Mishkat Al-Masabih',
    arabicName: 'مشكاة المصابيح',
    slug: 'mishkat',
    writer: 'Imam Khatib al-Tabrizi',
    totalHadiths: 5945,
    description: 'Expanded comprehensive compilation of Hadiths on ethics and worship.',
  },
];

// Map user-friendly aliases to official slugs
const SLUG_ALIASES = {
  'bukhari': 'sahih-bukhari',
  'sahih-bukhari': 'sahih-bukhari',
  'muslim': 'sahih-muslim',
  'sahih-muslim': 'sahih-muslim',
  'tirmidhi': 'al-tirmidhi',
  'jami-tirmidhi': 'al-tirmidhi',
  'al-tirmidhi': 'al-tirmidhi',
  'abu-dawood': 'abu-dawood',
  'abudawood': 'abu-dawood',
  'ibn-e-majah': 'ibn-e-majah',
  'ibn-majah': 'ibn-e-majah',
  'nasai': 'sunan-nasai',
  'sunan-nasai': 'sunan-nasai',
  'mishkat': 'mishkat',
};

/**
 * Normalize and validate collection slug
 * @param {string} slug
 * @returns {string}
 */
export function normalizeBookSlug(slug = 'sahih-bukhari') {
  const clean = String(slug).trim().toLowerCase();
  return SLUG_ALIASES[clean] || (VERIFIED_BOOKS.some(b => b.slug === clean) ? clean : 'sahih-bukhari');
}

/**
 * Normalizes an individual Hadith item from HadithAPI.com
 * @param {object} item
 * @returns {object}
 */
function normalizeHadithItem(item) {
  if (!item) return null;

  // Urdu and Roman Urdu transliteration
  const urduText = item.hadithUrdu || null;
  const romanUrduText = urduText ? transliterateUrdu(urduText) : null;

  return {
    id: item.id || null,
    collectionName: item.book?.bookName || item.bookSlug || 'Sahih Bukhari',
    bookSlug: item.bookSlug || 'sahih-bukhari',
    hadithNumber: String(item.hadithNumber || ''),
    status: item.status || null, // Authenticity grade: 'Sahih', 'Hasan', 'Da'if'
    arabic: item.hadithArabic || null,
    english: item.hadithEnglish || null,
    urdu: urduText,
    romanUrdu: romanUrduText,
    chapter: item.chapter
      ? {
          id: item.chapter.id || null,
          number: item.chapter.chapterNumber || null,
          english: item.chapter.chapterEnglish || null,
          urdu: item.chapter.chapterUrdu || null,
          arabic: item.chapter.chapterArabic || null,
        }
      : null,
    englishNarrator: item.englishNarrator || null,
    urduNarrator: item.urduNarrator || null,
    headingEnglish: item.headingEnglish || null,
    headingUrdu: item.headingUrdu || null,
    headingArabic: item.headingArabic || null,
    volume: item.volume || null,
  };
}

/**
 * Fetch and paginate Hadiths from official HadithAPI.com
 * 
 * @param {object} options
 * @param {string} [options.book='sahih-bukhari'] - Collection slug
 * @param {string|number} [options.hadithNumber] - Specific Hadith number
 * @param {number} [options.page=1] - Page number (1-based)
 * @param {number} [options.paginate=10] - Number of items per page (1-50)
 * @returns {Promise<{ hadiths: Array, pagination: object, cached: boolean }>}
 */
export async function fetchHadithsFromApi({
  book = 'sahih-bukhari',
  hadithNumber = null,
  page = 1,
  paginate = 10,
}) {
  const normalizedBook = normalizeBookSlug(book);
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePaginate = Math.min(50, Math.max(1, parseInt(paginate, 10) || 10));
  const safeHadithNumber = hadithNumber ? String(hadithNumber).trim() : null;

  // Build cache key
  const cacheKey = `hadithapi:${normalizedBook}:p${safePage}:limit${safePaginate}:num${safeHadithNumber || 'all'}`;
  const cachedResponse = hadithCache.get(cacheKey);

  if (cachedResponse) {
    return {
      ...cachedResponse,
      cached: true,
    };
  }

  // Build secure query parameters
  const params = {
    apiKey: config.hadithApiKey,
    book: normalizedBook,
    paginate: safePaginate,
    page: safePage,
  };

  if (safeHadithNumber) {
    params.hadithNumber = safeHadithNumber;
  }

  try {
    const response = await axios.get(config.hadithApiBaseUrl, {
      params,
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    const rawData = response.data;

    if (!rawData || (rawData.status && rawData.status !== 200)) {
      throw new Error(rawData?.message || 'External Hadith API returned an unsuccessful status');
    }

    const hadithContainer = rawData.hadiths || rawData;
    const rawList = Array.isArray(hadithContainer.data)
      ? hadithContainer.data
      : Array.isArray(hadithContainer)
      ? hadithContainer
      : hadithContainer.id
      ? [hadithContainer]
      : [];

    // Normalize each Hadith object
    const normalizedList = rawList.map(normalizeHadithItem).filter(Boolean);

    // Normalize pagination metadata
    const pagination = {
      currentPage: hadithContainer.current_page || safePage,
      lastPage: hadithContainer.last_page || 1,
      perPage: hadithContainer.per_page || safePaginate,
      total: hadithContainer.total || normalizedList.length,
      from: hadithContainer.from || (normalizedList.length > 0 ? (safePage - 1) * safePaginate + 1 : 0),
      to: hadithContainer.to || (safePage - 1) * safePaginate + normalizedList.length,
      hasMore: (hadithContainer.current_page || safePage) < (hadithContainer.last_page || 1),
    };

    const result = {
      hadiths: normalizedList,
      pagination,
      cached: false,
    };

    // Cache successful response in memory (TTL from config)
    hadithCache.set(cacheKey, { hadiths: normalizedList, pagination }, config.hadithCacheTtl);

    return result;
  } catch (err) {
    // SECURITY: Ensure API Key is never leaked in error messages or logs
    const sanitizedUrl = config.hadithApiBaseUrl;
    let userFriendlyMessage = 'Failed to fetch Hadiths from upstream service.';

    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      userFriendlyMessage = 'Request to Hadith service timed out. Please try again.';
    } else if (err.response) {
      if (err.response.status === 429) {
        userFriendlyMessage = 'Hadith service rate limit exceeded. Please wait a moment.';
      } else if (err.response.status === 401 || err.response.status === 403) {
        userFriendlyMessage = 'Authentication with Hadith service failed.';
      } else {
        userFriendlyMessage = `Hadith service returned status ${err.response.status}.`;
      }
    }

    const safeError = new Error(userFriendlyMessage);
    safeError.status = err.response?.status || 502;
    safeError.originalMessage = err.message?.replace(config.hadithApiKey, '[REDACTED_API_KEY]');
    throw safeError;
  }
}
