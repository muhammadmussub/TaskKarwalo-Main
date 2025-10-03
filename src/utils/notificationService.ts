// Notification service for handling push notifications
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// Send push notification to a specific user (client-side only)
export const sendPushNotification = async (
  userId: string,
  payload: NotificationPayload
): Promise<boolean> => {
  try {
    // For client-side notifications, we'll use the browser notification API
    // and service worker directly
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;

      // Show notification using service worker
      const notificationData = {
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        badge: payload.badge || '/icon-192x192.png',
        tag: payload.tag || 'taskkarwalo-notification',
        data: {
          url: payload.url || '/',
          userId: userId
        }
      };

      // Use the browser notification API as fallback
      if (Notification.permission === 'granted') {
        const notification = new Notification(notificationData.title, {
          body: notificationData.body,
          icon: notificationData.icon,
          badge: notificationData.badge,
          tag: notificationData.tag,
          data: notificationData.data
        });

        // Handle notification click
        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        return true;
      }
    }

    // Fallback to browser notification
    if (Notification.permission === 'granted') {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        badge: payload.badge || '/icon-192x192.png',
        tag: payload.tag || 'taskkarwalo-notification'
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
};

// Subscribe to push notifications
export const subscribeToPushNotifications = async (): Promise<PushSubscription | null> => {
  try {
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers not supported');
      return null;
    }

    if (!('PushManager' in window)) {
      console.log('Push notifications not supported');
      return null;
    }

    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Subscribe to push notifications using environment variable
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error('VAPID public key not found in environment variables');
        return null;
      }

      // Convert VAPID key from base64url to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as ArrayBuffer
      });

      // Send subscription to server
      await savePushSubscription(subscription);
    }

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
};

// Save push subscription to localStorage (client-side only)
export const savePushSubscription = async (subscription: PushSubscription): Promise<boolean> => {
  try {
    // Store subscription in localStorage for client-side use
    const subscriptionData = {
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: localStorage.getItem('user_id') || 'unknown'
    };

    localStorage.setItem('push_subscription', JSON.stringify(subscriptionData));
    console.log('Push subscription saved to localStorage:', subscriptionData);

    return true;
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return false;
  }
};

// Helper function to convert VAPID key
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Check if notifications are supported
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

// Check if push notifications are supported
export const isPushNotificationSupported = (): boolean => {
  return 'PushManager' in window && 'serviceWorker' in navigator;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    return 'denied';
  }

  if (Notification.permission === 'default') {
    return await Notification.requestPermission();
  }

  return Notification.permission;
};