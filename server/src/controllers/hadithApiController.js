import { fetchHadithsFromApi, VERIFIED_BOOKS } from '../services/hadithApiService.js';

/**
 * Controller: GET /api/hadiths
 * Supports query params:
 * - book: collection slug (default: 'sahih-bukhari')
 * - hadithNumber: optional specific Hadith number
 * - page: current page number (default: 1)
 * - paginate: page size (default: 10, max: 50)
 */
export async function getHadithsController(req, res, next) {
  try {
    const { book, hadithNumber, page, paginate } = req.query;

    const result = await fetchHadithsFromApi({
      book: book || 'sahih-bukhari',
      hadithNumber: hadithNumber || null,
      page: page ? parseInt(page, 10) : 1,
      paginate: paginate ? parseInt(paginate, 10) : 10,
    });

    res.status(200).json({
      success: true,
      data: result.hadiths,
      pagination: result.pagination,
      cached: result.cached,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: GET /api/hadiths/books
 * Returns list of verified Hadith collections with metadata
 */
export function getVerifiedBooksController(req, res) {
  res.status(200).json({
    success: true,
    data: VERIFIED_BOOKS,
  });
}
