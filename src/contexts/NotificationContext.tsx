import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/integrations/supabase/types";
import NotificationSound from "@/components/NotificationSound";
import { toast } from "sonner";

type Notification = Database["public"]["Tables"]["notifications"]["Row"] & {
  booking_title?: string;
  sender_name?: string;
};

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => void;
  playSound: boolean;
  setPlaySound: React.Dispatch<React.SetStateAction<boolean>>;
  requestNotificationPermission: () => Promise<boolean>;
  showBrowserNotification: (title: string, options?: NotificationOptions) => void;
  registerPushNotifications: () => Promise<void>;
  notificationPermission: NotificationPermission;
  testPushNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [playSound, setPlaySound] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const fetchNotifications = async () => {
    if (!user) {
      console.log("No user, skipping notification fetch");
      return;
    }

    try {
      console.log("Fetching notifications for user:", user.id);
      
      // Check if table exists and has required permissions
      const { error: tableCheckError } = await supabase
        .from('notifications')
        .select('count')
        .limit(1);
        
      if (tableCheckError) {
        console.error('Error checking notifications table:', tableCheckError);
        return;
      }
      
      // Get all notifications for the current user (not just unread ones)
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          booking_id,
          content,
          created_at,
          read_at,
          title,
          type,
          user_id,
          bookings (title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      console.log("Fetched notifications:", data);

      const formattedNotifications = (data || []).map(notification => ({
        ...notification,
        booking_title: (notification as any).bookings?.title || 'Unknown Booking',
        sender_name: 'Unknown User' // We would need to fetch sender info separately
      }));

      setNotifications(formattedNotifications);
      
      // Count only unread notifications
      const unreadNotifications = formattedNotifications.filter(n => n.read_at === null);
      setUnreadCount(unreadNotifications.length);
      
      console.log("Updated notifications state:", formattedNotifications);
      console.log("Updated unread count:", unreadNotifications.length);
    } catch (error) {
      console.error('Error processing notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.map(notification => 
        notification.id === id ? { ...notification, read_at: new Date().toISOString() } : notification
      ));
      setUnreadCount(prev => prev - 1);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user?.id)
        .is('read_at', null);

      if (error) throw error;

      setNotifications(prev => prev.map(notification => ({ ...notification, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const refreshNotifications = () => {
    fetchNotifications();
  };

  // Request notification permission
  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setNotificationPermission('granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      setNotificationPermission('denied');
      toast.error('Notifications are blocked. Please enable them in your browser settings.');
      return false;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === 'granted') {
      toast.success('Notifications enabled successfully!');
      return true;
    } else {
      toast.error('Notifications were denied. You can enable them later in your browser settings.');
      return false;
    }
  };

  // Show browser notification
  const showBrowserNotification = (title: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'taskkarwalo-notification',
        requireInteraction: true,
        ...options
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  // Test push notification function
  const testPushNotification = () => {
    console.log('Testing push notification...');

    // First check if service worker is registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          console.log('Service worker found:', registration);

          // Try to send a test notification
          if (registration.active) {
            registration.active.postMessage({
              action: 'test-notification',
              title: 'Test Notification',
              body: 'This is a test push notification from TaskKarwalo!',
              icon: '/icon-192x192.png'
            });
            toast.success('Test notification sent to service worker!');
          } else {
            toast.error('Service worker is not active');
          }
        } else {
          console.log('No service worker registered');
          toast.error('No service worker found. Please enable push notifications first.');
        }
      });
    } else {
      toast.error('Service workers not supported in this browser');
    }
  };

  // Register for push notifications
  const registerPushNotifications = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully:', registration);

        // Check if push notifications are supported
        if ('PushManager' in window) {
          let subscription = await registration.pushManager.getSubscription();

          if (!subscription) {
            // Subscribe to push notifications
            const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
            if (!vapidKey) {
              console.warn('VAPID public key not found in environment variables. Push notifications will not work.');
              toast.error('Push notification setup incomplete. Please configure VAPID keys.');
              return;
            }

            try {
              console.log('Attempting to subscribe to push notifications...');
              console.log('VAPID Key:', vapidKey);
              console.log('VAPID Key length:', vapidKey.length);

              // Validate VAPID key format
              if (!vapidKey || vapidKey.length < 40) {
                console.error('Invalid VAPID key format:', vapidKey);
                toast.error('Invalid VAPID key configuration. Please check your environment variables.');
                return;
              }

              const applicationServerKey = urlBase64ToUint8Array(vapidKey);
              console.log('Converted VAPID key to Uint8Array:', applicationServerKey);

              subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
              });

              console.log('Push subscription successful:', subscription);

              // Store subscription in localStorage for client-side use
              const subscriptionData = {
                subscription: subscription.toJSON(),
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                userId: user?.id
              };

              localStorage.setItem('push_subscription', JSON.stringify(subscriptionData));
              console.log('Push subscription saved to localStorage');
              toast.success('Push notifications enabled successfully!');
            } catch (subscribeError: any) {
              console.error('Error subscribing to push notifications:', subscribeError);

              // Provide specific error messages
              if (subscribeError.name === 'InvalidAccessError') {
                toast.error('Invalid VAPID key. Push notifications cannot be enabled.');
              } else if (subscribeError.name === 'NotAllowedError') {
                toast.error('Push notification permission denied. Please enable notifications in your browser settings.');
              } else {
                toast.error('Failed to enable push notifications. Please try again.');
              }
            }
          } else {
            console.log('Push subscription already exists');
            // Only show the message once per session
            const hasShownMessage = sessionStorage.getItem('push_notifications_already_enabled_shown');
            if (!hasShownMessage) {
              toast.success('Push notifications are already enabled!');
              sessionStorage.setItem('push_notifications_already_enabled_shown', 'true');
            }
          }
        } else {
          console.warn('Push notifications not supported in this browser');
          toast.error('Push notifications are not supported in this browser.');
        }
      } catch (error: any) {
        console.error('Error registering push notifications:', error);

        if (error.name === 'NotAllowedError') {
          toast.error('Service worker registration blocked. Please allow service workers for this site.');
        } else {
          toast.error('Failed to register service worker for push notifications.');
        }
      }
    } else {
      console.warn('Service workers not supported in this browser');
      toast.error('Service workers are not supported in this browser.');
    }
  };

  // Helper function to convert VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
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

  useEffect(() => {
    console.log("NotificationProvider useEffect triggered, user:", user);
    if (user) {
      // Initial fetch of notifications
      fetchNotifications();
      
      // Set up real-time subscription for notifications
      const channel = supabase
        .channel('notifications-channel-' + Math.random().toString(36).substring(2, 15))
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('New notification detected:', payload);

            // Show browser notification if permission granted
            if (Notification.permission === 'granted') {
              const notificationData = payload.new as Notification;
              showBrowserNotification(
                notificationData.title || 'New Notification',
                {
                  body: notificationData.content || 'You have a new notification',
                  tag: `notification-${notificationData.id}`,
                  data: {
                    url: '/notifications',
                    notificationId: notificationData.id
                  }
                }
              );
            }

            // Play sound for new notifications
            setPlaySound(true);
            // Refresh notifications
            fetchNotifications();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            console.log('Notification updated');
            fetchNotifications();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            console.log('Notification deleted');
            fetchNotifications();
          }
        )
        .subscribe((status) => {
          console.log('Notification subscription status:', status);
        });

      return () => {
        console.log('Cleaning up notification subscription');
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        playSound,
        setPlaySound,
        requestNotificationPermission,
        showBrowserNotification,
        registerPushNotifications,
        notificationPermission,
        testPushNotification
      }}
    >
      <NotificationSound
        play={playSound}
        onPlayed={() => setPlaySound(false)}
      />
      {children}
    </NotificationContext.Provider>
  );
};