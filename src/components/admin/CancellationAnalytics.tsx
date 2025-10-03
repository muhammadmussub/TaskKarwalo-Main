import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, User, Calendar, Clock, TrendingUp } from "lucide-react";

interface CancellationStats {
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  total_cancellations: number;
  recent_cancellations: number; // cancellations in last 30 days
  cancellation_rate: number; // percentage of their bookings that were cancelled
}

const CancellationAnalytics = () => {
  const [cancellationStats, setCancellationStats] = useState<CancellationStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCancellationAnalytics();
  }, []);

  const loadCancellationAnalytics = async () => {
    try {
      setLoading(true);

      // Get all cancelled bookings
      const { data: cancelledBookings, error: cancelledError } = await supabase
        .from('bookings')
        .select(`
          id,
          customer_id,
          status,
          created_at,
          updated_at
        `)
        .eq('status', 'cancelled');

      if (cancelledError) {
        console.error('Error fetching cancelled bookings:', cancelledError);
        toast.error(`Failed to fetch cancelled booking data: ${cancelledError.message}`);
        return;
      }

      // Get all bookings to calculate cancellation rates
      const { data: allBookings, error: allBookingsError } = await supabase
        .from('bookings')
        .select(`
          customer_id,
          status
        `);

      if (allBookingsError) {
        console.error('Error fetching all bookings:', allBookingsError);
        toast.error(`Failed to fetch all booking data: ${allBookingsError.message}`);
        return;
      }

      // Get unique customer IDs from cancelled bookings
      const customerIds = [...new Set(cancelledBookings?.map(booking => booking.customer_id) || [])];

      // Get customer profiles
      let customerProfiles: Record<string, any> = {};
      if (customerIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, phone, avatar_url')
          .in('user_id', customerIds);

        if (!profilesError && profiles) {
          profiles.forEach(profile => {
            customerProfiles[profile.user_id] = profile;
          });
        }
      }

      // Get cancellation reasons from chat messages
      const bookingIds = cancelledBookings?.map(booking => booking.id) || [];
      let cancellationReasons: Record<string, string> = {};

      if (bookingIds.length > 0) {
        const { data: messages, error: messagesError } = await supabase
          .from('chat_messages')
          .select('booking_id, content')
          .in('booking_id', bookingIds)
          .like('content', '%cancelled%');

        if (!messagesError && messages) {
          messages.forEach(message => {
            cancellationReasons[message.booking_id] = message.content;
          });
        }
      }

      // Process the data to get cancellation statistics
      const userStats = new Map<string, CancellationStats>();

      // First, count total bookings per user
      const totalBookingsPerUser = new Map<string, number>();
      allBookings?.forEach(booking => {
        const userId = booking.customer_id;
        totalBookingsPerUser.set(userId, (totalBookingsPerUser.get(userId) || 0) + 1);
      });

      // Then, process cancellations
      cancelledBookings?.forEach(booking => {
        const userId = booking.customer_id;
        const profile = customerProfiles[userId];
        const cancelledAt = new Date(booking.updated_at || booking.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        if (!profile) return;

        const existingStats = userStats.get(userId) || {
          user_id: userId,
          full_name: profile.full_name || 'Unknown User',
          email: profile.email || '',
          phone: profile.phone || '',
          avatar_url: profile.avatar_url || '',
          total_cancellations: 0,
          recent_cancellations: 0,
          cancellation_rate: 0
        };

        existingStats.total_cancellations += 1;

        // Check if cancelled within last 30 days
        if (cancelledAt >= thirtyDaysAgo) {
          existingStats.recent_cancellations += 1;
        }

        // Calculate cancellation rate
        const totalBookings = totalBookingsPerUser.get(userId) || 0;
        existingStats.cancellation_rate = totalBookings > 0
          ? (existingStats.total_cancellations / totalBookings) * 100
          : 0;

        userStats.set(userId, existingStats);
      });

      // Convert to array and sort by total cancellations (descending)
      const sortedStats = Array.from(userStats.values())
        .filter(stat => stat.total_cancellations > 0) // Only show users with cancellations
        .sort((a, b) => b.total_cancellations - a.total_cancellations)
        .slice(0, 10); // Top 10 users with most cancellations

      setCancellationStats(sortedStats);

    } catch (error: any) {
      console.error('Error loading cancellation analytics:', error);
      toast.error(`Failed to load cancellation analytics: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getCancellationRateColor = (rate: number) => {
    if (rate >= 50) return "bg-red-500";
    if (rate >= 25) return "bg-orange-500";
    if (rate >= 10) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getCancellationRateLabel = (rate: number) => {
    if (rate >= 50) return "High";
    if (rate >= 25) return "Medium";
    if (rate >= 10) return "Low";
    return "Very Low";
  };

  if (loading) {
    return (
      <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
        <CardHeader>
          <CardTitle className="text-[hsl(0,0%,95%)] flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Users with Most Cancellations
          </CardTitle>
          <CardDescription className="text-[hsl(210,100%,75%)]">
            Loading cancellation analytics...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin h-8 w-8 border-4 border-[hsl(210,100%,65%)] border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
      <CardHeader>
        <CardTitle className="text-[hsl(0,0%,95%)] flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Users with Most Cancellations
        </CardTitle>
        <CardDescription className="text-[hsl(210,100%,75%)]">
          Top 10 users ranked by total cancellations. Monitor patterns to improve user experience.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {cancellationStats.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[hsl(210,100%,75%)]">No cancellation data available.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cancellationStats.map((stat, index) => (
              <div
                key={stat.user_id}
                className="flex items-center justify-between p-4 rounded-lg bg-[hsl(220,25%,15%)] border border-[hsl(220,25%,20%)]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[hsl(210,100%,65%)] text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={stat.avatar_url || undefined} />
                    <AvatarFallback>
                      {stat.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-[hsl(0,0%,95%)]">{stat.full_name}</p>
                    <p className="text-sm text-[hsl(210,100%,75%)]">{stat.email}</p>
                    {stat.phone && (
                      <p className="text-xs text-[hsl(210,100%,65%)]">{stat.phone}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`${getCancellationRateColor(stat.cancellation_rate)} text-white`}
                      >
                        {getCancellationRateLabel(stat.cancellation_rate)} ({stat.cancellation_rate.toFixed(1)}%)
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-[hsl(210,100%,75%)]">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Total: {stat.total_cancellations}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Recent: {stat.recent_cancellations}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CancellationAnalytics;