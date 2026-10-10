import { Router } from 'express';
import {
  getUserStatsHandler,
  upsertUserHandler,
  listUsersHandler,
} from '../controllers/userController.js';
import { protectRoute, restrictTo } from '../middlewares/authMiddleware.js';

export const userRouter = Router();

// GET /api/user/:id/stats (Protected user stats)
userRouter.get('/user/:id/stats', protectRoute, getUserStatsHandler);

// User profile management
userRouter.post('/users', protectRoute, upsertUserHandler);

// Admin-only listing of all active registered users
userRouter.get('/users', protectRoute, restrictTo('ADMIN'), listUsersHandler);
