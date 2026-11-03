import { LocalNotifications, type ScheduleOptions } from '@capacitor/local-notifications'
import { platform } from './platform'

export interface PrayerNotificationItem {
  id: number // unique int ID
  prayerName: string
  scheduledAt: Date
  type: 'start' | 'reminder_30min'
  title: string
  body: string
}

export const notifications = {
  /**
   * Request notification permission on Native Android or Web
   */
  async requestPermission(): Promise<boolean> {
    if (platform.isNative()) {
      try {
        const perm = await LocalNotifications.requestPermissions()
        return perm.display === 'granted'
      } catch (err) {
        console.warn('[Notifications] Native permission error:', err)
        return false
      }
    }

    if (typeof Notification !== 'undefined') {
      try {
        const perm = await Notification.requestPermission()
        return perm === 'granted'
      } catch {
        return false
      }
    }

    return false
  },

  /**
   * Check current permission state
   */
  async checkPermission(): Promise<'granted' | 'denied' | 'default'> {
    if (platform.isNative()) {
      try {
        const perm = await LocalNotifications.checkPermissions()
        return perm.display === 'granted'
          ? 'granted'
          : perm.display === 'denied'
          ? 'denied'
          : 'default'
      } catch {
        return 'default'
      }
    }

    if (typeof Notification !== 'undefined') {
      return Notification.permission
    }

    return 'default'
  },

  /**
   * Initialize notification channels (Android)
   */
  async initChannel(): Promise<void> {
    if (!platform.isAndroid()) return

    try {
      await LocalNotifications.createChannel({
        id: 'salah_prayer_alarms',
        name: 'Salah Prayer Times & Alarms',
        description: 'Instant notification at prayer start and 30-min window reminders',
        importance: 5,
        visibility: 1,
        vibration: true,
      })
    } catch (err) {
      console.warn('[Notifications] Channel creation error:', err)
    }
  },

  /**
   * Schedule local prayer alarms on Android
   */
  async schedulePrayerAlarms(items: PrayerNotificationItem[]): Promise<void> {
    if (!platform.isNative()) return

    try {
      await this.initChannel()

      // Cancel pending local notifications first to prevent duplicates
      const pending = await LocalNotifications.getPending()
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications })
      }

      const now = Date.now()
      const futureItems = items.filter((item) => item.scheduledAt.getTime() > now)

      if (futureItems.length === 0) return

      const scheduleOptions: ScheduleOptions = {
        notifications: futureItems.map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          schedule: { at: item.scheduledAt, allowWhileIdle: true },
          channelId: 'salah_prayer_alarms',
          smallIcon: 'ic_stat_salah',
          extra: {
            prayerName: item.prayerName,
            type: item.type,
          },
        })),
      }

      await LocalNotifications.schedule(scheduleOptions)
    } catch (err) {
      console.error('[Notifications] Failed to schedule local alarms:', err)
    }
  },

  /**
   * Cancel all scheduled alarms
   */
  async cancelAll(): Promise<void> {
    if (!platform.isNative()) return

    try {
      const pending = await LocalNotifications.getPending()
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications })
      }
    } catch (err) {
      console.warn('[Notifications] Error cancelling alarms:', err)
    }
  },

  /**
   * Send immediate test notification
   */
  async sendTestNotification(prayerName = 'Asr'): Promise<boolean> {
    if (platform.isNative()) {
      try {
        await this.initChannel()
        await LocalNotifications.schedule({
          notifications: [
            {
              id: 999999,
              title: `🕌 ${prayerName} Prayer Time`,
              body: `It is now time for ${prayerName} prayer. Hayya 'ala-s-Salah!`,
              schedule: { at: new Date(Date.now() + 1000) },
              channelId: 'salah_prayer_alarms',
              smallIcon: 'ic_stat_salah',
            },
          ],
        })
        return true
      } catch (err) {
        console.error('[Notifications] Native test notification failed:', err)
        return false
      }
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(`🕌 ${prayerName} Prayer Time`, {
          body: `It is now time for ${prayerName} prayer. Hayya 'ala-s-Salah!`,
          icon: '/pwa-192x192.png',
        })
        return true
      } catch {
        return false
      }
    }

    return false
  },
}
