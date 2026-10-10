import { useState, useEffect, useCallback, useRef } from 'react';
import {
  salahApi,
  type NotificationPreferences,
  type NotificationHistoryItem,
} from '../services/backendApi';
import { webPushClient } from '../utils/webPushClient';

export interface UseSalahNotificationsOptions {
  userId?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  calculationMethod?: string;
  madhab?: string;
}

export function useSalahNotifications(options: UseSalahNotificationsOptions = {}) {
  const { userId, latitude, longitude, timezone, calculationMethod, madhab } = options;

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    prayerStartEnabled: true,
    reminder30MinEnabled: true,
    browserPushEnabled: false,
    fajrEnabled: true,
    dhuhrEnabled: true,
    asrEnabled: true,
    maghribEnabled: true,
    ishaEnabled: true,
    latitude: latitude || 28.6139,
    longitude: longitude || 77.2090,
    timezone: timezone || 'Asia/Kolkata',
    calculationMethod: calculationMethod || 'Karachi',
    madhab: madhab || 'Hanafi',
  });

  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeToast, setActiveToast] = useState<NotificationHistoryItem | null>(null);
  const [browserPermission, setBrowserPermission] = useState<string>('default');

  const seenNotificationIdsRef = useRef<Set<number>>(new Set());

  // Check browser permission status
  useEffect(() => {
    if (!webPushClient.isSupported()) {
      setBrowserPermission('unsupported');
    } else {
      setBrowserPermission(webPushClient.getPermission());
    }
  }, []);

  // Fetch preferences from backend on mount or when userId changes
  const fetchPreferences = useCallback(async () => {
    try {
      const res = await salahApi.getNotificationPreferences(userId);
      if (res?.preferences) {
        setPreferences((prev) => ({
          ...prev,
          ...res.preferences,
        }));
      }
    } catch (err) {
      console.warn('[Notifications] Could not fetch preferences, using defaults:', err);
    }
  }, [userId]);

  // Fetch notification history
  const fetchHistory = useCallback(async () => {
    try {
      const res = await salahApi.getNotificationHistory(30, userId);
      if (res?.history) {
        setHistory(res.history);
        setUnreadCount(res.unreadCount);

        // Check for new unread notifications to surface as an in-app toast
        const unread = res.history.filter((item) => !item.isRead);
        for (const item of unread) {
          if (!seenNotificationIdsRef.current.has(item.id)) {
            seenNotificationIdsRef.current.add(item.id);
            // If delivered in the last 5 minutes, surface immediately as in-app toast
            const itemTime = new Date(item.deliveredAt).getTime();
            const now = Date.now();
            if (now - itemTime < 5 * 60 * 1000) {
              setActiveToast(item);
              break;
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Notifications] Could not fetch history:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    fetchPreferences();
    fetchHistory();
  }, [fetchPreferences, fetchHistory]);

  // Sync coordinates & calculation method changes to notification preferences
  useEffect(() => {
    if (latitude && longitude) {
      salahApi
        .updateNotificationPreferences({
          userId,
          latitude,
          longitude,
          timezone: timezone || 'Asia/Kolkata',
          calculationMethod: calculationMethod || 'Karachi',
          madhab: madhab || 'Hanafi',
        })
        .catch(() => {});
    }
  }, [userId, latitude, longitude, timezone, calculationMethod, madhab]);

  // Periodic polling for history and in-app alerts (every 20s while app is open)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchHistory();
    }, 20000);
    return () => clearInterval(timer);
  }, [fetchHistory]);

  // Auto-dismiss active in-app toast after 8 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  // Update preferences helper
  const updatePreferences = async (newPrefs: Partial<NotificationPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...newPrefs }));
    try {
      const res = await salahApi.updateNotificationPreferences({
        ...newPrefs,
        userId,
      });
      if (res?.preferences) {
        setPreferences(res.preferences);
      }
    } catch (err) {
      console.error('[Notifications] Failed to save preferences to server:', err);
    }
  };

  // Toggle browser push notifications
  const toggleBrowserPush = async (): Promise<{ success: boolean; message: string }> => {
    if (!preferences.browserPushEnabled) {
      // Enabling
      const result = await webPushClient.subscribe(userId);
      setBrowserPermission(webPushClient.getPermission());
      if (result.success) {
        await updatePreferences({ browserPushEnabled: true });
      }
      return result;
    } else {
      // Disabling
      const result = await webPushClient.unsubscribe(userId);
      await updatePreferences({ browserPushEnabled: false });
      return result;
    }
  };

  // Mark single notification read
  const markAsRead = async (id: number) => {
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    if (activeToast?.id === id) {
      setActiveToast(null);
    }
    try {
      await salahApi.markNotificationRead(id);
    } catch {}
  };

  // Mark all notifications read
  const markAllAsRead = async () => {
    setHistory((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    setActiveToast(null);
    try {
      await salahApi.markAllNotificationsRead(userId);
    } catch {}
  };

  // Send a test notification
  const sendTestNotification = async (prayerName = 'Asr') => {
    try {
      const res = await salahApi.sendTestNotification(prayerName, userId);
      await fetchHistory();
      return res;
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to send test notification.' };
    }
  };

  const dismissToast = () => {
    setActiveToast(null);
  };

  return {
    preferences,
    updatePreferences,
    history,
    unreadCount,
    loading,
    activeToast,
    dismissToast,
    browserPermission,
    toggleBrowserPush,
    markAsRead,
    markAllAsRead,
    sendTestNotification,
    refreshHistory: fetchHistory,
  };
}
