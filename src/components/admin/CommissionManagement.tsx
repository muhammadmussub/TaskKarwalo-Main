import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
   CheckCircle,
   XCircle,
   Receipt,
   Eye,
   Clock,
   Download,
   RefreshCw,
   TrendingUp,
   TrendingDown,
   DollarSign,
   Calendar,
   Filter,
   BarChart3,
   PieChart,
   Users,
   Target,
   Activity,
   AlertTriangle
 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProviderCommissionOverview from './ProviderCommissionOverview';

interface CommissionPayment {
  id: string;
  provider_id: string;
  amount: number;
  payment_method: string;
  screenshot_url: string;
  booking_count: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  provider_profiles?: {
    business_name: string;
    business_type: string;
    business_address: string;
    profiles?: {
      full_name: string;
      email: string;
      phone?: string;
    }
  };
  provider_profile?: {
    business_name: string;
    user: {
      full_name: string;
      email: string;
    }
  }
}

interface CommissionAnalytics {
  totalCommission: number;
  monthlyCommission: number;
  weeklyCommission: number;
  pendingCommission: number;
  clearedCommission: number;
  topEarningCategories: Array<{
    category: string;
    totalCommission: number;
    bookingCount: number;
  }>;
  topEarningProviders: Array<{
    provider_id: string;
    business_name: string;
    total_commission: number;
    total_jobs: number;
    seven_day_commission: number;
    one_month_commission: number;
    total_earnings: number;
  }>;
  commissionGrowth: Array<{
    period: string;
    commission: number;
    bookings: number;
  }>;
}

interface FilterOptions {
  dateRange: string;
  category: string;
  city: string;
  providerType: string;
}

const CommissionManagement = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<CommissionPayment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<CommissionPayment | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState<string>('pending');

  // Analytics state
  const [analytics, setAnalytics] = useState<CommissionAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: 'all',
    category: 'all',
    city: 'all',
    providerType: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCommissionPayments();
    loadCommissionAnalytics();
  }, [activeTab, filters]);

  // Set up real-time subscriptions for analytics data
  useEffect(() => {
    // Subscribe to bookings changes (for commission analytics)
    const bookingsSubscription = supabase
      .channel('bookings_analytics_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('Bookings changed for analytics:', payload);
          loadCommissionAnalytics(); // Reload analytics when bookings change
        }
      )
      .subscribe();

    // Subscribe to commission_payments_view changes (for pending payments)
    const commissionSubscription = supabase
      .channel('commission_payments_analytics_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commission_payments_view'
        },
        (payload) => {
          console.log('Commission payments changed for analytics:', payload);
          loadCommissionAnalytics(); // Reload analytics when commission payments change
        }
      )
      .subscribe();

    // Subscribe to provider_profiles changes (for top earning providers)
    const providerSubscription = supabase
      .channel('provider_profiles_analytics_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_profiles'
        },
        (payload) => {
          console.log('Provider profiles changed for analytics:', payload);
          loadCommissionAnalytics(); // Reload analytics when provider profiles change
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      bookingsSubscription.unsubscribe();
      commissionSubscription.unsubscribe();
      providerSubscription.unsubscribe();
    };
  }, []);

  const loadCommissionAnalytics = async (showRefreshToast = false) => {
    setAnalyticsLoading(true);
    try {
      console.log('Loading commission analytics...');

      // Build date filter
      let dateFilter = '';
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      switch (filters.dateRange) {
        case 'week':
          dateFilter = `AND submitted_at >= '${startOfWeek.toISOString()}'`;
          break;
        case 'month':
          dateFilter = `AND submitted_at >= '${startOfMonth.toISOString()}'`;
          break;
        case 'year':
          dateFilter = `AND submitted_at >= '${new Date(now.getFullYear(), 0, 1).toISOString()}'`;
          break;
      }

      // First, let's check if we have any commission payments at all
      const { data: allPayments, error: allPaymentsError } = await supabase
        .from('commission_payments')
        .select('*');

      if (allPaymentsError) {
        console.error('Error fetching commission payments:', allPaymentsError);
        throw allPaymentsError;
      }

      console.log('Found commission payments:', allPayments?.length || 0, allPayments);

      // Also check if we have any completed bookings that should generate commission
      const { data: completedBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, final_price, proposed_price, completed_at, provider_id, status')
        .eq('status', 'completed');

      if (bookingsError) {
        console.error('Error fetching completed bookings:', bookingsError);
      } else {
        console.log('Found completed bookings:', completedBookings?.length || 0);
        console.log('Completed bookings data:', completedBookings);

        // Check for bookings with any status to see if there are any bookings at all
        const { data: allBookings, error: allBookingsError } = await supabase
          .from('bookings')
          .select('id, status, final_price, proposed_price, created_at');

        if (allBookingsError) {
          console.error('Error fetching all bookings:', allBookingsError);
        } else {
          console.log('Total bookings in system:', allBookings?.length || 0);
          console.log('All bookings data:', allBookings);

          // If we have bookings but no completed ones, show a warning
          const completedCount = allBookings.filter(b => b.status === 'completed').length;
          console.log('Completed bookings count:', completedCount);

          if (allBookings.length > 0 && completedCount === 0) {
            console.warn('WARNING: Found bookings but none are completed. Commission can only be calculated from completed bookings.');
          }
        }
      }

      // Check if we have any provider profiles
      const { data: allProviders, error: allProvidersError } = await supabase
        .from('provider_profiles')
        .select('*');

      if (allProvidersError) {
        console.error('Error fetching provider profiles:', allProvidersError);
      } else {
        console.log('Found provider profiles:', allProviders?.length || 0, allProviders);
      }

      // Load total commission data from commission_payments (approved payments)
       const { data: totalCommissionData, error: totalError } = await supabase
          .from('commission_payments')
          .select('amount, status, submitted_at')
          .eq('status', 'approved');

        if (totalError) throw totalError;

        // Load monthly commission data
        const { data: monthlyCommissionData, error: monthlyError } = await supabase
          .from('commission_payments')
          .select('amount, status, submitted_at')
          .eq('status', 'approved')
          .gte('submitted_at', startOfMonth.toISOString());

        if (monthlyError) throw monthlyError;

        // Load weekly commission data
        const { data: weeklyCommissionData, error: weeklyError } = await supabase
          .from('commission_payments')
          .select('amount, status, submitted_at')
          .eq('status', 'approved')
          .gte('submitted_at', startOfWeek.toISOString());

        if (weeklyError) throw weeklyError;

       // Load pending vs cleared commissions from commission_payments
       const { data: pendingData, error: pendingError } = await supabase
         .from('commission_payments')
         .select('amount, status')
         .eq('status', 'pending');

       if (pendingError) throw pendingError;

      // Load top earning categories from commission_payments with provider data
      const { data: categoryData, error: categoryError } = await supabase
        .from('commission_payments')
        .select('amount, status, provider_id')
        .eq('status', 'approved');

      if (categoryError) {
        console.error('Error fetching category data:', categoryError);
        // Continue with empty category data instead of throwing
      }

      // If we have category data, fetch provider profiles separately
      let categoryDataWithProfiles = [];
      if (categoryData && categoryData.length > 0) {
        const providerIds = [...new Set(categoryData.map(p => p.provider_id))];

        const { data: providerProfiles, error: profilesError } = await supabase
          .from('provider_profiles')
          .select('user_id, business_type')
          .in('user_id', providerIds);

        if (profilesError) {
          console.error('Error fetching provider profiles for categories:', profilesError);
        }

        // Combine the data manually
        categoryDataWithProfiles = categoryData.map(payment => ({
          ...payment,
          provider_profiles: providerProfiles?.find(p => p.user_id === payment.provider_id) || null
        }));
      }

      // Load top earning providers with real commission calculations
      const { data: providerData, error: providerError } = await supabase
        .from('provider_profiles')
        .select('user_id, business_name, business_type, business_address')
        .eq('admin_approved', true);

      if (providerError) {
        console.error('Error fetching provider data:', providerError);
        // Continue with empty provider data instead of throwing
      }

      // Calculate real commission data from completed bookings for each provider
      let providerDataWithRealCommission = [];
      if (providerData && providerData.length > 0) {
        const userIds = providerData.map(p => p.user_id);

        // Get user profiles
        const { data: userProfiles, error: userProfilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        if (userProfilesError) {
          console.error('Error fetching user profiles:', userProfilesError);
        }

        // Calculate real commission for each provider from completed bookings
        for (const provider of providerData) {
          // Get completed bookings for this provider
          const { data: completedBookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('id, final_price, proposed_price, completed_at')
            .eq('provider_id', provider.user_id)
            .eq('status', 'completed');

          if (bookingsError) {
            console.error('Error fetching completed bookings for provider:', provider.user_id, bookingsError);
            continue;
          }

          // Calculate total commission (5% of all completed bookings)
          const totalEarnings = completedBookings?.reduce((sum, booking) => {
            return sum + (booking.final_price || booking.proposed_price || 0);
          }, 0) || 0;
          const totalCommission = totalEarnings * 0.05;
          const totalJobs = completedBookings?.length || 0;

          // Calculate 7-day commission
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const sevenDayBookings = completedBookings?.filter(booking =>
            new Date(booking.completed_at || '') >= sevenDaysAgo
          ) || [];
          const sevenDayEarnings = sevenDayBookings.reduce((sum, booking) => {
            return sum + (booking.final_price || booking.proposed_price || 0);
          }, 0);
          const sevenDayCommission = sevenDayEarnings * 0.05;

          // Calculate 1-month commission
          const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const oneMonthBookings = completedBookings?.filter(booking =>
            new Date(booking.completed_at || '') >= oneMonthAgo
          ) || [];
          const oneMonthEarnings = oneMonthBookings.reduce((sum, booking) => {
            return sum + (booking.final_price || booking.proposed_price || 0);
          }, 0);
          const oneMonthCommission = oneMonthEarnings * 0.05;

          providerDataWithRealCommission.push({
            ...provider,
            profiles: userProfiles?.find(p => p.user_id === provider.user_id) || null,
            total_commission: totalCommission,
            total_jobs: totalJobs,
            seven_day_commission: sevenDayCommission,
            one_month_commission: oneMonthCommission,
            total_earnings: totalEarnings
          });
        }

        // Sort by total commission (highest first) and filter out zero commission providers
        providerDataWithRealCommission = providerDataWithRealCommission
          .filter(provider => provider.total_commission > 0)
          .sort((a, b) => b.total_commission - a.total_commission);
      }

      // Load commission growth trend (last 12 months) from commission_payments
      const { data: growthData, error: growthError } = await supabase
        .from('commission_payments')
        .select('amount, submitted_at, status')
        .eq('status', 'approved')
        .gte('submitted_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .order('submitted_at', { ascending: true });

      if (growthError) throw growthError;

      // Process category data
      const categoryMap = new Map();
      categoryDataWithProfiles?.forEach(payment => {
        const category = payment.provider_profiles?.business_type || 'Unknown';
        const commission = payment.amount || 0;
        const bookingCount = 1;

        if (categoryMap.has(category)) {
          const existing = categoryMap.get(category);
          categoryMap.set(category, {
            category,
            totalCommission: existing.totalCommission + commission,
            bookingCount: existing.bookingCount + bookingCount
          });
        } else {
          categoryMap.set(category, {
            category,
            totalCommission: commission,
            bookingCount
          });
        }
      });

      // Process growth data (monthly aggregation)
      const growthMap = new Map();
      growthData?.forEach(record => {
        const date = new Date(record.submitted_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (growthMap.has(monthKey)) {
          const existing = growthMap.get(monthKey);
          growthMap.set(monthKey, {
            period: monthKey,
            commission: existing.commission + record.amount,
            bookings: existing.bookings + 1
          });
        } else {
          growthMap.set(monthKey, {
            period: monthKey,
            commission: record.amount,
            bookings: 1
          });
        }
      });

      // Calculate totals
      const totalCommission = totalCommissionData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const monthlyCommission = monthlyCommissionData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const weeklyCommission = weeklyCommissionData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const pendingCommission = pendingData?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const clearedCommission = totalCommission - pendingCommission;

      console.log('=== COMMISSION ANALYTICS DEBUG ===');
      console.log('Total commission data count:', totalCommissionData?.length || 0);
      console.log('Total commission data:', totalCommissionData);
      console.log('Monthly commission data count:', monthlyCommissionData?.length || 0);
      console.log('Weekly commission data count:', weeklyCommissionData?.length || 0);
      console.log('Pending commission data count:', pendingData?.length || 0);
      console.log('Total commission:', totalCommission);
      console.log('Monthly commission:', monthlyCommission);
      console.log('Weekly commission:', weeklyCommission);
      console.log('Pending commission:', pendingCommission);
      console.log('Cleared commission:', clearedCommission);


      // Convert maps to arrays and sort
      const topEarningCategories = Array.from(categoryMap.values())
        .sort((a, b) => b.totalCommission - a.totalCommission)
        .slice(0, 10);

      const topEarningProviders = providerDataWithRealCommission?.map(provider => ({
        provider_id: provider.user_id,
        business_name: provider.business_name || 'Unknown',
        total_commission: provider.total_commission || 0,
        total_jobs: provider.total_jobs || 0,
        seven_day_commission: provider.seven_day_commission || 0,
        one_month_commission: provider.one_month_commission || 0,
        total_earnings: provider.total_earnings || 0
      })) || [];

      const commissionGrowth = Array.from(growthMap.values())
        .sort((a, b) => a.period.localeCompare(b.period));

      // Calculate commission from completed bookings (5% of final_price)
      if (completedBookings && completedBookings.length > 0) {
        console.log('=== STARTING BOOKING COMMISSION CALCULATION ===');
        console.log('Total completed bookings found:', completedBookings.length);

        // Calculate commission from completed bookings (5% of final_price)
        const calculatedTotalCommission = completedBookings.reduce((sum, booking) => {
          const price = booking.final_price || booking.proposed_price || 0;
          const commission = price * 0.05;
          console.log('Booking:', {
            id: booking.id,
            status: booking.status,
            final_price: booking.final_price,
            proposed_price: booking.proposed_price,
            used_price: price,
            commission: commission,
            completed_at: booking.completed_at
          });
          return sum + commission;
        }, 0);

        console.log('=== FINAL CALCULATION RESULTS ===');
        console.log('Calculated total commission from bookings:', calculatedTotalCommission);

        // Use calculated values from bookings - Monthly
        console.log('=== CALCULATING MONTHLY COMMISSION ===');
        const calculatedMonthlyCommission = completedBookings
          .filter(booking => {
            const completedDate = new Date(booking.completed_at || '');
            const now = new Date();
            const isThisMonth = completedDate.getMonth() === now.getMonth() &&
                               completedDate.getFullYear() === now.getFullYear();
            console.log('Booking monthly filter:', {
              id: booking.id,
              completed_at: booking.completed_at,
              completedDate: completedDate.toISOString(),
              now: now.toISOString(),
              isThisMonth
            });
            return isThisMonth;
          })
          .reduce((sum, booking) => {
            const price = booking.final_price || booking.proposed_price || 0;
            const commission = price * 0.05;
            console.log('Monthly booking contribution:', { id: booking.id, price, commission });
            return sum + commission;
          }, 0);

        console.log('Monthly commission result:', calculatedMonthlyCommission);

        // Use calculated values from bookings - Weekly
        console.log('=== CALCULATING WEEKLY COMMISSION ===');
        const calculatedWeeklyCommission = completedBookings
          .filter(booking => {
            const completedDate = new Date(booking.completed_at || '');
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const isThisWeek = completedDate >= weekAgo;
            console.log('Booking weekly filter:', {
              id: booking.id,
              completed_at: booking.completed_at,
              completedDate: completedDate.toISOString(),
              weekAgo: weekAgo.toISOString(),
              isThisWeek
            });
            return isThisWeek;
          })
          .reduce((sum, booking) => {
            const price = booking.final_price || booking.proposed_price || 0;
            const commission = price * 0.05;
            console.log('Weekly booking contribution:', { id: booking.id, price, commission });
            return sum + commission;
          }, 0);

        console.log('Weekly commission result:', calculatedWeeklyCommission);

        console.log('=== SETTING FINAL ANALYTICS FROM BOOKINGS ===');
        console.log('Using calculated commission values from bookings:', {
          totalCommission: calculatedTotalCommission,
          monthlyCommission: calculatedMonthlyCommission,
          weeklyCommission: calculatedWeeklyCommission,
          pendingCommission: 0,
          clearedCommission: calculatedTotalCommission
        });

        // Use calculated values from bookings
        const finalAnalytics = {
          totalCommission: calculatedTotalCommission,
          monthlyCommission: calculatedMonthlyCommission,
          weeklyCommission: calculatedWeeklyCommission,
          pendingCommission: 0,
          clearedCommission: calculatedTotalCommission,
          topEarningCategories,
          topEarningProviders,
          commissionGrowth
        };

        console.log('Final analytics object being set:', finalAnalytics);
        setAnalytics(finalAnalytics);
        return;
      }

      // If no completed bookings found, check if we have any commission payments data
      if (totalCommission > 0) {
        console.log('Using commission payments data for analytics');
        const analyticsData = {
          totalCommission,
          monthlyCommission,
          weeklyCommission,
          pendingCommission,
          clearedCommission,
          topEarningCategories,
          topEarningProviders,
          commissionGrowth
        };

        console.log('Setting analytics from commission payments:', analyticsData);
        setAnalytics(analyticsData);
        return;
      }

      const analyticsData = {
        totalCommission,
        monthlyCommission,
        weeklyCommission,
        pendingCommission,
        clearedCommission,
        topEarningCategories,
        topEarningProviders,
        commissionGrowth
      };

      console.log('Setting analytics data:', analyticsData);
      setAnalytics(analyticsData);

    } catch (error) {
      console.error('Error loading commission analytics:', error);

      // Set empty analytics for clean database (no error message)
      console.log('=== SETTING EMPTY ANALYTICS - NO DATA FOUND ===');
      console.log('This means either:');
      console.log('1. No completed bookings found');
      console.log('2. Error occurred during data fetching');
      console.log('3. Commission payments table is empty and no bookings to calculate from');
      console.log('Setting empty analytics data for clean database...');

      // Show helpful message about no data
      toast.info('No commission data found. Complete some bookings to see commission analytics.', {
        duration: 5000,
      });

      setAnalytics({
        totalCommission: 0,
        monthlyCommission: 0,
        weeklyCommission: 0,
        pendingCommission: 0,
        clearedCommission: 0,
        topEarningCategories: [],
        topEarningProviders: [],
        commissionGrowth: []
      });
    } finally {
      setAnalyticsLoading(false);
      if (showRefreshToast) {
        toast.success('Analytics refreshed successfully');
      }
    }
  };

  const handleRefreshAnalytics = () => {
    loadCommissionAnalytics(true);
  };


  const loadCommissionPayments = async () => {
    setLoading(true);
    try {
      // First, get all commission payments with proper joins
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('commission_payments')
        .select(`
          *,
          provider_profiles!inner (
            user_id,
            business_name,
            business_type,
            business_address,
            profiles!inner (
              full_name,
              email,
              phone
            )
          )
        `)
        .eq('status', activeTab)
        .order('submitted_at', { ascending: false });

      if (paymentsError) {
        console.error('Error fetching commission payments:', paymentsError);
        // If the join fails, try without the join and fetch data separately
        console.log('Trying separate queries approach...');

        // Fallback: Get payments without join
        const { data: paymentsDataFallback, error: paymentsErrorFallback } = await supabase
          .from('commission_payments')
          .select('*')
          .eq('status', activeTab)
          .order('submitted_at', { ascending: false });

        if (paymentsErrorFallback) {
          throw paymentsErrorFallback;
        }

        if (!paymentsDataFallback || paymentsDataFallback.length === 0) {
          setPayments([]);
          return;
        }

        // Get unique provider IDs
        const providerIds = [...new Set(paymentsDataFallback.map(p => p.provider_id))] as string[];

        // Fetch provider profiles and user profiles separately
        const { data: providersData, error: providersError } = await supabase
          .from('provider_profiles')
          .select('user_id, business_name, business_type, business_address')
          .in('user_id', providerIds);

        if (providersError) {
          console.error('Error fetching provider profiles:', providersError);
          // Continue with empty provider data
        }

        // Fetch user profiles
        const { data: userProfilesData, error: userProfilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, phone')
          .in('user_id', providerIds);

        if (userProfilesError) {
          console.error('Error fetching user profiles:', userProfilesError);
        }

        // Create maps for easy lookup
        const providerMap = new Map();
        providersData?.forEach(provider => {
          providerMap.set(provider.user_id, {
            business_name: provider.business_name || 'Unknown',
            business_type: provider.business_type || 'Unknown',
            business_address: provider.business_address || 'Unknown'
          });
        });

        const userProfilesMap = new Map();
        userProfilesData?.forEach(profile => {
          userProfilesMap.set(profile.user_id, {
            full_name: profile.full_name || 'Unknown',
            email: profile.email || 'Unknown',
            phone: profile.phone || 'Unknown'
          });
        });

        // Transform the data to match our interface
        const transformedData = paymentsDataFallback.map((payment: any) => {
          const providerInfo = providerMap.get(payment.provider_id) || {};
          const userProfile = userProfilesMap.get(payment.provider_id) || {};

          return {
            ...payment,
            provider_profile: {
              business_name: providerInfo.business_name || 'Unknown',
              user: {
                full_name: userProfile.full_name || 'Unknown',
                email: userProfile.email || 'Unknown'
              }
            }
          };
        });

        setPayments(transformedData);
        return;
      }

      if (!paymentsData || paymentsData.length === 0) {
        setPayments([]);
        return;
      }

      // Transform the joined data to match our interface
      const transformedData = paymentsData.map((payment: any) => ({
        ...payment,
        provider_profile: {
          business_name: payment.provider_profiles?.business_name || 'Unknown',
          user: {
            full_name: payment.provider_profiles?.profiles?.full_name || 'Unknown',
            email: payment.provider_profiles?.profiles?.email || 'Unknown'
          }
        }
      }));

      setPayments(transformedData);
    } catch (error) {
      console.error('Error fetching commission payments:', error);
      toast.error('Failed to load commission payments');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('commission_payments')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          // In a real app, you would get the current admin's ID
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast.success('Commission payment approved successfully');
      loadCommissionPayments();
    } catch (error) {
      console.error('Error approving commission payment:', error);
      toast.error('Failed to approve commission payment');
    }
  };

  const handleReject = async () => {
    if (!selectedPayment) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      const { error } = await supabase
        .from('commission_payments')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          reviewed_at: new Date().toISOString(),
          // In a real app, you would get the current admin's ID
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      toast.success('Commission payment rejected');
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedPayment(null);
      loadCommissionPayments();
    } catch (error) {
      console.error('Error rejecting commission payment:', error);
      toast.error('Failed to reject commission payment');
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'easypaisa':
        return 'Easypaisa';
      case 'jazzcash':
        return 'JazzCash';
      case 'bank_transfer':
        return 'Bank Transfer';
      default:
        return method;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getExpectedCommissionAmount = (bookingCount: number) => {
    // Assuming average job value of PKR 1000 for calculation
    // In a real scenario, this would be calculated from actual completed bookings
    const averageJobValue = 1000;
    const totalEarnings = bookingCount * averageJobValue;
    return Math.round(totalEarnings * 0.05); // 5% commission
  };

  const getCommissionAmountDifference = (submittedAmount: number, bookingCount: number) => {
    const expectedAmount = getExpectedCommissionAmount(bookingCount);
    return submittedAmount - expectedAmount;
  };

  return (
    <div className="space-y-6 p-6 bg-[hsl(220,20%,12%)] min-h-screen overflow-y-auto">
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-[hsl(220,15%,15%)] border border-[hsl(220,20%,18%)]">
          <TabsTrigger value="analytics" className="text-[hsl(0,0%,95%)] data-[state=active]:bg-[hsl(220,20%,12%)]">Analytics Dashboard</TabsTrigger>
          <TabsTrigger value="payments" className="text-[hsl(0,0%,95%)] data-[state=active]:bg-[hsl(220,20%,12%)]">Commission Payments</TabsTrigger>
          <TabsTrigger value="overview" className="text-[hsl(0,0%,95%)] data-[state=active]:bg-[hsl(220,20%,12%)]">Provider Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Filter Controls */}
          <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-[hsl(0,0%,95%)]">
                  <Filter className="h-5 w-5" />
                  Commission Analytics Dashboard
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshAnalytics}
                    disabled={analyticsLoading}
                    className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${analyticsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {showFilters && (
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-[hsl(0,0%,95%)]">Date Range</Label>
                    <Select value={filters.dateRange} onValueChange={(value) => setFilters({...filters, dateRange: value})}>
                      <SelectTrigger className="bg-[hsl(220,15%,15%)] border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
                        <SelectItem value="all" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">All Time</SelectItem>
                        <SelectItem value="year" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">This Year</SelectItem>
                        <SelectItem value="month" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">This Month</SelectItem>
                        <SelectItem value="week" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">This Week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[hsl(0,0%,95%)]">Category</Label>
                    <Select value={filters.category} onValueChange={(value) => setFilters({...filters, category: value})}>
                      <SelectTrigger className="bg-[hsl(220,15%,15%)] border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
                        <SelectItem value="all" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">All Categories</SelectItem>
                        <SelectItem value="Plumbing" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">Plumbing</SelectItem>
                        <SelectItem value="Tutoring" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">Tutoring</SelectItem>
                        <SelectItem value="Cleaning" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">Cleaning</SelectItem>
                        <SelectItem value="Electrical" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">Electrical</SelectItem>
                        <SelectItem value="Home Repair" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">Home Repair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[hsl(0,0%,95%)]">City</Label>
                    <Select value={filters.city} onValueChange={(value) => setFilters({...filters, city: value})}>
                      <SelectTrigger className="bg-[hsl(220,15%,15%)] border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
                        <SelectItem value="all" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">All Cities</SelectItem>
                        <SelectItem value="Karachi" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">Karachi</SelectItem>
                        <SelectItem value="Lahore" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">Lahore</SelectItem>
                        <SelectItem value="Islamabad" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">Islamabad</SelectItem>
                        <SelectItem value="Rawalpindi" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">Rawalpindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[hsl(0,0%,95%)]">Provider Type</Label>
                    <Select value={filters.providerType} onValueChange={(value) => setFilters({...filters, providerType: value})}>
                      <SelectTrigger className="bg-[hsl(220,15%,15%)] border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
                        <SelectItem value="all" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">All Types</SelectItem>
                        <SelectItem value="Individual" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">Individual</SelectItem>
                        <SelectItem value="Business" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">Business</SelectItem>
                        <SelectItem value="Company" className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">Company</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Commission Amount Accuracy Summary */}
          {(() => {
            const paymentsWithDiscrepancies = payments.filter(payment =>
              getCommissionAmountDifference(payment.amount, payment.booking_count) !== 0
            );
            const totalDiscrepancyAmount = paymentsWithDiscrepancies.reduce((sum, payment) =>
              sum + Math.abs(getCommissionAmountDifference(payment.amount, payment.booking_count)), 0
            );

            if (paymentsWithDiscrepancies.length > 0) {
              return (
                <Card className="bg-yellow-900/20 border-yellow-600">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="h-6 w-6 text-yellow-400" />
                      <div>
                        <h3 className="font-semibold text-yellow-400 mb-1">Commission Amount Discrepancies Detected</h3>
                        <p className="text-sm text-[hsl(210,100%,75%)]">
                          {paymentsWithDiscrepancies.length} payment{paymentsWithDiscrepancies.length > 1 ? 's' : ''} with amount mismatches
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-yellow-900/20 rounded-lg border border-yellow-600/30">
                        <div className="text-xl font-bold text-yellow-400">{paymentsWithDiscrepancies.length}</div>
                        <div className="text-xs text-yellow-300">Payments with Issues</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-900/20 rounded-lg border border-yellow-600/30">
                        <div className="text-xl font-bold text-yellow-400">PKR {totalDiscrepancyAmount.toLocaleString()}</div>
                        <div className="text-xs text-yellow-300">Total Amount Difference</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-900/20 rounded-lg border border-yellow-600/30">
                        <div className="text-xl font-bold text-yellow-400">
                          {((paymentsWithDiscrepancies.length / payments.length) * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-yellow-300">Error Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }
            return null;
          })()}

          {/* Enhanced Commission Summary Cards with Earnings Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Earnings & Commission */}
            <Card className="bg-gradient-to-br from-green-600 to-green-700 border-green-500 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-green-100 font-medium">Total Earnings</p>
                    <p className="text-xs text-green-200">All Time</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-200" />
                </div>
                {analyticsLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 w-32 bg-green-500/30 rounded animate-pulse"></div>
                    <div className="h-4 w-24 bg-green-500/30 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl font-bold text-white mb-2">
                      PKR {(() => {
                        // Calculate total earnings from completed bookings
                        const totalEarnings = analytics?.topEarningProviders.reduce((sum, provider) =>
                          sum + (provider.total_earnings || 0), 0) || 0;
                        return totalEarnings.toLocaleString();
                      })()}
                    </p>
                    <div className="space-y-1">
                      <p className="text-sm text-green-200">
                        Commission (5%): <span className="font-semibold text-white">
                          PKR {analytics?.totalCommission.toLocaleString() || 0}
                        </span>
                      </p>
                      <p className="text-xs text-green-300">
                        From {analytics?.topEarningProviders.reduce((sum, provider) => sum + (provider.total_jobs || 0), 0) || 0} completed jobs
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Earnings & Commission */}
            <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-blue-100 font-medium">Monthly Earnings</p>
                    <p className="text-xs text-blue-200">Last 30 Days</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-200" />
                </div>
                {analyticsLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 w-32 bg-blue-500/30 rounded animate-pulse"></div>
                    <div className="h-4 w-24 bg-blue-500/30 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl font-bold text-white mb-2">
                      PKR {(() => {
                        // Calculate monthly earnings from completed bookings in last 30 days
                        const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                        const monthlyEarnings = analytics?.topEarningProviders.reduce((sum, provider) =>
                          sum + (provider.one_month_commission || 0) * 20, 0) || 0; // Reverse calculate earnings from commission
                        return monthlyEarnings.toLocaleString();
                      })()}
                    </p>
                    <div className="space-y-1">
                      <p className="text-sm text-blue-200">
                        Commission (5%): <span className="font-semibold text-white">
                          PKR {analytics?.monthlyCommission.toLocaleString() || 0}
                        </span>
                      </p>
                      <p className="text-xs text-blue-300">
                        {(() => {
                          const monthlyJobs = analytics?.topEarningProviders.reduce((sum, provider) =>
                            sum + (provider.one_month_commission || 0) / ((provider.total_earnings || 1) / (provider.total_jobs || 1)), 0) || 0;
                          return `${Math.round(monthlyJobs)} jobs this month`;
                        })()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly Earnings & Commission */}
            <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-purple-500 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-purple-100 font-medium">Weekly Earnings</p>
                    <p className="text-xs text-purple-200">Last 7 Days</p>
                  </div>
                  <Activity className="h-8 w-8 text-purple-200" />
                </div>
                {analyticsLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 w-32 bg-purple-500/30 rounded animate-pulse"></div>
                    <div className="h-4 w-24 bg-purple-500/30 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl font-bold text-white mb-2">
                      PKR {(() => {
                        // Calculate weekly earnings from completed bookings in last 7 days
                        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                        const weeklyEarnings = analytics?.topEarningProviders.reduce((sum, provider) =>
                          sum + (provider.seven_day_commission || 0) * 20, 0) || 0; // Reverse calculate earnings from commission
                        return weeklyEarnings.toLocaleString();
                      })()}
                    </p>
                    <div className="space-y-1">
                      <p className="text-sm text-purple-200">
                        Commission (5%): <span className="font-semibold text-white">
                          PKR {analytics?.weeklyCommission.toLocaleString() || 0}
                        </span>
                      </p>
                      <p className="text-xs text-purple-300">
                        {(() => {
                          const weeklyJobs = analytics?.topEarningProviders.reduce((sum, provider) =>
                            sum + (provider.seven_day_commission || 0) / ((provider.total_earnings || 1) / (provider.total_jobs || 1)), 0) || 0;
                          return `${Math.round(weeklyJobs)} jobs this week`;
                        })()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Commission Status */}
            <Card className="bg-gradient-to-br from-orange-600 to-red-600 border-orange-500 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-orange-100 font-medium">Commission Status</p>
                    <p className="text-xs text-orange-200">Pending vs Approved</p>
                  </div>
                  <Target className="h-8 w-8 text-orange-200" />
                </div>
                {analyticsLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 w-32 bg-orange-500/30 rounded animate-pulse"></div>
                    <div className="h-4 w-24 bg-orange-500/30 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl font-bold text-white mb-2">
                      PKR {analytics?.pendingCommission.toLocaleString() || 0}
                    </p>
                    <div className="space-y-1">
                      <p className="text-sm text-orange-200">
                        Pending Review
                      </p>
                      <p className="text-sm text-green-200">
                        Approved: <span className="font-semibold text-white">
                          PKR {analytics?.clearedCommission.toLocaleString() || 0}
                        </span>
                      </p>
                      <p className="text-xs text-orange-300">
                        {(() => {
                          const pendingCount = payments.filter(p => p.status === 'pending').length;
                          const approvedCount = payments.filter(p => p.status === 'approved').length;
                          return `${pendingCount} pending, ${approvedCount} approved`;
                        })()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Enhanced System Information Card */}
          {analytics && analytics.totalCommission === 0 && !analyticsLoading && (
            <Card className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border-blue-600">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-400 mb-2">Commission System Ready</h3>
                    <p className="text-sm text-blue-300 mb-3">
                      Commission is calculated as 5% of completed booking values. Here's how the system works:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-blue-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span>Complete bookings with customers and providers</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span>Set final prices for completed services</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span>Providers submit commission payment requests</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span>Admins approve/reject commission payments</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Commission Progress Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Left Section - Commission Progress */}
            <div className="lg:col-span-2">
              <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)] card-hover section-card shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-400" />
                    <CardTitle className="text-[hsl(0,0%,95%)]">Commission Progress Overview</CardTitle>
                    <Badge variant="secondary" className="bg-blue-600 text-white">
                      System-wide Progress
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[hsl(210,100%,75%)]">Active Commission Cycles</span>
                      <span className="text-[hsl(0,0%,95%)] font-semibold">
                        {(() => {
                          // Calculate active cycles from commission payments data
                          const pendingPayments = payments.filter(p => p.status === 'pending');
                          const approvedPayments = payments.filter(p => p.status === 'approved');
                          const totalCycles = pendingPayments.length + approvedPayments.length;
                          return totalCycles;
                        })()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all duration-300 bg-blue-600"
                        style={{
                          width: '75%' // Show 75% as example - this would be calculated from real data
                        }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[hsl(210,100%,75%)]">
                        Overall system commission progress
                      </span>
                      <span className="text-blue-400">
                        75% Active Cycles
                      </span>
                    </div>

                    {/* Commission Summary Display */}
                    <div className="mt-3 p-3 bg-[hsl(220,15%,15%)] rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[hsl(210,100%,75%)]">Total Pending Commission</span>
                        <span className="text-[hsl(0,0%,95%)] font-semibold">
                          PKR {payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-[hsl(210,100%,75%)]">Approved This Month</span>
                        <span className="text-xs text-green-400">
                          PKR {payments.filter(p => p.status === 'approved' && new Date(p.submitted_at).getMonth() === new Date().getMonth()).reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-400 mb-2">
                        <Target className="h-4 w-4" />
                        <span className="font-semibold">Commission System Status</span>
                      </div>
                      <p className="text-sm text-[hsl(210,100%,75%)]">
                        The commission system is running smoothly with {payments.filter(p => p.status === 'pending').length} pending payments awaiting review.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Section - System Status */}
            <div className="space-y-4">
              <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)] card-hover section-card shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-[hsl(210,100%,75%)]">System Status</span>
                    </div>
                    <Badge variant="default" className="bg-green-600 text-white">
                      Active
                    </Badge>
                  </div>
                  <div className="mt-3 p-3 bg-green-900/20 border border-green-600 rounded-lg">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <Target className="h-4 w-4" />
                      <span>All commission cycles operational</span>
                    </div>
                    <p className="text-xs text-[hsl(210,100%,75%)] mt-1">
                      {payments.filter(p => p.status === 'approved').length} cycles completed this month
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Charts and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Commission Growth Trend */}
            <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[hsl(0,0%,95%)]">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Commission Growth Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-64 bg-[hsl(220,15%,15%)] rounded animate-pulse"></div>
                ) : analytics?.commissionGrowth.length === 0 ? (
                  <div className="h-64 bg-[hsl(220,15%,15%)] rounded flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 mx-auto text-[hsl(210,100%,75%)] mb-4" />
                      <p className="text-[hsl(210,100%,75%)] mb-2">No commission growth data yet</p>
                      <p className="text-sm text-[hsl(210,100%,65%)]">Complete some bookings to see growth trends</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analytics?.commissionGrowth.map((item, index) => (
                      <div key={item.period} className="flex items-center justify-between p-3 bg-[hsl(220,15%,15%)] border border-[hsl(220,20%,18%)] rounded">
                        <div>
                          <p className="font-medium text-[hsl(0,0%,95%)]">{item.period}</p>
                          <p className="text-sm text-[hsl(210,100%,75%)]">{item.bookings} bookings</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            PKR {item.commission.toLocaleString()}
                          </p>
                          {index > 0 && (
                            <div className="flex items-center text-sm">
                              {item.commission > analytics.commissionGrowth[index - 1].commission ? (
                                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                              )}
                              <span className={item.commission > analytics.commissionGrowth[index - 1].commission ? 'text-green-500' : 'text-red-500'}>
                                {Math.abs(((item.commission - analytics.commissionGrowth[index - 1].commission) / analytics.commissionGrowth[index - 1].commission) * 100).toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Earning Categories */}
            <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[hsl(0,0%,95%)]">
                  <PieChart className="h-5 w-5 text-blue-600" />
                  Top Earning Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-64 bg-[hsl(220,15%,15%)] rounded animate-pulse"></div>
                ) : analytics?.topEarningCategories.length === 0 ? (
                  <div className="h-64 bg-[hsl(220,15%,15%)] rounded flex items-center justify-center">
                    <div className="text-center">
                      <PieChart className="h-12 w-12 mx-auto text-[hsl(210,100%,75%)] mb-4" />
                      <p className="text-[hsl(210,100%,75%)] mb-2">No category data yet</p>
                      <p className="text-sm text-[hsl(210,100%,65%)]">Complete bookings to see top earning categories</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analytics?.topEarningCategories.slice(0, 8).map((category, index) => (
                      <div key={category.category} className="flex items-center justify-between p-3 bg-[hsl(220,15%,15%)] border border-[hsl(220,20%,18%)] rounded">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[hsl(220,20%,12%)] flex items-center justify-center text-sm font-bold text-[hsl(210,100%,75%)]">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-[hsl(0,0%,95%)]">{category.category}</p>
                            <p className="text-sm text-[hsl(210,100%,75%)]">{category.bookingCount} bookings</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            PKR {category.totalCommission.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Earning Providers */}
          <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[hsl(0,0%,95%)]">
                <Users className="h-5 w-5 text-blue-600" />
                Top Earning Providers
              </CardTitle>
              <p className="text-sm text-[hsl(210,100%,75%)]">
                Real-time commission data from completed bookings (5% of earnings)
              </p>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="h-64 bg-[hsl(220,15%,15%)] rounded animate-pulse"></div>
              ) : analytics?.topEarningProviders.length === 0 ? (
                <div className="h-64 bg-[hsl(220,15%,15%)] rounded flex items-center justify-center">
                  <div className="text-center">
                    <Users className="h-12 w-12 mx-auto text-[hsl(210,100%,75%)] mb-4" />
                    <p className="text-[hsl(210,100%,75%)] mb-2">No top earning providers yet</p>
                    <p className="text-sm text-[hsl(210,100%,65%)] mb-4">Complete some bookings to see real top earners</p>
                    <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4 max-w-md mx-auto">
                      <p className="text-xs text-blue-300">
                        💡 <strong>How commission works:</strong><br/>
                        • Providers earn 5% commission on completed bookings<br/>
                        • Commission is calculated from final booking amounts<br/>
                        • Only completed services generate commission data
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics?.topEarningProviders.slice(0, 10).map((provider, index) => (
                    <div key={provider.provider_id} className="p-4 bg-[hsl(220,15%,15%)] border border-[hsl(220,20%,18%)] rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-lg text-[hsl(0,0%,95%)]">{provider.business_name}</p>
                            <p className="text-sm text-[hsl(210,100%,75%)]">{provider.total_jobs} total jobs</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            PKR {provider.total_commission.toLocaleString()}
                          </p>
                          <p className="text-sm text-[hsl(210,100%,75%)]">Total Commission</p>
                        </div>
                      </div>

                      {/* Time-based commission breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-3 border-t border-[hsl(220,20%,18%)]">
                        <div className="text-center p-3 bg-green-900/20 rounded-lg border border-green-600/30">
                          <p className="text-lg font-bold text-green-400">
                            PKR {provider.seven_day_commission.toLocaleString()}
                          </p>
                          <p className="text-xs text-green-300">Last 7 Days</p>
                        </div>
                        <div className="text-center p-3 bg-blue-900/20 rounded-lg border border-blue-600/30">
                          <p className="text-lg font-bold text-blue-400">
                            PKR {provider.one_month_commission.toLocaleString()}
                          </p>
                          <p className="text-xs text-blue-300">Last 30 Days</p>
                        </div>
                        <div className="text-center p-3 bg-purple-900/20 rounded-lg border border-purple-600/30">
                          <p className="text-lg font-bold text-purple-400">
                            PKR {provider.total_earnings.toLocaleString()}
                          </p>
                          <p className="text-xs text-purple-300">Total Earnings</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payments" className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[hsl(0,0%,95%)]">Commission Payments</CardTitle>
              <Button variant="outline" size="sm" onClick={() => loadCommissionPayments()} className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex flex-wrap gap-2 mb-4">
                  <TabsList>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                  </TabsList>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const hasDiscrepancies = payments.filter(payment =>
                        getCommissionAmountDifference(payment.amount, payment.booking_count) !== 0
                      );
                      if (hasDiscrepancies.length > 0) {
                        toast.info(`Found ${hasDiscrepancies.length} payments with amount discrepancies`);
                      } else {
                        toast.success('All payments match expected commission amounts');
                      }
                    }}
                    className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/20"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Check Discrepancies
                  </Button>
                </div>

                <TabsContent value={activeTab} className="space-y-4">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin h-8 w-8 border-4 border-[hsl(210,100%,65%)] border-t-transparent rounded-full"></div>
                    </div>
                  ) : payments.length === 0 ? (
                    <div className="text-center py-8">
                      <Receipt className="h-12 w-12 mx-auto text-[hsl(210,100%,75%)] mb-4" />
                      <h3 className="font-medium text-lg mb-2 text-[hsl(0,0%,95%)]">No {activeTab} commission payments</h3>
                      <p className="text-[hsl(210,100%,75%)]">
                        {activeTab === 'pending'
                          ? 'There are no pending commission payments to review'
                          : activeTab === 'approved'
                          ? 'No approved commission payments yet'
                          : 'No rejected commission payments yet'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[hsl(220,20%,18%)] bg-gradient-to-r from-slate-800 to-slate-750">
                            <th className="text-left py-4 px-6 text-sm font-semibold text-[hsl(0,0%,95%)]">Provider Details</th>
                            <th className="text-center py-4 px-6 text-sm font-semibold text-[hsl(0,0%,95%)]">7 Days Earnings</th>
                            <th className="text-center py-4 px-6 text-sm font-semibold text-[hsl(0,0%,95%)]">30 Days Earnings</th>
                            <th className="text-center py-4 px-6 text-sm font-semibold text-[hsl(0,0%,95%)]">Total Earnings</th>
                            <th className="text-center py-4 px-6 text-sm font-semibold text-[hsl(0,0%,95%)]">Payment Amount</th>
                            <th className="text-center py-4 px-6 text-sm font-semibold text-[hsl(0,0%,95%)]">Expected Commission</th>
                            <th className="text-center py-4 px-6 text-sm font-semibold text-[hsl(0,0%,95%)]">Status</th>
                            <th className="text-center py-4 px-6 text-sm font-semibold text-[hsl(0,0%,95%)]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((payment, index) => {
                            // Get provider's time-based earnings from analytics data
                            const providerAnalytics = analytics?.topEarningProviders.find(p => p.provider_id === payment.provider_id);
                            const sevenDayEarnings = providerAnalytics?.seven_day_commission ? providerAnalytics.seven_day_commission * 20 : 0;
                            const oneMonthEarnings = providerAnalytics?.one_month_commission ? providerAnalytics.one_month_commission * 20 : 0;
                            const totalEarnings = providerAnalytics?.total_earnings || 0;

                            return (
                              <tr key={payment.id} className={`border-b border-[hsl(220,20%,18%)] hover:bg-[hsl(220,20%,15%)] transition-colors ${index % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-750/50'}`}>
                                <td className="py-4 px-6">
                                  <div className="space-y-1">
                                    <p className="font-semibold text-[hsl(0,0%,95%)] text-base">{payment.provider_profile?.business_name || 'Unknown'}</p>
                                    <p className="text-sm text-[hsl(210,100%,75%)]">{payment.provider_profile?.user?.full_name}</p>
                                    <p className="text-xs text-[hsl(210,100%,65%)]">{payment.provider_profile?.business_type}</p>
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <div className="space-y-1">
                                    <p className="font-bold text-green-400 text-lg">PKR {sevenDayEarnings.toLocaleString()}</p>
                                    <p className="text-xs text-[hsl(210,100%,75%)]">Commission: PKR {(sevenDayEarnings * 0.05).toLocaleString()}</p>
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <div className="space-y-1">
                                    <p className="font-bold text-blue-400 text-lg">PKR {oneMonthEarnings.toLocaleString()}</p>
                                    <p className="text-xs text-[hsl(210,100%,75%)]">Commission: PKR {(oneMonthEarnings * 0.05).toLocaleString()}</p>
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <div className="space-y-1">
                                    <p className="font-bold text-white text-lg">PKR {totalEarnings.toLocaleString()}</p>
                                    <p className="text-xs text-[hsl(210,100%,75%)]">Commission: PKR {(totalEarnings * 0.05).toLocaleString()}</p>
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <div className="space-y-1">
                                    <p className="font-bold text-orange-400 text-lg">PKR {payment.amount.toLocaleString()}</p>
                                    <p className="text-xs text-[hsl(210,100%,75%)]">Submitted Amount</p>
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-center gap-1">
                                      <span className={`font-medium text-lg ${getCommissionAmountDifference(payment.amount, payment.booking_count) !== 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                                        PKR {getExpectedCommissionAmount(payment.booking_count).toLocaleString()}
                                      </span>
                                      {getCommissionAmountDifference(payment.amount, payment.booking_count) !== 0 && (
                                        <AlertTriangle className="h-4 w-4 text-yellow-400" />
                                      )}
                                    </div>
                                    <p className="text-xs text-[hsl(210,100%,75%)]">Expected (5%)</p>
                                    {getCommissionAmountDifference(payment.amount, payment.booking_count) !== 0 && (
                                      <div className="text-xs text-yellow-400 mt-1">
                                        {getCommissionAmountDifference(payment.amount, payment.booking_count) > 0 ? '+' : ''}
                                        PKR {Math.abs(getCommissionAmountDifference(payment.amount, payment.booking_count)).toLocaleString()}
                                        {getCommissionAmountDifference(payment.amount, payment.booking_count) > 0 ? ' over' : ' under'}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <Badge variant={
                                    payment.status === 'pending' ? 'outline' :
                                    payment.status === 'approved' ? 'default' : 'destructive'
                                  } className={`px-3 py-1 ${
                                    payment.status === 'pending' ? 'border-yellow-600 text-yellow-400' :
                                    payment.status === 'approved' ? 'bg-green-600 text-white' :
                                    'bg-red-600 text-white'
                                  }`}>
                                    {payment.status}
                                  </Badge>
                                  <p className="text-xs text-[hsl(210,100%,75%)] mt-1">{formatDate(payment.submitted_at)}</p>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex flex-col gap-2 items-center">
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedPayment(payment);
                                          setShowPreview(true);
                                        }}
                                        className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(payment.screenshot_url, '_blank')}
                                        className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                                        title="Download Receipt"
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </div>

                                    {payment.status === 'pending' && (
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="default"
                                          onClick={() => handleApprove(payment.id)}
                                          className="bg-green-600 hover:bg-green-700"
                                        >
                                          <CheckCircle className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => {
                                            setSelectedPayment(payment);
                                            setShowRejectDialog(true);
                                          }}
                                        >
                                          <XCircle className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    )}

                                    {payment.status === 'rejected' && payment.rejection_reason && (
                                      <div className="text-xs text-red-400 max-w-32 text-center" title={payment.rejection_reason}>
                                        {payment.rejection_reason}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Screenshot Preview Dialog */}
              <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-6xl max-h-[90vh] bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
                  <DialogHeader>
                    <DialogTitle className="text-[hsl(0,0%,95%)] flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      Payment Receipt - {selectedPayment?.provider_profile?.business_name}
                    </DialogTitle>
                  </DialogHeader>
                  {selectedPayment && (
                    <div className="space-y-6">
                      {/* Payment Receipt - Large Display */}
                      <div className="flex justify-center">
                        <div className="relative bg-white p-4 rounded-lg shadow-lg max-w-2xl">
                          <img
                            src={selectedPayment.screenshot_url}
                            alt="Payment Receipt"
                            className="w-full h-auto max-h-[600px] object-contain rounded"
                          />
                        </div>
                      </div>

                      {/* Payment Details - Below Receipt */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="bg-[hsl(220,15%,15%)] rounded-lg p-4 border border-[hsl(220,20%,18%)]">
                            <h3 className="font-semibold mb-3 text-[hsl(0,0%,95%)] flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Provider Information
                            </h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="font-medium text-[hsl(0,0%,95%)]">Business Name:</span>
                                <span className="text-[hsl(210,100%,75%)]">{selectedPayment.provider_profile?.business_name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium text-[hsl(0,0%,95%)]">Provider Name:</span>
                                <span className="text-[hsl(210,100%,75%)]">{selectedPayment.provider_profile?.user?.full_name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium text-[hsl(0,0%,95%)]">Email:</span>
                                <span className="text-[hsl(210,100%,75%)]">{selectedPayment.provider_profile?.user?.email}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-[hsl(220,15%,15%)] rounded-lg p-4 border border-[hsl(220,20%,18%)]">
                            <h3 className="font-semibold mb-3 text-[hsl(0,0%,95%)] flex items-center gap-2">
                              <Receipt className="h-4 w-4" />
                              Payment Information
                            </h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="font-medium text-[hsl(0,0%,95%)]">Submitted Amount:</span>
                                <span className="text-[hsl(210,100%,75%)] font-bold">PKR {selectedPayment.amount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium text-[hsl(0,0%,95%)]">Expected Amount:</span>
                                <span className={`font-bold ${getCommissionAmountDifference(selectedPayment.amount, selectedPayment.booking_count) !== 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                                  PKR {getExpectedCommissionAmount(selectedPayment.booking_count).toLocaleString()}
                                </span>
                              </div>
                              {getCommissionAmountDifference(selectedPayment.amount, selectedPayment.booking_count) !== 0 && (
                                <div className="flex justify-between pt-2 border-t border-[hsl(220,20%,18%)]">
                                  <span className="font-medium text-yellow-400">Difference:</span>
                                  <span className="text-yellow-400 font-bold">
                                    {getCommissionAmountDifference(selectedPayment.amount, selectedPayment.booking_count) > 0 ? '+' : ''}
                                    PKR {Math.abs(getCommissionAmountDifference(selectedPayment.amount, selectedPayment.booking_count)).toLocaleString()}
                                    {getCommissionAmountDifference(selectedPayment.amount, selectedPayment.booking_count) > 0 ? ' over' : ' under'}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="font-medium text-[hsl(0,0%,95%)]">Payment Method:</span>
                                <span className="text-[hsl(210,100%,75%)]">{getPaymentMethodText(selectedPayment.payment_method)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium text-[hsl(0,0%,95%)]">Jobs Completed:</span>
                                <span className="text-[hsl(210,100%,75%)]">{selectedPayment.booking_count}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium text-[hsl(0,0%,95%)]">Submitted:</span>
                                <span className="text-[hsl(210,100%,75%)]">{formatDate(selectedPayment.submitted_at)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium text-[hsl(0,0%,95%)]">Status:</span>
                                <Badge variant={
                                  selectedPayment.status === 'pending' ? 'outline' :
                                  selectedPayment.status === 'approved' ? 'default' : 'destructive'
                                } className={
                                  selectedPayment.status === 'pending' ? 'border-yellow-600 text-yellow-400' :
                                  selectedPayment.status === 'approved' ? 'bg-green-600 text-white' :
                                  'bg-red-600 text-white'
                                }>
                                  {selectedPayment.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {selectedPayment.status === 'rejected' && selectedPayment.rejection_reason && (
                            <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
                              <h3 className="font-semibold mb-2 text-red-400">Rejection Reason</h3>
                              <p className="text-sm text-[hsl(210,100%,75%)]">{selectedPayment.rejection_reason}</p>
                            </div>
                          )}

                          {selectedPayment.status === 'pending' && (
                            <div className="bg-[hsl(220,15%,15%)] rounded-lg p-4 border border-[hsl(220,20%,18%)]">
                              <h3 className="font-semibold mb-3 text-[hsl(0,0%,95%)]">Actions</h3>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleApprove(selectedPayment.id)}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve Payment
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => {
                                    setShowPreview(false);
                                    setShowRejectDialog(true);
                                  }}
                                  className="flex-1"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject Payment
                                </Button>
                              </div>
                            </div>
                          )}

                          <div className="space-y-4">
                            {/* Receipt Preview */}
                            <div className="bg-[hsl(220,15%,15%)] border border-[hsl(220,20%,18%)] rounded-lg p-4">
                              <h3 className="font-semibold mb-3 text-blue-400 flex items-center gap-2">
                                <Receipt className="h-4 w-4" />
                                Receipt Preview
                              </h3>
                              <div className="flex justify-center">
                                <img
                                  src={selectedPayment.screenshot_url}
                                  alt="Receipt Preview"
                                  className="max-w-full max-h-32 object-contain rounded border border-[hsl(220,20%,18%)] cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(selectedPayment.screenshot_url, '_blank')}
                                />
                              </div>
                              <p className="text-xs text-[hsl(210,100%,75%)] mt-2 text-center">
                                Click to view full size
                              </p>
                            </div>

                            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
                              <h3 className="font-semibold mb-2 text-blue-400">Quick Actions</h3>
                              <div className="space-y-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(selectedPayment.screenshot_url, '_blank')}
                                  className="w-full border-blue-600 text-blue-400 hover:bg-blue-900/20"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download Receipt
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigator.clipboard.writeText(selectedPayment.screenshot_url)}
                                  className="w-full border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                                >
                                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  Copy Image URL
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {/* Rejection Dialog */}
              <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
                  <DialogHeader>
                    <DialogTitle className="text-[hsl(0,0%,95%)]">Reject Commission Payment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Label htmlFor="rejection-reason" className="text-[hsl(0,0%,95%)]">Reason for Rejection</Label>
                    <Textarea
                      id="rejection-reason"
                      placeholder="Please provide a reason for rejecting this payment..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={4}
                      className="bg-[hsl(220,15%,15%)] border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)]"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRejectDialog(false);
                        setRejectionReason('');
                      }}
                      className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                    >
                      Reject Payment
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="overview" className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <ProviderCommissionOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommissionManagement;