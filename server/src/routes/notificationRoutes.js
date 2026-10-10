import { Router } from 'express';
import { optionalAuth } from '../middlewares/authMiddleware.js';
import {
  getVapidPublicKey,
  getPreferences,
  updatePreferences,
  subscribePush,
  unsubscribePush,
  getHistory,
  markRead,
  markAllRead,
  testNotification,
} from '../controllers/notificationController.js';

export const notificationRouter = Router();

// Public VAPID key for browser Web Push registration
notificationRouter.get('/vapid-public-key', getVapidPublicKey);

// User notification preferences (scoped to user or guest)
notificationRouter.get('/preferences', optionalAuth, getPreferences);
notificationRouter.put('/preferences', optionalAuth, updatePreferences);

// Web Push subscriptions
notificationRouter.post('/subscribe', optionalAuth, subscribePush);
notificationRouter.post('/unsubscribe', optionalAuth, unsubscribePush);

// Notification history & status updates
notificationRouter.get('/history', optionalAuth, getHistory);
notificationRouter.patch('/:id/read', optionalAuth, markRead);
notificationRouter.post('/mark-all-read', optionalAuth, markAllRead);

// Test notification delivery
notificationRouter.post('/test', optionalAuth, testNotification);
