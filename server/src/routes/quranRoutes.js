import { Router } from 'express';
import { protectRoute } from '../middlewares/authMiddleware.js';
import {
  logReadingSession,
  getReadingDashboard,
  deleteReadingSession,
  getVocabularyProgress,
  updateWordProgress,
  batchSyncWordProgress,
} from '../controllers/quranController.js';
import {
  getQuranResources,
  getQuranResourceByKey,
} from '../controllers/quranResourceController.js';

const router = Router();

// ============================================================================
// Quran & Study PDF Resources (Public Read for Authenticated / App Users)
// ============================================================================

router.get('/resources', getQuranResources);
router.get('/resources/:key', getQuranResourceByKey);

// ============================================================================
// Personal Quran Reading Tracker Endpoints (Protected by JWT)
// ============================================================================


router.post('/reading', protectRoute, logReadingSession);
router.get('/reading', protectRoute, getReadingDashboard);
router.delete('/reading/:id', protectRoute, deleteReadingSession);

// ============================================================================
// User Quranic Vocabulary Progress (Protected by JWT)
// ============================================================================

router.get('/vocabulary/progress', protectRoute, getVocabularyProgress);
router.put('/vocabulary/progress/:wordId', protectRoute, updateWordProgress);
router.post('/vocabulary/progress/batch', protectRoute, batchSyncWordProgress);

export default router;
