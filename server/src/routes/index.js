import { Router } from 'express';
import { authRouter } from './authRoutes.js';
import { prayerRouter } from './prayerRoutes.js';
import { prayerLogRouter } from './prayerLogRoutes.js';
import { progressRouter } from './progressRoutes.js';
import { hadithRouter } from './hadithRoutes.js';
import { userRouter } from './userRoutes.js';
import { notificationRouter } from './notificationRoutes.js';
import { adminRouter } from './adminRoutes.js';

import { checkDbHealth } from '../db/connection.js';

export const apiRouter = Router();

// Health check endpoint with database status
apiRouter.get('/health', async (req, res) => {
  const dbHealth = await checkDbHealth();
  const statusCode = dbHealth.connected ? 200 : 503;
  res.status(statusCode).json({
    success: dbHealth.connected,
    status: dbHealth.connected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    service: 'Salah Companion Backend',
    database: dbHealth,
  });
});

// Authentication & Profile routes (/api/auth/...)
apiRouter.use('/auth', authRouter);

// Astronomical prayer calculations (/api/prayers?lat=...&lng=...)
apiRouter.use(prayerRouter);

// Core User-scoped Prayer CRUD & Habit tracking (/api/prayers/log, /api/prayers/today, etc.)
apiRouter.use('/prayers', prayerLogRouter);

// Progress & Analytics Screen summary (/api/progress/summary)
apiRouter.use('/progress', progressRouter);

// Status-tailored Hadith routes (/api/hadith)
apiRouter.use(hadithRouter);

// User history & streak stats (/api/user/:id/stats)
apiRouter.use(userRouter);

// Production-ready Salah Notifications (/api/notifications/...)
apiRouter.use('/notifications', notificationRouter);

// Admin Dashboard & Operations (/api/admin/...)
apiRouter.use('/admin', adminRouter);

