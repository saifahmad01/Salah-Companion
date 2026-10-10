import { getHadithByStatus } from '../services/hadithService.js';

/**
 * Controller to fetch authentic Hadith based on prayer status
 * GET /api/hadith?status={on_time|late|missed}&index={number}
 */
export async function getHadithHandler(req, res, next) {
  try {
    const { status, index } = req.query;

    const validStatuses = ['on_time', 'late', 'missed'];
    const queryStatus = (status || 'on_time').toLowerCase().replace('-', '_');

    if (status && !validStatuses.includes(queryStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status parameter. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const parsedIndex = typeof index !== 'undefined' ? parseInt(index, 10) : null;
    const result = getHadithByStatus(queryStatus, isNaN(parsedIndex) ? null : parsedIndex);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
