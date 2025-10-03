import { useState, useEffect } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

const NotificationBadge = () => {
  const { unreadCount } = useNotifications();
  console.log("NotificationBadge rendered with unreadCount:", unreadCount);

  return (
    <div className="relative inline-flex items-center justify-center">
      <Bell className="h-5 w-5 text-primary" />
      {unreadCount > 0 && (
        <Badge 
          className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px] z-20 border border-background animate-pulse"
          variant="destructive"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </div>
  );
};

export default NotificationBadge;