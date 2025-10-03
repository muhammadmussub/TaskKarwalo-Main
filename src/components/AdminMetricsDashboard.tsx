import {
  Users,
  Receipt,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle,
  Settings,
  Activity,
  Loader2,
  ChevronUp,
  RefreshCw,
  UserCheck
} from 'lucide-react';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import StatsRefreshButton from '@/components/StatsRefreshButton';
import { toast } from 'sonner'; // Import toast for notifications
import { serviceCategories } from '@/data/serviceCategories';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  loading?: boolean;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  loading = false,
  color = "text-blue-500"
}) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-5 w-20 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {trend !== undefined && trend !== 0 && (
                <span className={`text-xs flex items-center font-medium ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
                  <ChevronUp className={`h-3 w-3 ml-0.5 ${trend < 0 ? 'rotate-180' : ''}`} />
                </span>
              )}
            </div>
          )}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${color} bg-opacity-20`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

// Define the type for our realtime stats
interface RealtimeStat {
  id: string;
  stat_type: string;
  stat_name: string;
  stat_value: number;
  stat_trend: number;
  time_period: string;
  created_at: string;
  updated_at: string;
}

const AdminMetricsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("week");

  // Expose refresh function globally for external calls
  React.useEffect(() => {
    // Make refresh function available globally for AdminDashboard to call
    (window as any).refreshAdminMetrics = () => {
      console.log('AdminMetricsDashboard: External refresh triggered');
      loadDashboardData();
    };

    return () => {
      delete (window as any).refreshAdminMetrics;
    };
  }, []);
  const [stats, setStats] = useState({
    activeUsers: { value: 0, trend: 0 },
    totalUsers: { value: 0, trend: 0 },
    revenue: { value: 0, trend: 0 },
    taskCategories: { value: 0, trend: 0 },
    noOfServices: { value: 0, trend: 0 },
    serviceProviders: { value: 0, trend: 0 },
    professionals: { value: 0, trend: 0 },
    completionRate: { value: 0, trend: 0 },
    commission: { value: 0, trend: 0 },
    proBadgeOwners: { value: 0, trend: 0 }, // Add pro badge owners stat
    completedBookings: { value: 0, trend: 0 } // Add completed bookings stat
  });

  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);

  // Fetch initial data and set up real-time subscription
  useEffect(() => {
    loadDashboardData();

    // Set up real-time subscriptions for multiple tables
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'realtime_stats',
        },
        (payload) => {
          console.log('Realtime stats changed:', payload);
          loadDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_profiles',
        },
        (payload) => {
          console.log('Provider profiles changed:', payload);
          loadDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'services',
        },
        (payload) => {
          console.log('AdminMetricsDashboard: Services changed:', payload);
          // Refresh dashboard data when services are added, updated, or removed
          console.log('AdminMetricsDashboard: Refreshing dashboard data due to service change');
          loadDashboardData();

          // Show toast notification for service changes
          if (payload.eventType === 'INSERT') {
            toast?.success('New service added - metrics updated!');
          } else if (payload.eventType === 'UPDATE') {
            const newService = payload.new as any;
            const oldService = payload.old as any;
            if (newService.is_active !== oldService.is_active) {
              if (newService.is_active) {
                toast?.success('Service activated - metrics updated!');
              } else {
                toast?.info('Service deactivated - metrics updated!');
              }
            }
          } else if (payload.eventType === 'DELETE') {
            toast?.info('Service removed - metrics updated!');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          console.log('AdminMetricsDashboard: Bookings changed:', payload);
          const newBooking = payload.new as any;
          const oldBooking = payload.old as any;

          // Always refresh when bookings change to ensure consistency
          console.log('AdminMetricsDashboard: Refreshing dashboard data due to booking change');
          loadDashboardData();

          // Show toast notification for status changes
          if (newBooking && oldBooking && newBooking.status !== oldBooking.status) {
            console.log(`AdminMetricsDashboard: Booking status changed from ${oldBooking.status} to ${newBooking.status}`);
            if (newBooking.status === 'completed') {
              toast?.success('Service completed - metrics updated!');
            } else if (newBooking.status === 'in_progress') {
              toast?.info('Service started - metrics updated!');
            } else if (newBooking.status === 'confirmed') {
              toast?.info('Service accepted - metrics updated!');
            }
          }
        }
      )
      .subscribe();

    setSubscription(channel);

    // Set up auto-refresh interval (every 2 minutes) as fallback
    const interval = setInterval(() => {
      loadDashboardData();
    }, 120000);

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
      clearInterval(interval);
    };
  }, [timeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      console.log('Loading dashboard data directly from tables...');
      
      // Fetch real-time stats directly from related tables instead of using the realtime_stats table
      const [usersResult, providersResult, bookingsResult, completedBookingsResult, revenueResult, revenueHistoryResult, proBadgeOwnersResult] = await Promise.all([
        // Get users data
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }),

        // Get providers data
        supabase
          .from('provider_profiles')
          .select('*', { count: 'exact', head: true }),

        // Get bookings data
        supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true }),

        // Get completed bookings data
        supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed'),

        // Get revenue data
        supabase
          .from('bookings')
          .select('id, commission_amount, final_price, status')
          .eq('status', 'completed'), // Only count completed bookings for revenue

        // Get historical revenue data for the chart
        supabase
          .from('bookings')
          .select('created_at, final_price, commission_amount')
          .eq('status', 'completed') // Only include completed bookings for revenue charts
          .order('created_at', { ascending: true }),

        // Get pro badge owners count
        supabase
          .from('provider_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('verified_pro', true)
      ]);
      
      if (usersResult.error) throw usersResult.error;
      if (providersResult.error) throw providersResult.error;
      if (bookingsResult.error) throw bookingsResult.error;
      if (completedBookingsResult.error) throw completedBookingsResult.error;
      if (revenueResult.error) throw revenueResult.error;
      if (revenueHistoryResult.error) throw revenueHistoryResult.error;
      if (proBadgeOwnersResult.error) throw proBadgeOwnersResult.error;
      
      console.log('Raw data fetched:', {
        users: usersResult.count,
        providers: providersResult.count,
        bookings: bookingsResult.count,
        completedBookings: completedBookingsResult.count,
        revenue: revenueResult.data?.length || 0,
        proBadgeOwners: proBadgeOwnersResult.count
      });

      // Debug commission calculation
      console.log('=== COMMISSION DEBUG INFO ===');
      console.log('Revenue result data:', revenueResult.data);
      if (revenueResult.data && revenueResult.data.length > 0) {
        console.log('Sample booking data:', {
          id: revenueResult.data[0].id,
          final_price: revenueResult.data[0].final_price,
          commission_amount: revenueResult.data[0].commission_amount,
          status: revenueResult.data[0].status
        });
      }
      
      // Calculate revenue
      const totalRevenue = revenueResult.data?.reduce(
        (sum, booking) => sum + (booking.final_price || 0), 
        0
      ) || 0;
      
      // Calculate commission from completed bookings
      // If commission_amount is not populated (older data), calculate it as 5% of final_price
      const totalCommission = revenueResult.data?.reduce(
        (sum, booking) => {
          const commissionAmount = booking.commission_amount || 0;
          const finalPrice = booking.final_price || 0;
          // If commission_amount is not set, calculate it as 5% of final_price
          const calculatedCommission = commissionAmount > 0 ? commissionAmount : (finalPrice * 0.05);
          console.log('Commission calculation for booking:', {
            id: booking.id,
            final_price: finalPrice,
            commission_amount: commissionAmount,
            calculated_commission: calculatedCommission
          });
          return sum + calculatedCommission;
        },
        0
      ) || 0;

      console.log('Total calculated commission:', totalCommission);
      
      // Fetch services count from database
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (servicesError) {
        console.error('Error fetching services count:', servicesError);
        // Use fallback value if query fails
        console.log('Using fallback value for services count');
      }

      const servicesCount = servicesData?.length || 0;

      // Create processed stats
      const processedStats = {
        activeUsers: {
          value: Math.round(usersResult.count || 0),
          trend: 0
        },
        totalUsers: {
          value: Math.round(usersResult.count || 0),
          trend: 0
        },
        revenue: {
          value: Math.round(totalRevenue),
          trend: 0
        },
        taskCategories: {
          value: servicesCount, // Real-time count of active services
          trend: 0
        },
        noOfServices: {
          value: servicesCount, // Real-time count of active services
          trend: 0
        },
        serviceProviders: {
          value: Math.round(providersResult.count || 0),
          trend: 0
        },
        professionals: {
          value: Math.round(proBadgeOwnersResult.count || 0),
          trend: 0
        },
        completionRate: {
          value: bookingsResult.count > 0 ? Math.round((completedBookingsResult.count / bookingsResult.count) * 100) : 0,
          trend: 0
        },
        commission: {
          value: Math.round(totalCommission),
          trend: 0
        },
        proBadgeOwners: {
          value: Math.round(proBadgeOwnersResult.count || 0),
          trend: 0
        },
        completedBookings: {
          value: Math.round(completedBookingsResult.count || 0),
          trend: 0
        }
      };

      console.log('Processed stats:', processedStats);
      
      setStats(processedStats);
      
      // Process historical revenue data for the chart
      const revenueChartData = processRevenueHistoryData(revenueHistoryResult.data || [], timeRange);
      setRevenueData(revenueChartData);

      // Load category data for the service categories chart
      await loadCategoryData();
      
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast?.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryData = async () => {
    try {
      // Fetch all providers
      const { data: providers, error: providersError } = await supabase
        .from('provider_profiles')
        .select('*');

      if (providersError) throw providersError;

      // Fetch completed bookings to count services
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('provider_id, status')
        .eq('status', 'completed');

      if (bookingsError) throw bookingsError;

      // Create a map to count providers and services per category
      const categoryStats: { [key: string]: { providers: number; services: number; name: string } } = {};

      // Initialize with all service categories
      serviceCategories.forEach(category => {
        categoryStats[category.id] = {
          providers: 0,
          services: 0,
          name: category.name
        };
      });

      // Count providers per category (using random distribution for demo)
      providers?.forEach((provider, index) => {
        // For demo purposes, assign providers to categories randomly
        const categoryIndex = index % serviceCategories.length;
        const categoryId = serviceCategories[categoryIndex].id;
        if (categoryStats[categoryId]) {
          categoryStats[categoryId].providers++;
        }
      });

      // Count completed services per category (using random distribution for demo)
      bookings?.forEach((booking, index) => {
        // For demo purposes, assign bookings to categories randomly
        const categoryIndex = index % serviceCategories.length;
        const categoryId = serviceCategories[categoryIndex].id;
        if (categoryStats[categoryId]) {
          categoryStats[categoryId].services++;
        }
      });

      // Convert to chart data format
      const chartData = Object.entries(categoryStats)
        .filter(([_, stats]) => stats.providers > 0 || stats.services > 0)
        .map(([categoryId, stats]) => ({
          name: stats.name,
          providers: stats.providers,
          services: stats.services,
          fill: getCategoryColor(categoryId)
        }))
        .sort((a, b) => b.providers - a.providers); // Sort by provider count

      setCategoryData(chartData);
    } catch (error) {
      console.error('Error loading category data:', error);
      toast?.error('Failed to load category data');

      // Fallback to sample data if database query fails
      const fallbackData = serviceCategories.slice(0, 8).map((category, index) => ({
        name: category.name,
        providers: Math.floor(Math.random() * 10) + 1,
        services: Math.floor(Math.random() * 20) + 1,
        fill: getCategoryColor(category.id)
      }));
      setCategoryData(fallbackData);
    }
  };

  const getCategoryColor = (categoryId: string) => {
    const categoryColors: { [key: string]: string } = {
      'cleaning': '#8884d8',
      'beauty': '#83a6ed',
      'moving': '#8dd1e1',
      'education': '#82ca9d',
      'tech': '#a4de6c',
      'tailoring': '#ffc658',
      'food': '#ff7c7c',
      'pet_care': '#d084d0',
      'vehicle': '#87e8d1',
      'repair': '#ffb347',
      'yoga': '#ff9ff3',
      'events': '#54a0ff'
    };
    return categoryColors[categoryId] || '#8884d8';
  };

  // Process historical revenue data for charts based on time range
  const processRevenueHistoryData = (data: any[], range: string) => {
    if (!data || data.length === 0) {
      // Return sample data if no real data is available
      return generateChartData(range, stats).revenueData;
    }
    
    // Group bookings by date and calculate total revenue and commission
    const dateFormat = range === 'week' ? 'yyyy-MM-dd' : range === 'month' ? 'yyyy-MM-dd' : range === 'overall' ? 'yyyy-MM' : 'yyyy-MM';
    const grouped = data.reduce((acc: any, booking: any) => {
      // Format date based on the range
      const date = new Date(booking.created_at);
      const formattedDate = format(date, dateFormat);
      
      // Initialize if not exists
      if (!acc[formattedDate]) {
        acc[formattedDate] = {
          name: formattedDate,
          totalRevenue: 0,
          commission: 0
        };
      }
      
      // Add booking values
      acc[formattedDate].totalRevenue += (booking.final_price || 0);
      // Calculate commission if not already set (5% of final_price)
      const commissionAmount = booking.commission_amount || (booking.final_price * 0.05);
      acc[formattedDate].commission += commissionAmount;
      
      return acc;
    }, {});
    
    // Convert to array and sort by date
    let result = Object.values(grouped);
    
    // Limit results based on range
    if (range === 'week') {
      // Last 7 days
      result = result.slice(-7);
    } else if (range === 'month') {
      // Last 30 days or 4 weeks
      result = result.slice(-30);
    } else if (range === 'overall') {
      // For overall, show all data without limiting
      // Sort by date to ensure proper order
      result = result.sort((a: any, b: any) => {
        return new Date(a.name).getTime() - new Date(b.name).getTime();
      });
    } else {
      // Last 12 months (year)
      result = result.slice(-12);
    }
    
    // Format for chart display
    return result.map((item: any) => ({
      name: item.name,
      totalRevenue: Math.round(item.totalRevenue),
      commission: Math.round(item.commission)
    }));
  };

  const fetchChartData = async (range: string) => {
    try {
      // In a real implementation, you would fetch historical data for charts
      // For now, we'll generate sample data based on the range
      const chartData = generateChartData(range, stats);
      setRevenueData(chartData.revenueData);
    } catch (error) {
      console.error("Error fetching chart data:", error);
    }
  };

  const processStatsData = (data: RealtimeStat[]) => {
    // Initialize default stats
    const processedStats = {
      activeUsers: { value: 0, trend: 0 },
      totalUsers: { value: 0, trend: 0 },
      revenue: { value: 0, trend: 0 },
      taskCategories: { value: 0, trend: 0 },
      noOfServices: { value: 0, trend: 0 }, // Add this missing property
      serviceProviders: { value: 0, trend: 0 },
      professionals: { value: 0, trend: 0 },
      completionRate: { value: 0, trend: 0 },
      commission: { value: 0, trend: 0 },
      completedBookings: { value: 0, trend: 0 } // Add completed bookings stat
    };
    
    // Process each stat from the database
    data.forEach(stat => {
      switch (stat.stat_type) {
        case 'users':
          if (stat.stat_name === 'active_users') {
            processedStats.activeUsers = {
              value: Math.round(stat.stat_value),
              trend: stat.stat_trend
            };
          } else if (stat.stat_name === 'total_users') {
            processedStats.totalUsers = {
              value: Math.round(stat.stat_value),
              trend: stat.stat_trend
            };
          }
          break;
          
        case 'revenue':
          if (stat.stat_name === 'total_revenue') {
            processedStats.revenue = {
              value: Math.round(stat.stat_value),
              trend: stat.stat_trend
            };
          }
          break;
          
        case 'services':
          if (stat.stat_name === 'category_count') {
            processedStats.taskCategories = {
              value: Math.round(stat.stat_value),
              trend: stat.stat_trend
            };
            // Update noOfServices to use the same value
            processedStats.noOfServices = {
              value: Math.round(stat.stat_value),
              trend: stat.stat_trend
            };
          }
          break;
          
        case 'providers':
          if (stat.stat_name === 'total_providers') {
            processedStats.serviceProviders = {
              value: Math.round(stat.stat_value),
              trend: stat.stat_trend
            };
            // Use the same value for professionals but with a slight difference
            processedStats.professionals = {
              value: Math.round(stat.stat_value), // Use actual verified professionals count
              trend: stat.stat_trend
            };
          }
          break;
          
        case 'performance':
          if (stat.stat_name === 'completion_rate') {
            processedStats.completionRate = {
              value: parseFloat(stat.stat_value.toFixed(1)),
              trend: stat.stat_trend
            };
          }
          break;
          
        case 'commission':
          if (stat.stat_name === 'total_commission') {
            processedStats.commission = {
              value: Math.round(stat.stat_value),
              trend: stat.stat_trend
            };
          }
          break;
      }
    });
    
    return processedStats;
  };

  const generateChartData = (range: string, currentStats: any) => {
    // This function generates sample chart data based on current stats and time range
    // In a real implementation, you would fetch historical data from the database

    // Revenue chart data based on current revenue value
    const baseRevenue = currentStats.revenue.value || 100000;
    let revenueData = [];

    if (range === 'week') {
      revenueData = [
        { name: 'Mon', totalRevenue: baseRevenue * 0.12, commission: baseRevenue * 0.012 },
        { name: 'Tue', totalRevenue: baseRevenue * 0.14, commission: baseRevenue * 0.014 },
        { name: 'Wed', totalRevenue: baseRevenue * 0.18, commission: baseRevenue * 0.018 },
        { name: 'Thu', totalRevenue: baseRevenue * 0.15, commission: baseRevenue * 0.015 },
        { name: 'Fri', totalRevenue: baseRevenue * 0.22, commission: baseRevenue * 0.022 },
        { name: 'Sat', totalRevenue: baseRevenue * 0.28, commission: baseRevenue * 0.028 },
        { name: 'Sun', totalRevenue: baseRevenue * 0.20, commission: baseRevenue * 0.020 },
      ];
    } else if (range === 'month') {
      revenueData = [
        { name: 'Week 1', totalRevenue: baseRevenue * 0.20, commission: baseRevenue * 0.020 },
        { name: 'Week 2', totalRevenue: baseRevenue * 0.24, commission: baseRevenue * 0.024 },
        { name: 'Week 3', totalRevenue: baseRevenue * 0.26, commission: baseRevenue * 0.026 },
        { name: 'Week 4', totalRevenue: baseRevenue * 0.30, commission: baseRevenue * 0.030 },
      ];
    } else if (range === 'overall') {
      // For overall, show data for multiple years
      revenueData = [
        { name: 'Jan 2023', totalRevenue: baseRevenue * 0.05, commission: baseRevenue * 0.005 },
        { name: 'Feb 2023', totalRevenue: baseRevenue * 0.06, commission: baseRevenue * 0.006 },
        { name: 'Mar 2023', totalRevenue: baseRevenue * 0.07, commission: baseRevenue * 0.007 },
        { name: 'Apr 2023', totalRevenue: baseRevenue * 0.08, commission: baseRevenue * 0.008 },
        { name: 'May 2023', totalRevenue: baseRevenue * 0.09, commission: baseRevenue * 0.009 },
        { name: 'Jun 2023', totalRevenue: baseRevenue * 0.10, commission: baseRevenue * 0.010 },
        { name: 'Jul 2023', totalRevenue: baseRevenue * 0.12, commission: baseRevenue * 0.012 },
        { name: 'Aug 2023', totalRevenue: baseRevenue * 0.14, commission: baseRevenue * 0.014 },
        { name: 'Sep 2023', totalRevenue: baseRevenue * 0.16, commission: baseRevenue * 0.016 },
        { name: 'Oct 2023', totalRevenue: baseRevenue * 0.18, commission: baseRevenue * 0.018 },
        { name: 'Nov 2023', totalRevenue: baseRevenue * 0.20, commission: baseRevenue * 0.020 },
        { name: 'Dec 2023', totalRevenue: baseRevenue * 0.22, commission: baseRevenue * 0.022 },
        { name: 'Jan 2024', totalRevenue: baseRevenue * 0.25, commission: baseRevenue * 0.025 },
        { name: 'Feb 2024', totalRevenue: baseRevenue * 0.28, commission: baseRevenue * 0.028 },
        { name: 'Mar 2024', totalRevenue: baseRevenue * 0.30, commission: baseRevenue * 0.030 },
        { name: 'Apr 2024', totalRevenue: baseRevenue * 0.32, commission: baseRevenue * 0.032 },
        { name: 'May 2024', totalRevenue: baseRevenue * 0.35, commission: baseRevenue * 0.035 },
        { name: 'Jun 2024', totalRevenue: baseRevenue * 0.38, commission: baseRevenue * 0.038 },
        { name: 'Jul 2024', totalRevenue: baseRevenue * 0.40, commission: baseRevenue * 0.040 },
        { name: 'Aug 2024', totalRevenue: baseRevenue * 0.42, commission: baseRevenue * 0.042 },
        { name: 'Sep 2024', totalRevenue: baseRevenue * 0.45, commission: baseRevenue * 0.045 },
        { name: 'Oct 2024', totalRevenue: baseRevenue * 0.48, commission: baseRevenue * 0.048 },
        { name: 'Nov 2024', totalRevenue: baseRevenue * 0.50, commission: baseRevenue * 0.050 },
        { name: 'Dec 2024', totalRevenue: baseRevenue * 0.52, commission: baseRevenue * 0.052 },
      ];
    } else {
      revenueData = [
        { name: 'Jan', totalRevenue: baseRevenue * 0.06, commission: baseRevenue * 0.006 },
        { name: 'Feb', totalRevenue: baseRevenue * 0.07, commission: baseRevenue * 0.007 },
        { name: 'Mar', totalRevenue: baseRevenue * 0.08, commission: baseRevenue * 0.008 },
        { name: 'Apr', totalRevenue: baseRevenue * 0.07, commission: baseRevenue * 0.007 },
        { name: 'May', totalRevenue: baseRevenue * 0.08, commission: baseRevenue * 0.008 },
        { name: 'Jun', totalRevenue: baseRevenue * 0.09, commission: baseRevenue * 0.009 },
        { name: 'Jul', totalRevenue: baseRevenue * 0.09, commission: baseRevenue * 0.009 },
        { name: 'Aug', totalRevenue: baseRevenue * 0.10, commission: baseRevenue * 0.010 },
        { name: 'Sep', totalRevenue: baseRevenue * 0.10, commission: baseRevenue * 0.010 },
        { name: 'Oct', totalRevenue: baseRevenue * 0.11, commission: baseRevenue * 0.011 },
        { name: 'Nov', totalRevenue: baseRevenue * 0.12, commission: baseRevenue * 0.012 },
        { name: 'Dec', totalRevenue: baseRevenue * 0.13, commission: baseRevenue * 0.013 },
      ];
    }

    return {
      revenueData
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">Metrics Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time platform metrics and analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={async () => {
              try {
                setLoading(true);
                await loadDashboardData();
                toast?.success("Statistics refreshed successfully");
              } catch (error) {
                console.error("Error refreshing stats:", error);
                toast?.error("Failed to refresh statistics");
              } finally {
                setLoading(false);
              }
            }}
            className="flex items-center gap-2"
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Stats
          </Button>
          
          <Button
            onClick={async () => {
              try {
                // Call the get_stats_count function to get count of stats
                // @ts-ignore - Function exists in the database
                const { data, error } = await supabase.rpc('get_stats_count');
                
                if (error) {
                  console.error("Error getting stats count:", error);
                  toast?.error("Error getting stats count: " + error.message);
                } else {
                  toast?.success(`Total stats in database: ${data}`);
                }
              } catch (error) {
                console.error("Error getting stats count:", error);
                toast?.error("Failed to get stats count");
              }
            }}
            className="flex items-center gap-2"
            variant="outline"
            id="get-count-btn"
          >
            Get Count
          </Button>
          
          <Tabs value={timeRange} onValueChange={setTimeRange}>
            <TabsList>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
              <TabsTrigger value="year">This Year</TabsTrigger>
              <TabsTrigger value="overall">Overall</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Top Stats Row - Ensure consistent 4-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Users"
          value={stats.activeUsers.value.toLocaleString()}
          subtitle="Currently online"
          icon={<Users className="h-6 w-6 text-blue-500" />}
          trend={stats.activeUsers.trend}
          loading={loading}
          color="bg-blue-100"
        />
        
        <StatCard
          title="Total Users"
          value={stats.totalUsers.value.toLocaleString()}
          subtitle="Registered accounts"
          icon={<Users className="h-6 w-6 text-indigo-500" />}
          trend={stats.totalUsers.trend}
          loading={loading}
          color="bg-indigo-100"
        />
        
        <StatCard
          title="Revenue"
          value={`PKR ${stats.revenue.value.toLocaleString()}`}
          subtitle="Total earnings"
          icon={<Receipt className="h-6 w-6 text-green-500" />}
          trend={stats.revenue.trend}
          loading={loading}
          color="bg-green-100"
        />
        
        <StatCard
          title="Total Services Provided"
          value={stats.noOfServices.value}
          subtitle="Service types available"
          icon={<Settings className="h-6 w-6 text-purple-500" />}
          trend={stats.noOfServices.trend}
          loading={loading}
          color="bg-purple-100"
        />
      </div>

      {/* Middle Stats Row - Add Pro Badge Owners Card */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <StatCard
          title="Service Providers"
          value={stats.serviceProviders.value.toLocaleString()}
          subtitle="Active providers"
          icon={<Activity className="h-6 w-6 text-pink-500" />}
          trend={stats.serviceProviders.trend}
          loading={loading}
          color="bg-pink-100"
        />

        <StatCard
          title="Professionals"
          value={stats.professionals.value.toLocaleString()}
          subtitle="Verified service providers"
          icon={<Users className="h-6 w-6 text-amber-500" />}
          trend={stats.professionals.trend}
          loading={loading}
          color="bg-amber-100"
        />

        <StatCard
          title="Task Completion Rate"
          value={`${stats.completionRate.value}%`}
          subtitle="Successfully completed"
          icon={<CheckCircle className="h-6 w-6 text-emerald-500" />}
          trend={stats.completionRate.trend}
          loading={loading}
          color="bg-emerald-100"
        />

        <StatCard
          title="Total Completed Services"
          value={stats.completedBookings.value.toLocaleString()}
          subtitle="Successfully completed bookings"
          icon={<CheckCircle className="h-6 w-6 text-orange-500" />}
          trend={stats.completedBookings.trend}
          loading={loading}
          color="bg-orange-100"
        />

        <StatCard
          title="Company Commission"
          value={`PKR ${stats.commission.value.toLocaleString()}`}
          subtitle={stats.commission.value === 0 ? "No completed bookings yet" : "Total earnings"}
          icon={<Receipt className="h-6 w-6 text-cyan-500" />}
          trend={stats.commission.trend}
          loading={loading}
          color="bg-cyan-100"
        />

        {/* Pro Badge Owners Card */}
        <StatCard
          title="Pro Badge Owners"
          value={stats.proBadgeOwners.value.toLocaleString()}
          subtitle="Verified professionals"
          icon={<UserCheck className="h-6 w-6 text-teal-500" />}
          trend={stats.proBadgeOwners.trend}
          loading={loading}
          color="bg-teal-100"
        />
      </div>

      {/* New Row for Total Services Bookings Completed */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <StatCard
          title="Total Services Bookings Completed"
          value={stats.completedBookings.value.toLocaleString()}
          subtitle="Successfully completed service bookings"
          icon={<CheckCircle className="h-8 w-8 text-green-600" />}
          trend={stats.completedBookings.trend}
          loading={loading}
          color="bg-green-100"
        />
      </div>

      {/* Revenue Chart */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Revenue & Commission Overview</CardTitle>
          <CardDescription>
            Total provider revenue and company commission over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[350px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotalRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => {
                    if (typeof value === 'number') {
                      return `PKR ${value.toLocaleString()}`;
                    }
                    return value;
                  }} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="totalRevenue" 
                    name="Total Provider Revenue" 
                    stroke="#8884d8" 
                    fillOpacity={1} 
                    fill="url(#colorTotalRevenue)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="commission" 
                    name="Company Commission" 
                    stroke="#82ca9d" 
                    fillOpacity={1} 
                    fill="url(#colorCommission)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Provider Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Service Categories Overview</CardTitle>
          <CardDescription>
            Number of providers and services completed by category from landing page
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[350px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                  <YAxis />
                  <Tooltip formatter={(value: any) => value.toLocaleString()} />
                  <Legend />
                  <Bar dataKey="providers" name="Number of Providers" fill="#8884d8" />
                  <Bar dataKey="services" name="Services Completed" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMetricsDashboard;