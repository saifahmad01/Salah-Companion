import { salahApi } from '../services/backendApi';

/**
 * Converts URL-safe base64 string to Uint8Array for applicationServerKey
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const webPushClient = {
  /**
   * Check if the browser environment supports Service Workers and Web Push
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  },

  /**
   * Get current browser notification permission
   */
  getPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  },

  /**
   * Request permission and subscribe to Web Push
   * Only called after explicit user interaction
   */
  async subscribe(userId?: string): Promise<{ success: boolean; message: string }> {
    if (!this.isSupported()) {
      return {
        success: false,
        message: 'Browser Push Notifications are not supported in your browser.',
      };
    }

    // 1. Explicitly request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        message:
          permission === 'denied'
            ? 'Notifications were denied in browser permissions. Please allow them in your browser site settings.'
            : 'Notification permission request was dismissed.',
      };
    }

    try {
      // 2. Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // 3. Fetch VAPID public key from backend
      const { publicKey } = await salahApi.getVapidPublicKey();
      if (!publicKey) {
        throw new Error('VAPID public key not received from server');
      }

      // 4. Subscribe to PushManager
      const convertedVapidKey = urlBase64ToUint8Array(publicKey);
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey as BufferSource,
        });
      }

      // 5. Send subscription to backend
      const rawSub = subscription.toJSON();
      await salahApi.subscribePush({
        userId,
        subscription: rawSub,
        userAgent: navigator.userAgent,
      });

      return {
        success: true,
        message: 'Browser push notifications successfully enabled and connected!',
      };
    } catch (err: any) {
      console.error('[WebPush] Error during push subscription:', err);
      return {
        success: false,
        message: err.message || 'Failed to register browser push notifications.',
      };
    }
  },

  /**
   * Unsubscribe from Web Push
   */
  async unsubscribe(userId?: string): Promise<{ success: boolean; message: string }> {
    if (!this.isSupported()) return { success: true, message: 'Not supported' };

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();
          await salahApi.unsubscribePush(endpoint);
        }
      }

      await salahApi.updateNotificationPreferences({
        userId,
        browserPushEnabled: false,
      });

      return {
        success: true,
        message: 'Browser push notifications disabled.',
      };
    } catch (err: any) {
      console.error('[WebPush] Error during unsubscribe:', err);
      return {
        success: false,
        message: err.message || 'Failed to unsubscribe from push notifications.',
      };
    }
  },
};
