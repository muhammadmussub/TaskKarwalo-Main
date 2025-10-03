import { useState, useEffect } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, MessageSquare, DollarSign, UserCheck, Clock, Filter, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const NotificationHistory = () => {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  // Filter notifications based on search term and type
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || notification.type === filterType;
    const matchesTab = activeTab === "all" ||
                      (activeTab === "unread" && notification.read_at === null) ||
                      (activeTab === "read" && notification.read_at !== null);

    return matchesSearch && matchesType && matchesTab;
  });

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {} as Record<string, typeof notifications>);

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

  // Get notification type label
  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'message':
        return 'Message';
      case 'price_offer':
        return 'Price Offer';
      case 'booking_update':
        return 'Booking Update';
      case 'new_booking':
        return 'New Booking';
      default:
        return 'Notification';
    }
  };

  const unreadCount = notifications.filter(n => n.read_at === null).length;
  const readCount = notifications.filter(n => n.read_at !== null).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Notification History</h2>
          <p className="text-gray-300">View and manage all your notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-blue-600 text-white">
            {notifications.length} Total
          </Badge>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="bg-red-600 text-white">
              {unreadCount} Unread
            </Badge>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48 bg-slate-700 border-slate-600 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="message">Messages</SelectItem>
                <SelectItem value="booking_update">Booking Updates</SelectItem>
                <SelectItem value="new_booking">New Bookings</SelectItem>
                <SelectItem value="price_offer">Price Offers</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800">
          <TabsTrigger value="all" className="data-[state=active]:bg-blue-600">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread" className="data-[state=active]:bg-blue-600">
            Unread ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="read" className="data-[state=active]:bg-blue-600">
            Read ({readCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Notifications</CardTitle>
                {unreadCount > 0 && activeTab !== "read" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllAsRead}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mark All as Read
                  </Button>
                )}
              </div>
              <CardDescription className="text-gray-300">
                {activeTab === "all" && "All your notifications"}
                {activeTab === "unread" && "Notifications you haven't read yet"}
                {activeTab === "read" && "Notifications you've already read"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {Object.keys(groupedNotifications).length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {searchTerm || filterType !== "all" ? "No notifications match your filters" : "No notifications"}
                    </h3>
                    <p className="text-gray-400">
                      {searchTerm || filterType !== "all"
                        ? "Try adjusting your search or filter criteria"
                        : "You'll see your notifications here when you receive them"
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedNotifications)
                      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                      .map(([date, dateNotifications]) => (
                        <div key={date}>
                          {/* Date Header */}
                          <div className="flex items-center gap-2 mb-4">
                            <div className="h-px bg-slate-600 flex-1" />
                            <span className="text-sm text-gray-400 px-3 py-1 bg-slate-700 rounded-full">
                              {new Date(date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                            <div className="h-px bg-slate-600 flex-1" />
                          </div>

                          {/* Notifications for this date */}
                          <div className="space-y-3">
                            {dateNotifications.map((notification) => (
                              <div
                                key={notification.id}
                                className={`p-4 rounded-lg border transition-all duration-200 ${
                                  notification.read_at === null
                                    ? 'bg-blue-900/20 border-blue-600 shadow-lg shadow-blue-600/10'
                                    : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`mt-1 transition-transform duration-200 ${
                                    notification.read_at === null ? 'scale-110' : 'scale-100'
                                  }`}>
                                    {getNotificationIcon(notification.type)}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h4 className={`font-semibold text-sm ${
                                            notification.read_at === null ? 'text-blue-400' : 'text-white'
                                          }`}>
                                            {notification.title}
                                          </h4>
                                          <Badge
                                            variant="secondary"
                                            className={`text-xs ${
                                              notification.read_at === null
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-slate-600 text-slate-300'
                                            }`}
                                          >
                                            {getNotificationTypeLabel(notification.type)}
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-gray-300 leading-relaxed">
                                          {notification.content}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-xs text-gray-400">
                                          {formatDistanceToNow(new Date(notification.created_at), {
                                            addSuffix: true,
                                          })}
                                        </span>
                                        {notification.read_at === null && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => markAsRead(notification.id)}
                                            className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                                          >
                                            <Check className="h-3 w-3 mr-1" />
                                            Mark Read
                                          </Button>
                                        )}
                                      </div>
                                    </div>

                                    {notification.read_at && (
                                      <div className="flex items-center gap-1 text-xs text-gray-400">
                                        <Check className="h-3 w-3" />
                                        <span>Read {formatDistanceToNow(new Date(notification.read_at), { addSuffix: true })}</span>
                                      </div>
                                    )}
                                  </div>

                                  {notification.read_at === null && (
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse flex-shrink-0 mt-2" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationHistory;