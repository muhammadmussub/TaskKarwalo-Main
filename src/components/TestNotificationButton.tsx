import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { toast } from "sonner";
import { TestTube, Bell } from "lucide-react";

const TestNotificationButton = () => {
  const { user } = useAuth();
  const { registerPushNotifications, testPushNotification, requestNotificationPermission } = useNotifications();

  const createTestNotification = async () => {
    if (!user) {
      toast.error("You must be logged in to create a test notification");
      return;
    }

    console.log("Creating test notification for user:", user.id);

    try {
      const notificationData = {
        user_id: user.id,
        content: "This is a test notification from TaskKarwalo",
        title: "Test Notification",
        type: "test"
      };

      console.log("Inserting notification:", notificationData);

      const { error, data } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select();

      if (error) {
        console.error("Failed to create test notification:", error);
        throw error;
      }

      console.log("Test notification created successfully:", data);
      toast.success("Test notification created successfully!");
    } catch (error: any) {
      toast.error("Failed to create test notification: " + error.message);
      console.error("Notification error details:", error);
    }
  };

  const handleTestPushNotifications = async () => {
    // First request permission if not granted
    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) {
      return;
    }

    // Register push notifications
    await registerPushNotifications();

    // Test push notification
    testPushNotification();
  };

  return (
    <div className="flex gap-2">
      <Button onClick={createTestNotification} variant="outline" size="sm">
        <Bell className="h-4 w-4 mr-2" />
        Create Test Notification
      </Button>
      <Button onClick={handleTestPushNotifications} variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
        <TestTube className="h-4 w-4 mr-2" />
        Test Push Notifications
      </Button>
    </div>
  );
};

export default TestNotificationButton;