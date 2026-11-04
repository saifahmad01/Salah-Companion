import { prisma } from '../db/prisma.js';
import { createReadingLogSchema, updateWordProgressSchema } from '../schemas/quranSchema.js';
import { getLocalDateKey } from '../utils/dateUtils.js';

/**
 * POST /api/quran/reading
 * Log today's Quran reading session
 */
export async function logReadingSession(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
    }

    const validation = createReadingLogSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }

    const data = validation.data;
    const readingDate = data.date || getLocalDateKey();
    const pagesRead = data.endPage - data.startPage + 1;
    const rukusRead = data.endRuku - data.startRuku + 1;

    // 1. Create reading log entry
    const log = await prisma.quranReadingLog.create({
      data: {
        userId,
        date: readingDate,
        surahName: data.surahName,
        startPage: data.startPage,
        endPage: data.endPage,
        startRuku: data.startRuku,
        endRuku: data.endRuku,
        pagesRead,
        rukusRead,
        notes: data.notes || null,
      },
    });

    // 2. Automatically record Quran deed in DeedLog for daily deeds checklist sync
    try {
      await prisma.deedLog.upsert({
        where: {
          userId_deedType_date: {
            userId,
            deedType: 'quran',
            date: readingDate,
          },
        },
        update: {
          completed: true,
          title: `Read Surah ${data.surahName} (pp. ${data.startPage}-${data.endPage})`,
        },
        create: {
          userId,
          deedType: 'quran',
          date: readingDate,
          title: `Read Surah ${data.surahName} (pp. ${data.startPage}-${data.endPage})`,
          completed: true,
        },
      });
    } catch (deedErr) {
      console.warn('[QuranController] DeedLog sync non-critical warning:', deedErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Quran reading successfully recorded!',
      data: log,
    });
  } catch (err) {
    console.error('[QuranController] Error logging reading:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to record Quran reading session',
      message: err.message,
    });
  }
}

/**
 * GET /api/quran/reading
 * Get user reading statistics, summary dashboard, and grouped history
 */
export async function getReadingDashboard(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const today = getLocalDateKey();

    // Fetch all logs for this user
    const logs = await prisma.quranReadingLog.findMany({
      where: { userId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    // Aggregate metrics
    let totalPagesRead = 0;
    let totalRukusRead = 0;
    let todayPagesRead = 0;
    let todayRukusRead = 0;

    for (const log of logs) {
      totalPagesRead += log.pagesRead;
      totalRukusRead += log.rukusRead;
      if (log.date === today) {
        todayPagesRead += log.pagesRead;
        todayRukusRead += log.rukusRead;
      }
    }

    const lastReadingSession = logs.length > 0 ? logs[0] : null;

    // Group logs by date
    const historyGrouped = {};
    for (const log of logs) {
      if (!historyGrouped[log.date]) {
        historyGrouped[log.date] = [];
      }
      historyGrouped[log.date].push(log);
    }

    return res.json({
      success: true,
      data: {
        stats: {
          totalPagesRead,
          totalRukusRead,
          totalSessions: logs.length,
          todayPagesRead,
          todayRukusRead,
        },
        lastReadingSession: lastReadingSession
          ? {
              id: lastReadingSession.id,
              date: lastReadingSession.date,
              surahName: lastReadingSession.surahName,
              lastPage: lastReadingSession.endPage,
              lastRuku: lastReadingSession.endRuku,
              pagesRead: lastReadingSession.pagesRead,
              notes: lastReadingSession.notes,
            }
          : null,
        history: logs,
        historyGrouped,
      },
    });
  } catch (err) {
    console.error('[QuranController] Error fetching reading dashboard:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve reading dashboard',
      message: err.message,
    });
  }
}

/**
 * DELETE /api/quran/reading/:id
 * Delete a specific reading log (strictly isolated to owner)
 */
export async function deleteReadingSession(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const existing = await prisma.quranReadingLog.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Reading log not found or unauthorized' });
    }

    await prisma.quranReadingLog.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Reading session successfully removed',
    });
  } catch (err) {
    console.error('[QuranController] Error deleting reading session:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete reading session',
      message: err.message,
    });
  }
}

/**
 * GET /api/quran/vocabulary/progress
 * Get user vocabulary learned & bookmarked state for the 600 words
 */
export async function getVocabularyProgress(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const records = await prisma.userWordProgress.findMany({
      where: { userId },
    });

    const progressMap = {};
    let learnedCount = 0;
    let bookmarkedCount = 0;

    for (const r of records) {
      progressMap[r.wordId] = {
        isLearned: r.isLearned,
        isBookmarked: r.isBookmarked,
        reviewCount: r.reviewCount,
        lastReviewed: r.lastReviewed,
      };
      if (r.isLearned) learnedCount++;
      if (r.isBookmarked) bookmarkedCount++;
    }

    return res.json({
      success: true,
      data: {
        progressMap,
        learnedCount,
        bookmarkedCount,
        totalWords: 600,
        completionPercent: Math.round((learnedCount / 600) * 100),
      },
    });
  } catch (err) {
    console.error('[QuranController] Error fetching vocabulary progress:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve vocabulary progress',
      message: err.message,
    });
  }
}

/**
 * PUT /api/quran/vocabulary/progress/:wordId
 * Update learned / bookmarked status for a specific word
 */
export async function updateWordProgress(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const wordId = parseInt(req.params.wordId, 10);
    if (isNaN(wordId) || wordId < 1 || wordId > 600) {
      return res.status(400).json({ success: false, error: 'Invalid wordId: must be between 1 and 600' });
    }

    const validation = updateWordProgressSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: 'Invalid payload', details: validation.error.issues });
    }

    const { isLearned, isBookmarked } = validation.data;

    const existing = await prisma.userWordProgress.findUnique({
      where: {
        userId_wordId: { userId, wordId },
      },
    });

    const newLearned = isLearned !== undefined ? isLearned : (existing?.isLearned || false);
    const newBookmarked = isBookmarked !== undefined ? isBookmarked : (existing?.isBookmarked || false);

    const record = await prisma.userWordProgress.upsert({
      where: {
        userId_wordId: { userId, wordId },
      },
      update: {
        isLearned: newLearned,
        isBookmarked: newBookmarked,
        reviewCount: { increment: 1 },
        lastReviewed: new Date(),
      },
      create: {
        userId,
        wordId,
        isLearned: newLearned,
        isBookmarked: newBookmarked,
        reviewCount: 1,
        lastReviewed: new Date(),
      },
    });

    return res.json({
      success: true,
      data: record,
    });
  } catch (err) {
    console.error('[QuranController] Error updating word progress:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update word progress',
      message: err.message,
    });
  }
}

/**
 * POST /api/quran/vocabulary/progress/batch
 * Batch sync vocabulary progress from offline storage
 */
export async function batchSyncWordProgress(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, error: 'updates must be a non-empty array' });
    }

    // Process up to 600 entries in transaction
    const results = [];
    for (const item of updates.slice(0, 600)) {
      const wordId = parseInt(item.wordId, 10);
      if (wordId >= 1 && wordId <= 600) {
        const record = await prisma.userWordProgress.upsert({
          where: {
            userId_wordId: { userId, wordId },
          },
          update: {
            isLearned: Boolean(item.isLearned),
            isBookmarked: Boolean(item.isBookmarked),
            lastReviewed: new Date(),
          },
          create: {
            userId,
            wordId,
            isLearned: Boolean(item.isLearned),
            isBookmarked: Boolean(item.isBookmarked),
            lastReviewed: new Date(),
          },
        });
        results.push(record);
      }
    }

    return res.json({
      success: true,
      message: `Successfully synchronized ${results.length} words`,
      count: results.length,
    });
  } catch (err) {
    console.error('[QuranController] Error batch syncing word progress:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to batch sync vocabulary progress',
      message: err.message,
    });
  }
}

/**
 * GET /api/quran/bookmarks?resourceKey=...
 * Fetch user's saved PDF page bookmarks
 */
export async function getPageBookmarks(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
    }

    const { resourceKey } = req.query;
    const where = { userId };
    if (resourceKey) where.resourceKey = resourceKey;

    const bookmarks = await prisma.quranPageBookmark.findMany({
      where,
      orderBy: { pageNumber: 'asc' },
    });

    return res.json({
      success: true,
      data: bookmarks,
    });
  } catch (err) {
    console.error('[QuranController] Error fetching bookmarks:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve page bookmarks',
      message: err.message,
    });
  }
}

/**
 * POST /api/quran/bookmarks
 * Add or update a page bookmark
 */
export async function upsertPageBookmark(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
    }

    const { resourceKey, pageNumber, title, notes } = req.body;
    if (!resourceKey || typeof pageNumber !== 'number' || pageNumber < 1) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid fields: resourceKey and pageNumber are required',
      });
    }

    const bookmark = await prisma.quranPageBookmark.upsert({
      where: {
        userId_resourceKey_pageNumber: {
          userId,
          resourceKey,
          pageNumber,
        },
      },
      update: {
        title: title || `Page ${pageNumber}`,
        notes: notes || null,
        updatedAt: new Date(),
      },
      create: {
        userId,
        resourceKey,
        pageNumber,
        title: title || `Page ${pageNumber}`,
        notes: notes || null,
      },
    });

    return res.json({
      success: true,
      message: 'Bookmark saved successfully',
      data: bookmark,
    });
  } catch (err) {
    console.error('[QuranController] Error saving bookmark:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to save bookmark',
      message: err.message,
    });
  }
}

/**
 * DELETE /api/quran/bookmarks/:id
 * Remove a saved page bookmark
 */
export async function deletePageBookmark(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
    }

    const { id } = req.params;
    const { resourceKey, pageNumber } = req.query;

    let bookmark = null;
    if (id && id !== 'undefined' && !id.startsWith('local_') && id !== 'by-page') {
      bookmark = await prisma.quranPageBookmark.findFirst({
        where: { id, userId },
      });
    }

    if (!bookmark && resourceKey && pageNumber) {
      bookmark = await prisma.quranPageBookmark.findFirst({
        where: {
          userId,
          resourceKey,
          pageNumber: parseInt(pageNumber, 10),
        },
      });
    }

    if (!bookmark) {
      return res.json({
        success: true,
        message: 'Bookmark already removed or not found',
        id: id || 'removed',
      });
    }

    await prisma.quranPageBookmark.delete({
      where: { id: bookmark.id },
    });

    return res.json({
      success: true,
      message: 'Bookmark deleted successfully',
      id: bookmark.id,
    });
  } catch (err) {
    console.error('[QuranController] Error deleting bookmark:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete bookmark',
      message: err.message,
    });
  }
}

/**
 * GET /api/quran/reading-progress?resourceKey=...
 * Fetch user's persistent reading progress state
 */
export async function getReadingProgressState(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
    }

    const resourceKey = req.query.resourceKey || 'quran-roman-urdu';
    const state = await prisma.quranReadingProgressState.findUnique({
      where: {
        userId_resourceKey: {
          userId,
          resourceKey,
        },
      },
    });

    return res.json({
      success: true,
      data: state || {
        resourceKey,
        lastPage: 1,
        totalPages: resourceKey === 'quran-roman-urdu' ? 608 : 319,
        lastSurah: 'Al-Fatihah',
        lastReadAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[QuranController] Error fetching reading progress state:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch reading progress state',
      message: err.message,
    });
  }
}

/**
 * POST /api/quran/reading-progress
 * Update user's persistent reading progress state
 */
export async function saveReadingProgressState(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
    }

    const { resourceKey, lastPage, totalPages, lastSurah } = req.body;
    if (!resourceKey || typeof lastPage !== 'number' || lastPage < 1) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid fields: resourceKey and lastPage are required',
      });
    }

    const updated = await prisma.quranReadingProgressState.upsert({
      where: {
        userId_resourceKey: {
          userId,
          resourceKey,
        },
      },
      update: {
        lastPage,
        totalPages: totalPages || 608,
        lastSurah: lastSurah || null,
        lastReadAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        userId,
        resourceKey,
        lastPage,
        totalPages: totalPages || 608,
        lastSurah: lastSurah || null,
        lastReadAt: new Date(),
      },
    });

    return res.json({
      success: true,
      message: 'Reading progress updated',
      data: updated,
    });
  } catch (err) {
    console.error('[QuranController] Error saving reading progress state:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to save reading progress state',
      message: err.message,
    });
  }
}

