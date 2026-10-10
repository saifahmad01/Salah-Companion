import { config } from '../config/env.js';
import {
  getUserPreferences,
  saveUserPreferences,
  savePushSubscription,
  removePushSubscription,
  getNotificationHistory,
  markNotificationRead,
  markAllNotificationsRead,
  sendPushToUser,
  recordNotificationLog,
} from '../services/notificationService.js';
import { checkAndSendDueNotifications } from '../services/notificationScheduler.js';

/**
 * GET /api/notifications/vapid-public-key
 */
export async function getVapidPublicKey(req, res) {
  return res.status(200).json({
    success: true,
    publicKey: config.vapidPublicKey,
  });
}

/**
 * GET /api/notifications/preferences
 */
export async function getPreferences(req, res) {
  const userId = req.user?.id || req.query.userId || 'guest_user';
  const preferences = await getUserPreferences(userId);
  return res.status(200).json({
    success: true,
    preferences,
  });
}

/**
 * PUT /api/notifications/preferences
 */
export async function updatePreferences(req, res) {
  const userId = req.user?.id || req.body.userId || 'guest_user';
  const updated = await saveUserPreferences(userId, req.body);

  // Recalculate and trigger scheduled checks immediately with updated preferences
  checkAndSendDueNotifications().catch(() => {});

  return res.status(200).json({
    success: true,
    message: 'Notification preferences updated successfully.',
    preferences: updated,
  });
}

/**
 * POST /api/notifications/subscribe
 */
export async function subscribePush(req, res) {
  const userId = req.user?.id || req.body.userId || 'guest_user';
  const { subscription, userAgent } = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Web Push subscription payload provided.',
    });
  }

  await savePushSubscription(userId, subscription, userAgent || req.headers['user-agent']);

  return res.status(201).json({
    success: true,
    message: 'Browser push subscription registered successfully.',
  });
}

/**
 * POST /api/notifications/unsubscribe
 */
export async function unsubscribePush(req, res) {
  const { endpoint } = req.body;
  if (endpoint) {
    await removePushSubscription(endpoint);
  }
  return res.status(200).json({
    success: true,
    message: 'Browser push subscription removed.',
  });
}

/**
 * GET /api/notifications/history
 */
export async function getHistory(req, res) {
  const userId = req.user?.id || req.query.userId || 'guest_user';
  const limit = parseInt(req.query.limit || '25', 10);
  const history = await getNotificationHistory(userId, limit);

  return res.status(200).json({
    success: true,
    count: history.length,
    unreadCount: history.filter((h) => !h.isRead).length,
    history,
  });
}

/**
 * PATCH /api/notifications/:id/read
 */
export async function markRead(req, res) {
  const userId = req.user?.id || req.query.userId || 'guest_user';
  const notifId = parseInt(req.params.id, 10);
  if (isNaN(notifId)) {
    return res.status(400).json({ success: false, message: 'Invalid notification id' });
  }

  await markNotificationRead(notifId, userId);
  return res.status(200).json({ success: true, message: 'Notification marked as read.' });
}

/**
 * POST /api/notifications/mark-all-read
 */
export async function markAllRead(req, res) {
  const userId = req.user?.id || req.query.userId || 'guest_user';
  await markAllNotificationsRead(userId);
  return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
}

/**
 * POST /api/notifications/test
 * Sends a test notification to verify delivery
 */
export async function testNotification(req, res) {
  const userId = req.user?.id || req.body.userId || 'guest_user';
  const prayerName = req.body.prayerName || 'Asr';
  const title = `Test: ${prayerName} Prayer Notification`;
  const body = 'This is a test notification from Salah Companion to verify your prayer alerts.';

  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];

  await recordNotificationLog({
    userId,
    prayerName: prayerName.toLowerCase(),
    date: dateKey,
    reminderType: 'test',
    title,
    body,
    prayerTime: now.toISOString(),
    pushSent: true,
  });

  const pushResult = await sendPushToUser(userId, {
    title,
    body,
    prayerName,
    reminderType: 'test',
  });

  return res.status(200).json({
    success: true,
    message: 'Test notification triggered.',
    pushResult,
  });
}
