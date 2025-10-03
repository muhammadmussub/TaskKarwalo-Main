import React from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Smartphone, Monitor } from 'lucide-react';
import { toast } from 'sonner';

const TestNotifications: React.FC = () => {
  const {
    showBrowserNotification,
    requestNotificationPermission,
    notificationPermission,
    registerPushNotifications
  } = useNotifications();

  const handleTestDesktopNotification = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      showBrowserNotification(
        'Test Desktop Notification',
        {
          body: 'This is a test notification for desktop users. Click to open the app.',
          icon: '/icon-192x192.png',
          tag: 'test-notification',
          data: { url: '/' }
        }
      );
      toast.success('Desktop notification sent!');
    } else {
      toast.error('Please enable notifications to test this feature');
    }
  };

  const handleTestPushNotification = async () => {
    try {
      await registerPushNotifications();
      toast.success('Push notification registration completed!');
    } catch (error) {
      toast.error('Failed to register for push notifications');
    }
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      toast.success('Notification permission granted!');
      await registerPushNotifications();
    } else {
      toast.error('Notification permission denied');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Test Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600 mb-4">
          <p>Current permission status: <strong>{notificationPermission}</strong></p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleRequestPermission}
            className="w-full"
            variant="outline"
          >
            <Bell className="h-4 w-4 mr-2" />
            Request Notification Permission
          </Button>

          <Button
            onClick={handleTestDesktopNotification}
            className="w-full"
            disabled={notificationPermission !== 'granted'}
          >
            <Monitor className="h-4 w-4 mr-2" />
            Test Desktop Notification
          </Button>

          <Button
            onClick={handleTestPushNotification}
            className="w-full"
            variant="outline"
            disabled={notificationPermission !== 'granted'}
          >
            <Smartphone className="h-4 w-4 mr-2" />
            Register Push Notifications
          </Button>
        </div>

        <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="font-semibold mb-1">How it works:</p>
          <ul className="space-y-1">
            <li>• Desktop: Shows browser notifications instantly</li>
            <li>• Mobile: Uses service worker for push notifications</li>
            <li>• Real notifications will appear when bookings/messages arrive</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestNotifications;