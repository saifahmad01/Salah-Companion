import { hadithCache } from '../utils/cache.js';

const CDN_BASE_URL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1';
const REQUEST_TIMEOUT_MS = 6000; // 6 seconds timeout

/**
 * Custom Error for Missing Hadiths (404)
 */
export class HadithNotFoundError extends Error {
  constructor(message, edition, hadithNumber) {
    super(message);
    this.name = 'HadithNotFoundError';
    this.statusCode = 404;
    this.edition = edition;
    this.hadithNumber = hadithNumber;
  }
}

/**
 * Custom Error for Upstream CDN or Network Failures (502 / 504)
 */
export class HadithUpstreamError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'HadithUpstreamError';
    this.statusCode = statusCode;
  }
}

/**
 * Fetches raw JSON for a given edition and hadith number from Fawaz Ahmed CDN
 * Utilizes in-memory caching and AbortController timeout.
 * 
 * @param {string} edition e.g., 'eng-bukhari', 'ara-bukhari'
 * @param {number} hadithNumber e.g., 1, 527
 * @returns {Promise<{ data: any, cached: boolean }>}
 */
export async function fetchHadithFromCdn(edition, hadithNumber) {
  const cacheKey = `fawaz:${edition}:${hadithNumber}`;

  // 1. Check in-memory cache
  const cachedData = hadithCache.get(cacheKey);
  if (cachedData) {
    return { data: cachedData, cached: true };
  }

  // 2. Prepare HTTP request with timeout
  const url = `${CDN_BASE_URL}/editions/${encodeURIComponent(edition)}/${hadithNumber}.json`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SalahCompanion-HadithService/1.0',
      },
    });

    clearTimeout(timeoutId);

    // Fawaz CDN (jsDelivr) returns 403 or 404 if a specific hadith JSON doesn't exist
    if (response.status === 404 || response.status === 403) {
      throw new HadithNotFoundError(
        `Hadith #${hadithNumber} does not exist in edition '${edition}'.`,
        edition,
        hadithNumber
      );
    }

    if (!response.ok) {
      throw new HadithUpstreamError(
        `Upstream Hadith CDN returned ${response.status}: ${response.statusText}`,
        response.status >= 500 ? 502 : response.status
      );
    }

    const json = await response.json();

    if (!json.hadiths || !Array.isArray(json.hadiths) || json.hadiths.length === 0) {
      throw new HadithNotFoundError(
        `Hadith #${hadithNumber} returned empty content in edition '${edition}'.`,
        edition,
        hadithNumber
      );
    }

    // 3. Save immutable Hadith in cache for 24 hours (86,400s)
    hadithCache.set(cacheKey, json, 86400);

    return { data: json, cached: false };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new HadithUpstreamError(
        `Request to upstream Hadith CDN timed out after ${REQUEST_TIMEOUT_MS}ms.`,
        504
      );
    }

    if (error instanceof HadithNotFoundError || error instanceof HadithUpstreamError) {
      throw error;
    }

    throw new HadithUpstreamError(`Failed to fetch from Hadith CDN: ${error.message}`, 502);
  }
}

/**
 * 1. GET /api/hadith/single
 * Fetches and formats a single Hadith from a specified edition
 */
export async function getSingleHadith(edition = 'eng-bukhari', hadithNumber) {
  const { data, cached } = await fetchHadithFromCdn(edition, hadithNumber);
  const hadith = data.hadiths[0];

  const sectionKey = data.metadata?.section ? Object.keys(data.metadata.section)[0] : null;
  const sectionName = sectionKey && data.metadata?.section ? data.metadata.section[sectionKey] : null;

  return {
    edition,
    bookName: data.metadata?.name || edition,
    sectionNumber: sectionKey ? parseInt(sectionKey, 10) : null,
    sectionName,
    hadithNumber: hadith.hadithnumber,
    arabicNumber: hadith.arabicnumber || null,
    text: hadith.text,
    grades: hadith.grades || [],
    reference: hadith.reference || {},
    cached,
  };
}

/**
 * 2. GET /api/hadith/bilingual
 * Concurrently fetches both Arabic ('ara-{book}') and English ('eng-{book}') versions
 */
export async function getBilingualHadith(book = 'bukhari', hadithNumber) {
  const cleanBook = book.trim().toLowerCase().replace(/^(ara-|eng-)/, '');
  const araEdition = `ara-${cleanBook}`;
  const engEdition = `eng-${cleanBook}`;

  const bilingualCacheKey = `bilingual:${cleanBook}:${hadithNumber}`;
  const cachedCombined = hadithCache.get(bilingualCacheKey);
  if (cachedCombined) {
    return { ...cachedCombined, cached: true };
  }

  // Concurrent upstream calls via Promise.all
  const [araResult, engResult] = await Promise.all([
    fetchHadithFromCdn(araEdition, hadithNumber),
    fetchHadithFromCdn(engEdition, hadithNumber),
  ]);

  const araItem = araResult.data.hadiths[0];
  const engItem = engResult.data.hadiths[0];

  const sectionKey = engResult.data.metadata?.section
    ? Object.keys(engResult.data.metadata.section)[0]
    : araResult.data.metadata?.section
    ? Object.keys(araResult.data.metadata.section)[0]
    : null;

  const sectionName =
    (sectionKey && engResult.data.metadata?.section?.[sectionKey]) ||
    (sectionKey && araResult.data.metadata?.section?.[sectionKey]) ||
    null;

  const combined = {
    book: cleanBook,
    hadithNumber,
    arabicNumber: araItem.arabicnumber || engItem.arabicnumber || null,
    arabicText: araItem.text,
    englishText: engItem.text,
    grades: engItem.grades && engItem.grades.length > 0 ? engItem.grades : araItem.grades || [],
    reference: engItem.reference || araItem.reference || {},
    bookName: engResult.data.metadata?.name || araResult.data.metadata?.name || cleanBook,
    sectionNumber: sectionKey ? parseInt(sectionKey, 10) : null,
    sectionName,
    cached: false,
  };

  // Cache combined result for 24 hours
  hadithCache.set(bilingualCacheKey, combined, 86400);

  return combined;
}

/**
 * 3. GET /api/hadith/daily
 * Computes a deterministic "Hadith of the Day" using calendar day-of-year seed
 */
export async function getDailyHadith(dateStr, edition = 'eng-bukhari') {
  const targetDate = dateStr ? new Date(`${dateStr}T00:00:00Z`) : new Date();

  // Compute day of year (1-366)
  const startOfYear = new Date(Date.UTC(targetDate.getUTCFullYear(), 0, 1));
  const diffMs = targetDate.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
  const year = targetDate.getUTCFullYear();
  const dateKey = targetDate.toISOString().split('T')[0];

  const dailyCacheKey = `daily:${edition}:${dateKey}`;
  const cachedDaily = hadithCache.get(dailyCacheKey);
  if (cachedDaily) {
    return { ...cachedDaily, cached: true };
  }

  // Sahih al-Bukhari foundational hadiths (first 1,500 hadiths cover primary pillars)
  // Seed calculation creates consistent, day-specific rotation
  const totalBukhariKeyPool = 1500;
  const deterministicNumber = (((year * 366) + (dayOfYear * 29)) % totalBukhariKeyPool) + 1;

  const hadithResult = await getSingleHadith(edition, deterministicNumber);

  const dailyPayload = {
    date: dateKey,
    dayOfYear,
    year,
    dailySeedNumber: deterministicNumber,
    hadith: hadithResult,
    cached: false,
  };

  // Cache until end of today (or 24 hours)
  hadithCache.set(dailyCacheKey, dailyPayload, 86400);

  return dailyPayload;
}
