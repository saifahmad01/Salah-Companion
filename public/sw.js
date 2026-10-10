// ============================================================================
// Salah Companion - Production Service Worker for Web Push Notifications
// ============================================================================

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push event listener: displays push notification when browser is backgrounded/closed
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'Salah Companion', body: event.data.text() };
    }
  }

  const title = data.title || 'Salah Companion Prayer Reminder';
  const options = {
    body: data.body || 'It is time for prayer. Answer the call to Salah.',
    icon: '/images/app-logo.png',
    badge: '/favicon.svg',
    tag: `salah-${data.prayerName || 'reminder'}-${data.reminderType || 'start'}`,
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/app',
      prayerName: data.prayerName,
      reminderType: data.reminderType,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open_tracker', title: '🕌 Open Tracker' },
      { action: 'dismiss', title: '✕ Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler: opens or focuses the Salah Companion dashboard
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/app';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes('/app') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
