import { Router } from 'express';
import { getHadithHandler } from '../controllers/hadithController.js';
import {
  getSingleHadithController,
  getBilingualHadithController,
  getDailyHadithController,
  getCacheMetricsController,
} from '../controllers/fawazHadithController.js';
import {
  getHadithsController,
  getVerifiedBooksController,
} from '../controllers/hadithApiController.js';
import { validateQuery } from '../middlewares/authMiddleware.js';
import {
  singleHadithQuerySchema,
  bilingualHadithQuerySchema,
  dailyHadithQuerySchema,
} from '../schemas/fawazHadithSchema.js';

export const hadithRouter = Router();

// ============================================================================
// Official HadithAPI.com Learning Module Routes (/api/hadiths)
// ============================================================================

/**
 * GET /api/hadiths
 * Primary endpoint for Hadith Learning Module
 * Query params: book, hadithNumber, page, paginate
 */
hadithRouter.get('/hadiths', getHadithsController);

/**
 * GET /api/hadiths/books
 * Returns verified collection metadata
 */
hadithRouter.get('/hadiths/books', getVerifiedBooksController);

// ============================================================================
// Fawaz Ahmed CDN Hadith API Routes (/api/hadith/...)
// ============================================================================

/**
 * GET /api/hadith/single
 * Query Params: edition (default: 'eng-bukhari'), hadithNumber (required)
 */
hadithRouter.get(
  '/hadith/single',
  validateQuery(singleHadithQuerySchema),
  getSingleHadithController
);

/**
 * GET /api/hadith/bilingual
 * Query Params: book (default: 'bukhari'), hadithNumber (required)
 */
hadithRouter.get(
  '/hadith/bilingual',
  validateQuery(bilingualHadithQuerySchema),
  getBilingualHadithController
);

/**
 * GET /api/hadith/daily
 * Query Params: date (optional 'YYYY-MM-DD'), edition (default: 'eng-bukhari')
 */
hadithRouter.get(
  '/hadith/daily',
  validateQuery(dailyHadithQuerySchema),
  getDailyHadithController
);

/**
 * GET /api/hadith/cache/metrics
 * Returns in-memory cache hit rate, size, and statistics
 */
hadithRouter.get('/hadith/cache/metrics', getCacheMetricsController);

/**
 * Existing Status-tailored Hadith Endpoint
 * GET /api/hadith?status={on_time|late|missed}
 */
hadithRouter.get('/hadith', getHadithHandler);
