import { Router } from 'express';
import { authRouter } from './authRoutes.js';
import { prayerRouter } from './prayerRoutes.js';
import { prayerLogRouter } from './prayerLogRoutes.js';
import { progressRouter } from './progressRoutes.js';
import { hadithRouter } from './hadithRoutes.js';
import { userRouter } from './userRoutes.js';
import { notificationRouter } from './notificationRoutes.js';

export const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Salah Companion Backend',
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

