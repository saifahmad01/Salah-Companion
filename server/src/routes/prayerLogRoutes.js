import { Router } from 'express';
import {
  logPrayer,
  getTodayPrayers,
  getWeeklyPrayers,
  getPrayerHistory,
  getPrayerAnalytics,
  updatePrayerLog,
  deletePrayerLog,
} from '../controllers/prayerLogController.js';
import { protectRoute, requireVerifiedEmail, validateBody } from '../middlewares/authMiddleware.js';
import { logPrayerInputSchema } from '../schemas/prayerLogSchema.js';

export const prayerLogRouter = Router();

// Enforce authentication & verified email status on all prayer log routes
prayerLogRouter.use(protectRoute);
prayerLogRouter.use(requireVerifiedEmail);

// POST /api/prayers/log - Upsert prayer log with dynamic Hadith
prayerLogRouter.post('/log', validateBody(logPrayerInputSchema), logPrayer);

// GET /api/prayers/weekly?startDate=YYYY-MM-DD - Structured 7-day weekly overview with statistics
prayerLogRouter.get('/weekly', getWeeklyPrayers);

// GET /api/prayers/today - Today's completion status out of 5
prayerLogRouter.get('/today', getTodayPrayers);

// GET /api/prayers/history?days=7 - Completion history grouped by date
prayerLogRouter.get('/history', getPrayerHistory);

// GET /api/prayers/analytics - Today's count, weekly breakdown %, and continuous streaks
prayerLogRouter.get('/analytics', getPrayerAnalytics);

// PATCH /api/prayers/log/:id (or /api/prayers/:id) - Update prayer status or notes
prayerLogRouter.patch('/log/:id', updatePrayerLog);
prayerLogRouter.patch('/:id', updatePrayerLog);

// DELETE /api/prayers/log/:id (or /api/prayers/:id, /api/prayers/log, /api/prayers) - Delete/reset prayer log (ownership verified)
prayerLogRouter.delete('/log/:id', deletePrayerLog);
prayerLogRouter.delete('/:id', deletePrayerLog);
prayerLogRouter.delete('/log', deletePrayerLog);
prayerLogRouter.delete('/', deletePrayerLog);

