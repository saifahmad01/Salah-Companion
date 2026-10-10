import { Router } from 'express';
import {
  logPrayer,
  getTodayPrayers,
  getPrayerHistory,
  getPrayerAnalytics,
  deletePrayerLog,
} from '../controllers/prayerLogController.js';
import { protectRoute, validateBody } from '../middlewares/authMiddleware.js';
import { logPrayerInputSchema } from '../schemas/prayerLogSchema.js';

export const prayerLogRouter = Router();

// Enforce authentication on all prayer log routes
prayerLogRouter.use(protectRoute);

// POST /api/prayers/log - Upsert prayer log with dynamic Hadith
prayerLogRouter.post('/log', validateBody(logPrayerInputSchema), logPrayer);

// GET /api/prayers/today - Today's completion status out of 5
prayerLogRouter.get('/today', getTodayPrayers);

// GET /api/prayers/history?days=7 - Completion history grouped by date
prayerLogRouter.get('/history', getPrayerHistory);

// GET /api/prayers/analytics - Today's count, weekly breakdown %, and continuous streaks
prayerLogRouter.get('/analytics', getPrayerAnalytics);

// DELETE /api/prayers/log/:id - Delete/reset prayer log (ownership verified)
prayerLogRouter.delete('/log/:id', deletePrayerLog);
