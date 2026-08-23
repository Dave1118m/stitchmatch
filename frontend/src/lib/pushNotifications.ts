// Utility for Web Push Notifications & Service Worker Registration

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (error: any) {
    // Handle self-signed certificate restriction on localhost gracefully
    if (error?.name === 'SecurityError' || error?.message?.includes('SSL')) {
      console.info('ℹ️ [Service Worker] Development localhost certificate detected. Falling back to direct browser notifications.');
    } else {
      console.warn('[Service Worker] Registration skipped:', error?.message || error);
    }
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    return 'denied';
  }
}

export function showBrowserNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.showNotification(title, {
            icon: '/vite.svg',
            badge: '/vite.svg',
            ...options,
          });
        })
        .catch(() => {
          new Notification(title, {
            icon: '/vite.svg',
            ...options,
          });
        });
    } else {
      new Notification(title, {
        icon: '/vite.svg',
        ...options,
      });
    }
  } catch (err) {
    // Gracefully handle browser notification restriction
  }
}

export function subscribeUserToPush(): Promise<PushSubscription | null> {
  return Promise.resolve(null);
}
