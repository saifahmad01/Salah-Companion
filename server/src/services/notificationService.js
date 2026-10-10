import webpush from 'web-push';
import { config } from '../config/env.js';
import { db } from '../db/connection.js';

// Initialize Web Push with VAPID credentials
if (config.vapidPublicKey && config.vapidPrivateKey) {
  try {
    webpush.setVapidDetails(
      config.vapidSubject,
      config.vapidPublicKey,
      config.vapidPrivateKey
    );
  } catch (err) {
    console.error('[WebPush] Error configuring VAPID details:', err);
  }
}

/**
 * Authentic, gentle Islamic reminders shown when prayer time begins
 * (As specified in requirement 1.A)
 */
export const PRAYER_START_REMINDERS = {
  fajr: {
    title: 'Fajr Prayer Time',
    reminder:
      'A new day begins with the remembrance of Allah. Take a moment to answer the call to Salah and begin your day with barakah.',
  },
  dhuhr: {
    title: 'Dhuhr Prayer Time',
    reminder:
      'Pause your busy day and reconnect with Allah. Let Salah bring peace and balance to your heart.',
  },
  asr: {
    title: 'Asr Prayer Time',
    reminder:
      'Before the day passes, take a moment for Salah. Return to Allah with a heart full of gratitude.',
  },
  maghrib: {
    title: 'Maghrib Prayer Time',
    reminder:
      'As the sun sets, remember the blessings of Allah and make time for your Maghrib Salah.',
  },
  isha: {
    title: 'Isha Prayer Time',
    reminder:
      'End your day by remembering Allah. Make time for Isha and find peace before you rest.',
  },
};

/**
 * Authentic, gentle reminders 30 minutes before prayer window ends
 * (As specified in requirement 1.B)
 */
export const PRAYER_PENDING_REMINDERS = {
  fajr: {
    title: 'Fajr Window Ending Soon (30 min)',
    reminder:
      'Only 30 minutes remain before sunrise. If you haven\'t offered your Fajr Salah yet, take a moment to pray.',
  },
  dhuhr: {
    title: 'Dhuhr Window Ending Soon (30 min)',
    reminder:
      'Only 30 minutes remain before Asr begins. If you haven\'t offered your Dhuhr Salah yet, take a moment to pray.',
  },
  asr: {
    title: 'Asr Window Ending Soon (30 min)',
    reminder:
      'Your next prayer time is approaching. If your current Asr Salah is still pending, make time for it before the window closes.',
  },
  maghrib: {
    title: 'Maghrib Window Ending Soon (30 min)',
    reminder:
      'Only 30 minutes remain before Isha begins. If you haven\'t offered your Maghrib Salah yet, make time for it before the window closes.',
  },
  isha: {
    title: 'Isha Window Ending Soon (30 min)',
    reminder:
      'A gentle reminder: don\'t let the night pass without Salah. If your current Isha is pending, make time for it before rest.',
  },
};

/**
 * Retrieve user's notification preferences with defaults
 * @param {string} userId
 */
export async function getUserPreferences(userId) {
  if (!userId) return null;
  const stmt = db.prepare(`
    SELECT * FROM notification_preferences WHERE user_id = ?
  `);
  const row = await stmt.get(userId);
  if (!row) {
    return {
      userId,
      prayerStartEnabled: true,
      reminder30MinEnabled: true,
      browserPushEnabled: false,
      fajrEnabled: true,
      dhuhrEnabled: true,
      asrEnabled: true,
      maghribEnabled: true,
      ishaEnabled: true,
      latitude: 28.6139,
      longitude: 77.2090,
      timezone: 'Asia/Kolkata',
      calculationMethod: 'Karachi',
      madhab: 'Hanafi',
    };
  }

  return {
    userId: row.user_id,
    prayerStartEnabled: Boolean(row.prayer_start_enabled),
    reminder30MinEnabled: Boolean(row.reminder_30min_enabled),
    browserPushEnabled: Boolean(row.browser_push_enabled),
    fajrEnabled: Boolean(row.fajr_enabled),
    dhuhrEnabled: Boolean(row.dhuhr_enabled),
    asrEnabled: Boolean(row.asr_enabled),
    maghribEnabled: Boolean(row.maghrib_enabled),
    ishaEnabled: Boolean(row.isha_enabled),
    latitude: row.latitude ?? 28.6139,
    longitude: row.longitude ?? 77.2090,
    timezone: row.timezone || 'Asia/Kolkata',
    calculationMethod: row.calculation_method || 'Karachi',
    madhab: row.madhab || 'Hanafi',
    updatedAt: row.updated_at,
  };
}

/**
 * Upsert user notification preferences
 * @param {string} userId
 * @param {object} prefs
 */
export async function saveUserPreferences(userId, prefs) {
  if (!userId) throw new Error('userId is required');

  const current = (await getUserPreferences(userId)) || {};
  const merged = { ...current, ...prefs };

  const stmt = db.prepare(`
    INSERT INTO notification_preferences (
      user_id,
      prayer_start_enabled,
      reminder_30min_enabled,
      browser_push_enabled,
      fajr_enabled,
      dhuhr_enabled,
      asr_enabled,
      maghrib_enabled,
      isha_enabled,
      latitude,
      longitude,
      timezone,
      calculation_method,
      madhab,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      prayer_start_enabled = excluded.prayer_start_enabled,
      reminder_30min_enabled = excluded.reminder_30min_enabled,
      browser_push_enabled = excluded.browser_push_enabled,
      fajr_enabled = excluded.fajr_enabled,
      dhuhr_enabled = excluded.dhuhr_enabled,
      asr_enabled = excluded.asr_enabled,
      maghrib_enabled = excluded.maghrib_enabled,
      isha_enabled = excluded.isha_enabled,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      timezone = excluded.timezone,
      calculation_method = excluded.calculation_method,
      madhab = excluded.madhab,
      updated_at = datetime('now')
  `);

  await stmt.run(
    userId,
    Boolean(merged.prayerStartEnabled),
    Boolean(merged.reminder30MinEnabled),
    Boolean(merged.browserPushEnabled),
    Boolean(merged.fajrEnabled),
    Boolean(merged.dhuhrEnabled),
    Boolean(merged.asrEnabled),
    Boolean(merged.maghribEnabled),
    Boolean(merged.ishaEnabled),
    merged.latitude,
    merged.longitude,
    merged.timezone,
    merged.calculationMethod,
    merged.madhab
  );

  return await getUserPreferences(userId);
}

/**
 * Save or update Web Push subscription
 * @param {string} userId
 * @param {object} subscription { endpoint, keys: { p256dh, auth } }
 * @param {string} [userAgent]
 */
export async function savePushSubscription(userId, subscription, userAgent = '') {
  if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error('Invalid Web Push subscription payload');
  }

  const stmt = db.prepare(`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(endpoint) DO UPDATE SET
      user_id = excluded.user_id,
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      user_agent = excluded.user_agent,
      updated_at = datetime('now')
  `);

  await stmt.run(
    userId,
    subscription.endpoint,
    subscription.keys.p256dh,
    subscription.keys.auth,
    userAgent
  );

  // Automatically enable browser push in user preferences
  await saveUserPreferences(userId, { browserPushEnabled: true });
}

/**
 * Remove Web Push subscription by endpoint
 * @param {string} endpoint
 */
export async function removePushSubscription(endpoint) {
  if (!endpoint) return;
  const stmt = db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`);
  await stmt.run(endpoint);
}

/**
 * Check if a prayer has been completed for that date in prayer_logs
 * @param {string} userId
 * @param {string} prayerName
 * @param {string} dateKey 'YYYY-MM-DD'
 */
export async function isPrayerCompleted(userId, prayerName, dateKey) {
  const normPrayer = prayerName.toLowerCase().trim();
  const stmt = db.prepare(`
    SELECT status FROM prayer_logs
    WHERE user_id = ? AND LOWER(prayer_name) = ? AND date = ?
  `);
  const row = await stmt.get(userId, normPrayer, dateKey);
  if (!row) return false;
  const st = (row.status || '').toLowerCase();
  return st === 'on_time' || st === 'late' || st === 'qada';
}

/**
 * Idempotently check whether a notification has already been recorded
 * @param {string} userId
 * @param {string} prayerName
 * @param {string} dateKey
 * @param {'start' | 'reminder_30min'} reminderType
 */
export async function hasNotificationBeenDelivered(userId, prayerName, dateKey, reminderType) {
  const stmt = db.prepare(`
    SELECT id FROM notification_logs
    WHERE user_id = ? AND prayer_name = ? AND date = ? AND reminder_type = ?
  `);
  const row = await stmt.get(userId, prayerName.toLowerCase(), dateKey, reminderType);
  return Boolean(row);
}

/**
 * Idempotently record notification delivery in database
 * @param {object} params
 * @returns {Promise<boolean>} true if newly inserted, false if already existed (idempotent rejection)
 */
export async function recordNotificationLog({
  userId,
  prayerName,
  date,
  reminderType,
  title,
  body,
  prayerTime = null,
  pushSent = false,
}) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO notification_logs (
      user_id, prayer_name, date, reminder_type, title, body, prayer_time, is_read, push_sent, delivered_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, false, ?, datetime('now'))
  `);

  const result = await stmt.run(
    userId,
    prayerName.toLowerCase(),
    date,
    reminderType,
    title,
    body,
    prayerTime,
    Boolean(pushSent)
  );

  return Boolean(result?.changes > 0 || result?.rowCount > 0);
}

/**
 * Retrieve recent notification history for a user
 * @param {string} userId
 * @param {number} [limit=25]
 */
export async function getNotificationHistory(userId, limit = 25) {
  const stmt = db.prepare(`
    SELECT
      id,
      user_id,
      prayer_name,
      date,
      reminder_type,
      title,
      body,
      prayer_time,
      is_read,
      push_sent,
      delivered_at
    FROM notification_logs
    WHERE user_id = ? OR user_id = 'guest_user'
    ORDER BY delivered_at DESC
    LIMIT ?
  `);

  const rows = await stmt.all(userId, limit);
  return (rows || []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    prayerName: r.prayer_name,
    date: r.date,
    reminderType: r.reminder_type,
    title: r.title,
    body: r.body,
    prayerTime: r.prayer_time,
    isRead: Boolean(r.is_read),
    pushSent: Boolean(r.push_sent),
    deliveredAt: r.delivered_at,
  }));
}

/**
 * Mark notification as read
 * @param {number} id
 * @param {string} userId
 */
export async function markNotificationRead(id, userId) {
  const stmt = db.prepare(`
    UPDATE notification_logs SET is_read = true
    WHERE id = ? AND (user_id = ? OR user_id = 'guest_user')
  `);
  await stmt.run(id, userId);
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId
 */
export async function markAllNotificationsRead(userId) {
  const stmt = db.prepare(`
    UPDATE notification_logs SET is_read = true
    WHERE user_id = ? OR user_id = 'guest_user'
  `);
  await stmt.run(userId);
}

/**
 * Send Web Push notification to all active devices registered for a user
 * @param {string} userId
 * @param {object} payload
 */
export async function sendPushToUser(userId, payload) {
  const stmt = db.prepare(`
    SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?
  `);
  const subs = await stmt.all(userId);
  if (!subs || subs.length === 0) return { delivered: 0, failed: 0 };

  const stringPayload = JSON.stringify({
    title: payload.title || 'Salah Companion',
    body: payload.body || 'Prayer time notification',
    prayerName: payload.prayerName,
    reminderType: payload.reminderType,
    url: payload.url || '/app',
    timestamp: Date.now(),
  });

  let delivered = 0;
  let failed = 0;

  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSub, stringPayload);
      delivered++;
    } catch (err) {
      failed++;
      // Auto-cleanup expired or unsubscribed endpoints (HTTP 404 or 410 Gone)
      if (err.statusCode === 404 || err.statusCode === 410) {
        removePushSubscription(sub.endpoint);
      } else {
        console.warn(`[WebPush] Failed delivering to endpoint: ${err.message || err}`);
      }
    }
  }

  return { delivered, failed };
}
