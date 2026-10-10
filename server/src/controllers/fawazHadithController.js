import {
  getSingleHadith,
  getBilingualHadith,
  getDailyHadith,
  HadithNotFoundError,
  HadithUpstreamError,
} from '../services/fawazHadithService.js';
import { hadithCache } from '../utils/cache.js';

/**
 * GET /api/hadith/single
 * Query Params: edition (default: 'eng-bukhari'), hadithNumber (required)
 */
export async function getSingleHadithController(req, res, next) {
  try {
    const { edition, hadithNumber } = req.query;

    const hadith = await getSingleHadith(edition, Number(hadithNumber));

    return res.status(200).json({
      success: true,
      data: hadith,
    });
  } catch (error) {
    handleHadithError(error, res, next);
  }
}

/**
 * GET /api/hadith/bilingual
 * Query Params: book (default: 'bukhari'), hadithNumber (required)
 */
export async function getBilingualHadithController(req, res, next) {
  try {
    const { book, hadithNumber } = req.query;

    const bilingual = await getBilingualHadith(book, Number(hadithNumber));

    return res.status(200).json({
      success: true,
      data: bilingual,
    });
  } catch (error) {
    handleHadithError(error, res, next);
  }
}

/**
 * GET /api/hadith/daily
 * Query Params: date (optional 'YYYY-MM-DD'), edition (default: 'eng-bukhari')
 */
export async function getDailyHadithController(req, res, next) {
  try {
    const { date, edition } = req.query;

    const daily = await getDailyHadith(date, edition);

    return res.status(200).json({
      success: true,
      data: daily,
    });
  } catch (error) {
    handleHadithError(error, res, next);
  }
}

/**
 * GET /api/hadith/cache/metrics
 * Optional monitoring endpoint to inspect cache hit rate and stored items
 */
export async function getCacheMetricsController(req, res) {
  return res.status(200).json({
    success: true,
    cache: hadithCache.getMetrics(),
  });
}

/**
 * Centralized error handler for Hadith controller actions
 */
function handleHadithError(error, res, next) {
  if (error instanceof HadithNotFoundError || error.statusCode === 404) {
    return res.status(404).json({
      success: false,
      error: error.message,
      code: 'HADITH_NOT_FOUND',
      edition: error.edition,
      hadithNumber: error.hadithNumber,
    });
  }

  if (error instanceof HadithUpstreamError) {
    return res.status(error.statusCode || 502).json({
      success: false,
      error: error.message,
      code: error.statusCode === 504 ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_GATEWAY_ERROR',
    });
  }

  next(error);
}
