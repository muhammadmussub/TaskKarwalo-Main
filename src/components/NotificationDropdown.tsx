import { useState, useEffect, useRef } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, MessageSquare, DollarSign, UserCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import NotificationBadge from "@/components/NotificationBadge";

const NotificationDropdown = () => {
  const { notifications, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
  const [open, setOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Ring animation when new notifications arrive
  useEffect(() => {
    const unreadCount = notifications.filter(n => n.read_at === null).length;
    if (unreadCount > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  // Refresh notifications when dropdown is opened
  useEffect(() => {
    if (open) {
      refreshNotifications();
    }
  }, [open, refreshNotifications]);

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
      case 'price_offer':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'booking_update':
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'new_booking':
        return <DollarSign className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  console.log("NotificationDropdown rendered with notifications:", notifications);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          ref={bellRef}
          variant="ghost"
          size="icon"
          className={`relative hover:bg-accent focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-300 hover:scale-110 ${
            isAnimating ? 'animate-bounce' : ''
          }`}
          onClick={() => refreshNotifications()}
        >
          <div className={`relative ${isAnimating ? 'animate-pulse' : ''}`}>
            <Bell className={`h-5 w-5 transition-colors duration-300 ${
              notifications.some(n => n.read_at === null)
                ? 'text-primary animate-pulse'
                : 'text-muted-foreground'
            }`} />
            {/* Ring animation circles */}
            {isAnimating && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-75" />
                <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-50 animation-delay-300" />
              </>
            )}
          </div>
          <NotificationBadge />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-80 z-[100] mt-2 shadow-lg border-primary/20" 
        align="end"
        sideOffset={5}
        forceMount
      >
        <DropdownMenuLabel className="flex items-center justify-between sticky top-0 bg-background z-10 border-b">
          <span className="font-bold">Notifications</span>
          {notifications.some(n => n.read_at === null) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                markAllAsRead();
              }}
              className="h-6 px-2 text-xs"
            >
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-64">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-accent transition-all duration-200 ${
                  notification.read_at === null
                    ? 'bg-gradient-to-r from-primary/5 to-primary/10 border-l-4 border-l-primary'
                    : 'hover:bg-accent/50'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (notification.read_at === null) {
                    markAsRead(notification.id);
                  }
                }}
              >
                <div className={`mt-1 transition-transform duration-200 ${
                  notification.read_at === null ? 'scale-110' : 'scale-100'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex w-full justify-between items-start">
                    <p className={`font-medium text-sm truncate ${
                      notification.read_at === null ? 'font-semibold text-primary' : ''
                    }`}>
                      {notification.title}
                    </p>
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-sm mt-1 text-muted-foreground line-clamp-2">
                    {notification.content}
                  </p>
                  {notification.read_at === null && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Mark as read
                      </Button>
                    </div>
                  )}
                </div>
                {notification.read_at === null && (
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;