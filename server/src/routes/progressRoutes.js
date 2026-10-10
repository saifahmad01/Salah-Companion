import { Router } from 'express';
import { getProgressSummary } from '../controllers/progressController.js';
import { protectRoute } from '../middlewares/authMiddleware.js';

export const progressRouter = Router();

// GET /api/progress/summary - Protected endpoint for Progress & Analytics screen
progressRouter.get('/summary', protectRoute, getProgressSummary);
