import React, { useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';

const NotificationPermission: React.FC = () => {
  const {
    notificationPermission,
    requestNotificationPermission,
    registerPushNotifications
  } = useNotifications();

  useEffect(() => {
    // Auto-request permission if not already requested
    if (notificationPermission === 'default') {
      requestNotificationPermission().then((granted) => {
        if (granted) {
          // Only register if not already registered
          const hasRegistered = sessionStorage.getItem('push_notifications_registered');
          if (!hasRegistered) {
            registerPushNotifications();
            sessionStorage.setItem('push_notifications_registered', 'true');
          }
        }
      });
    } else if (notificationPermission === 'granted') {
      // Only register if not already registered
      const hasRegistered = sessionStorage.getItem('push_notifications_registered');
      if (!hasRegistered) {
        registerPushNotifications();
        sessionStorage.setItem('push_notifications_registered', 'true');
      }
    }
  }, [notificationPermission, requestNotificationPermission, registerPushNotifications]);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      await registerPushNotifications();
    }
  };

  // Don't show anything if permission is already granted
  if (notificationPermission === 'granted') {
    return null;
  }

  // Don't show if user has denied permission
  if (notificationPermission === 'denied') {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-lg max-w-sm">
        <div className="flex items-start gap-3">
          <BellOff className="h-5 w-5 text-gray-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-white font-medium mb-1">Notifications Disabled</h4>
            <p className="text-gray-300 text-sm mb-3">
              Enable notifications to get instant updates about bookings and messages.
            </p>
            <Button
              onClick={handleRequestPermission}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Bell className="h-4 w-4 mr-2" />
              Enable Notifications
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show permission request prompt
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-start gap-3">
        <Bell className="h-5 w-5 text-blue-400 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-white font-medium mb-1">Enable Notifications</h4>
          <p className="text-gray-300 text-sm mb-3">
            Get notified instantly about new bookings, messages, and important updates.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleRequestPermission}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Enable
            </Button>
            <Button
              onClick={() => toast.info('You can enable notifications later from your browser settings')}
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPermission;