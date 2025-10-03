import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Receipt,
  Users,
  Star,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  RefreshCw,
  DollarSign,
  Activity,
  Target,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Provider {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  business_address: string;
  rating?: number;
  total_jobs?: number;
  total_earnings?: number;
  total_commission?: number;
  current_cycle_commission?: number;
  completed_jobs_since_commission: number;
  last_commission_paid_at?: string;
  commission_reminder_active: boolean;
  has_approved_payment?: boolean;
  latest_approved_payment_date?: string;
  profiles?: {
    full_name: string;
    email: string;
    phone?: string;
  };
}

interface CommissionPayment {
  id: string;
  provider_id: string;
  amount: number;
  payment_method: string;
  screenshot_url: string;
  booking_count: number;
  status: string;
  rejection_reason?: string;
  submitted_at: string;
  reviewed_at?: string;
  provider_name?: string;
  provider_business?: string;
  reviewer_name?: string;
}

interface ProviderDetail extends Provider {
  commission_history: CommissionPayment[];
  has_approved_payment?: boolean;
  latest_approved_payment_date?: string;
  total_commission?: number;
  current_cycle_commission?: number;
}

const ProviderCommissionOverview = () => {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderDetail | null>(null);
  const [showProviderDetail, setShowProviderDetail] = useState(false);
  const [filter, setFilter] = useState<'all' | 'due' | 'paid'>('all');
  const [timeFilter, setTimeFilter] = useState<'7days' | '30days' | 'total'>('total');
  const [topProvidersTimeFilter, setTopProvidersTimeFilter] = useState<'7days' | '30days' | 'total'>('total');
  const [timeBasedStats, setTimeBasedStats] = useState({
    oneWeek: { earnings: 0, commission: 0 },
    oneMonth: { earnings: 0, commission: 0 },
    total: { earnings: 0, commission: 0 }
  });
  const [topProviders, setTopProviders] = useState<any[]>([]);

  useEffect(() => {
    loadProviders();
  }, []);

  // Reload data when filter changes
  useEffect(() => {
    loadProviders();
  }, [filter]);

  const calculateTimeBasedStats = async () => {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      console.log('Time calculation debug:', {
        now: now.toISOString(),
        oneWeekAgo: oneWeekAgo.toISOString(),
        oneMonthAgo: oneMonthAgo.toISOString()
      });

      // Get all completed bookings with their dates
      const { data: allBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('final_price, completed_at, provider_id')
        .eq('status', 'completed')
        .not('final_price', 'is', null)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (bookingsError) {
        console.error('Error fetching bookings for time-based stats:', bookingsError);
        return;
      }

      console.log('Total bookings found:', allBookings?.length || 0);

      let oneWeekEarnings = 0;
      let oneMonthEarnings = 0;
      let totalEarnings = 0;
      let oneWeekBookings = 0;
      let oneMonthBookings = 0;
      let totalBookings = 0;

      allBookings?.forEach(booking => {
        const completedDate = new Date(booking.completed_at);
        const earnings = booking.final_price || 0;

        console.log('Processing booking:', {
          completed_at: booking.completed_at,
          completedDate: completedDate.toISOString(),
          earnings: earnings,
          isInOneWeek: completedDate >= oneWeekAgo,
          isInOneMonth: completedDate >= oneMonthAgo
        });

        totalEarnings += earnings;
        totalBookings += 1;

        if (completedDate >= oneWeekAgo) {
          oneWeekEarnings += earnings;
          oneWeekBookings += 1;
        }

        if (completedDate >= oneMonthAgo) {
          oneMonthEarnings += earnings;
          oneMonthBookings += 1;
        }
      });

      console.log('Final calculations:', {
        oneWeek: { earnings: oneWeekEarnings, bookings: oneWeekBookings },
        oneMonth: { earnings: oneMonthEarnings, bookings: oneMonthBookings },
        total: { earnings: totalEarnings, bookings: totalBookings }
      });

      setTimeBasedStats({
        oneWeek: {
          earnings: oneWeekEarnings,
          commission: oneWeekEarnings * 0.05
        },
        oneMonth: {
          earnings: oneMonthEarnings,
          commission: oneMonthEarnings * 0.05
        },
        total: {
          earnings: totalEarnings,
          commission: totalEarnings * 0.05
        }
      });
    } catch (error) {
      console.error('Error calculating time-based stats:', error);
    }
  };

  const calculateTopProviders = async () => {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get all completed bookings with provider info
      const { data: allBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          final_price,
          completed_at,
          provider_id,
          provider_profiles!provider_id (
            business_name,
            business_type,
            user_id
          )
        `)
        .eq('status', 'completed')
        .not('final_price', 'is', null)
        .not('completed_at', 'is', null);

      if (bookingsError) {
        console.error('Error fetching bookings for top providers:', bookingsError);
        return;
      }

      // Group bookings by provider and calculate time-based earnings
      const providerEarnings = new Map();

      allBookings?.forEach(booking => {
        const providerId = booking.provider_id;
        const completedDate = new Date(booking.completed_at);
        const earnings = booking.final_price || 0;

        if (!providerEarnings.has(providerId)) {
          providerEarnings.set(providerId, {
            providerId,
            businessName: (booking.provider_profiles as any)?.business_name || 'Unknown',
            businessType: (booking.provider_profiles as any)?.business_type || 'Unknown',
            totalEarnings: 0,
            oneWeekEarnings: 0,
            oneMonthEarnings: 0,
            totalBookings: 0,
            oneWeekBookings: 0,
            oneMonthBookings: 0
          });
        }

        const providerData = providerEarnings.get(providerId);
        providerData.totalEarnings += earnings;
        providerData.totalBookings += 1;

        if (completedDate >= oneWeekAgo) {
          providerData.oneWeekEarnings += earnings;
          providerData.oneWeekBookings += 1;
        }

        if (completedDate >= oneMonthAgo) {
          providerData.oneMonthEarnings += earnings;
          providerData.oneMonthBookings += 1;
        }
      });

      // Convert to array and sort by selected time period
      let sortedProviders = Array.from(providerEarnings.values());

      if (topProvidersTimeFilter === '7days') {
        sortedProviders.sort((a, b) => b.oneWeekEarnings - a.oneWeekEarnings);
      } else if (topProvidersTimeFilter === '30days') {
        sortedProviders.sort((a, b) => b.oneMonthEarnings - a.oneMonthEarnings);
      } else {
        sortedProviders.sort((a, b) => b.totalEarnings - a.totalEarnings);
      }

      // Take top 10 providers
      sortedProviders = sortedProviders.slice(0, 10);

      console.log('Top providers calculated:', sortedProviders.length);
      setTopProviders(sortedProviders);
    } catch (error) {
      console.error('Error calculating top providers:', error);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    // Subscribe to provider_profiles changes
    const providerSubscription = supabase
      .channel('provider_profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_profiles'
        },
        (payload) => {
          console.log('Provider profiles changed:', payload);
          loadProviders(); // Reload data when provider profiles change
        }
      )
      .subscribe();

    // Subscribe to commission_payments changes
    const commissionSubscription = supabase
      .channel('commission_payments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commission_payments'
        },
        (payload) => {
          console.log('Commission payments changed:', payload);
          loadProviders(); // Reload data when commission payments change
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      providerSubscription.unsubscribe();
      commissionSubscription.unsubscribe();
    };
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      // Build query based on filter
      let query = supabase
        .from('provider_profiles')
        .select('*')
        .not('business_name', 'is', null)
        .not('business_type', 'is', null);

      // Only apply the 5+ jobs filter for "Payment Due", not for "All Providers"
      if (filter === 'due') {
        query = query.gte('completed_jobs_since_commission', 5);
      } else if (filter === 'paid') {
        query = query.lt('completed_jobs_since_commission', 5);
      }
      // For 'all' filter, don't apply any job count filter

      const { data: providersData, error: providersError } = await query.order('completed_jobs_since_commission', { ascending: false });

      // Calculate time-based summary stats
      await calculateTimeBasedStats();

      // Calculate top providers
      await calculateTopProviders();

      if (providersError) {
        console.error('Supabase query error for providers:', providersError);
        // Only show error if it's not just a missing table issue
        if (!providersError.message.includes('does not exist')) {
          throw providersError;
        }
        // If table doesn't exist, just set empty array
        setProviders([]);
        return;
      }

      if (!providersData || providersData.length === 0) {
        setProviders([]);
        return;
      }

      // Get unique user IDs for profiles lookup
      const userIds = providersData.map(p => p.user_id);

      // Fetch profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Continue with empty profiles data
      }

      // Fetch completed bookings count and commission payment status for each provider
      const providersWithStats = await Promise.all(
        providersData.map(async (provider: any) => {
          // Get completed bookings with dates for time-based calculations
          const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select('id, final_price, status, completed_at')
            .eq('provider_id', provider.user_id)
            .eq('status', 'completed');

          if (bookingsError) {
            console.error('Error fetching bookings for provider:', provider.user_id, bookingsError);
            return {
              ...provider,
              total_jobs: 0,
              total_earnings: 0,
              has_approved_payment: false,
              latest_approved_payment_date: null
            };
          }

          const totalJobs = bookingsData?.length || 0;
          const totalEarnings = bookingsData?.reduce((sum, booking) => sum + (booking.final_price || 0), 0) || 0;

          // Calculate time-based earnings for this provider
          const now = new Date();
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

          let oneWeekEarnings = 0;
          let oneMonthEarnings = 0;

          bookingsData?.forEach(booking => {
            if (booking.completed_at) {
              const completedDate = new Date(booking.completed_at);
              const earnings = booking.final_price || 0;

              if (completedDate >= oneWeekAgo) {
                oneWeekEarnings += earnings;
              }
              if (completedDate >= oneMonthAgo) {
                oneMonthEarnings += earnings;
              }
            }
          });

          // Check for approved commission payments
          const { data: approvedPayments, error: paymentError } = await supabase
            .from('commission_payments')
            .select('submitted_at, reviewed_at, status')
            .eq('provider_id', provider.user_id)
            .eq('status', 'approved')
            .order('submitted_at', { ascending: false })
            .limit(1);

          if (paymentError) {
            console.error('Error fetching commission payments for provider:', provider.user_id, paymentError);
          }

          const hasApprovedPayment = approvedPayments && approvedPayments.length > 0;
          const latestApprovedPaymentDate = hasApprovedPayment ? approvedPayments[0].reviewed_at || approvedPayments[0].submitted_at : null;

          // Calculate current cycle jobs correctly
          let currentCycleJobs;
          if (hasApprovedPayment && latestApprovedPaymentDate) {
            const lastPaidDate = new Date(latestApprovedPaymentDate);
            const daysSinceLastPayment = (Date.now() - lastPaidDate.getTime()) / (1000 * 60 * 60 * 24);

            if (daysSinceLastPayment <= 30) {
              // If there's a recent approved payment, use the database value or 0
              currentCycleJobs = provider.completed_jobs_since_commission || 0;
            } else {
              // If payment is old, calculate based on total completed jobs
              currentCycleJobs = totalJobs % 5;
            }
          } else {
            // If no recent approved payment, calculate based on total completed jobs
            currentCycleJobs = totalJobs % 5;
          }

          // Calculate commission amounts based on actual earnings
          const totalCommission = totalEarnings * 0.05; // 5% commission
          const currentCycleEarnings = currentCycleJobs * (totalEarnings / totalJobs); // Estimate current cycle earnings
          const currentCycleCommission = currentCycleEarnings * 0.05; // 5% of current cycle

          return {
            ...provider,
            total_jobs: totalJobs,
            total_earnings: totalEarnings,
            total_commission: totalCommission,
            current_cycle_commission: currentCycleCommission,
            one_week_earnings: oneWeekEarnings,
            one_month_earnings: oneMonthEarnings,
            one_week_commission: oneWeekEarnings * 0.05,
            one_month_commission: oneMonthEarnings * 0.05,
            has_approved_payment: hasApprovedPayment,
            latest_approved_payment_date: latestApprovedPaymentDate,
            completed_jobs_since_commission: currentCycleJobs
          };
        })
      );

      // Create a map of profiles data for easy lookup
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.user_id, {
          full_name: profile.full_name || 'Unknown',
          email: profile.email || 'Unknown',
          phone: profile.phone || ''
        });
      });

      // Transform the data to match our interface
      const transformedData = providersWithStats.map((provider: any) => ({
        id: provider.id,
        user_id: provider.user_id,
        business_name: provider.business_name,
        business_type: provider.business_type,
        business_address: provider.business_address,
        rating: provider.rating,
        total_jobs: provider.total_jobs,
        total_earnings: provider.total_earnings,
        total_commission: provider.total_commission,
        current_cycle_commission: provider.current_cycle_commission,
        completed_jobs_since_commission: provider.completed_jobs_since_commission || 0,
        last_commission_paid_at: provider.last_commission_paid_at,
        commission_reminder_active: provider.commission_reminder_active || false,
        has_approved_payment: provider.has_approved_payment || false,
        latest_approved_payment_date: provider.latest_approved_payment_date,
        profiles: profilesMap.get(provider.user_id) || {
          full_name: 'Unknown',
          email: 'Unknown',
          phone: ''
        }
      }));

      setProviders(transformedData || []);

      // Debug raw database values for Mussub
      const rawMussub = providersData?.find(p => p.business_name?.includes('Mussub'));
      if (rawMussub) {
        console.log('Raw Mussub database values:', {
          business_name: rawMussub.business_name,
          completed_jobs_since_commission: (rawMussub as any).completed_jobs_since_commission,
          total_jobs: (rawMussub as any).total_jobs,
          last_commission_paid_at: (rawMussub as any).last_commission_paid_at
        });
      }

      // Debug specific provider
      const specificProvider = transformedData.find(p => p.business_name?.includes('Mussub'));
      if (specificProvider) {
        console.log('Specific Mussub provider debug:', {
          business_name: specificProvider.business_name,
          completed_jobs_since_commission: specificProvider.completed_jobs_since_commission,
          total_jobs: specificProvider.total_jobs,
          has_approved_payment: specificProvider.has_approved_payment,
          latest_approved_payment_date: specificProvider.latest_approved_payment_date,
          last_commission_paid_at: specificProvider.last_commission_paid_at
        });
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const loadProviderDetail = async (providerId: string) => {
    try {
      // Fetch provider details
      const { data: providerData, error: providerError } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('user_id', providerId)
        .single();

      if (providerError) {
        console.error('Error fetching provider data:', providerError);
        toast.error('Failed to load provider information');
        return;
      }

      // Fetch profile data separately
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('user_id', providerId)
        .single();

      if (profileError) {
        console.error('Error fetching profile data:', profileError);
        // Continue with empty profile data
      }

      // Fetch commission history directly from commission_payments table
      const { data: commissionData, error: commissionError } = await supabase
        .from('commission_payments')
        .select('*')
        .eq('provider_id', providerId)
        .order('submitted_at', { ascending: false });

      if (commissionError) {
        console.error('Error fetching commission history:', commissionError);
        // Don't throw error here, just show empty commission history
        toast.error('Failed to load commission history, but provider details loaded');
      }

      const providerDetail: ProviderDetail = {
        id: providerData.id,
        user_id: providerData.user_id,
        business_name: providerData.business_name,
        business_type: providerData.business_type,
        business_address: providerData.business_address,
        rating: providerData.rating,
        total_jobs: providerData.total_jobs,
        total_earnings: providerData.total_earnings,
        total_commission: (providerData as any).total_commission,
        current_cycle_commission: (providerData as any).current_cycle_commission,
        completed_jobs_since_commission: (providerData as any).completed_jobs_since_commission || 0,
        last_commission_paid_at: (providerData as any).last_commission_paid_at,
        commission_reminder_active: (providerData as any).commission_reminder_active || false,
        has_approved_payment: commissionData?.some((payment: any) => payment.status === 'approved') || false,
        latest_approved_payment_date: commissionData?.find((payment: any) => payment.status === 'approved')?.reviewed_at || commissionData?.find((payment: any) => payment.status === 'approved')?.submitted_at || null,
        profiles: profileData ? {
          full_name: profileData.full_name || '',
          email: profileData.email || '',
          phone: profileData.phone || ''
        } : undefined,
        commission_history: commissionData || []
      };

      setSelectedProvider(providerDetail);
      setShowProviderDetail(true);
    } catch (error) {
      console.error('Error fetching provider details:', error);
      toast.error('Failed to load provider details');
    }
  };

  const getPaymentStatus = (provider: Provider) => {
    console.log('Provider status calculation:', {
      business_name: provider.business_name,
      completed_jobs_since_commission: provider.completed_jobs_since_commission,
      total_jobs: provider.total_jobs,
      has_approved_payment: provider.has_approved_payment,
      latest_approved_payment_date: provider.latest_approved_payment_date,
      last_commission_paid_at: provider.last_commission_paid_at
    });

    // Simple logic: if they have 5+ total jobs and no approved payment, they're due
    if (provider.total_jobs >= 5 && !provider.has_approved_payment) {
      return 'Due';
    }

    // If they have an approved payment, they're paid
    if (provider.has_approved_payment) {
      return 'Paid';
    }

    // Otherwise, they're paid (either < 5 jobs or have recent payment)
    return 'Paid';
  };

  const filteredProviders = providers.filter(provider => {
    if (filter === 'all') return true;
    if (filter === 'due') return getPaymentStatus(provider) === 'Due';
    if (filter === 'paid') return getPaymentStatus(provider) === 'Paid';
    return true;
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="bg-gradient-to-r from-slate-800 via-slate-750 to-slate-800 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              Provider Commission Overview
            </CardTitle>
            <p className="text-sm text-gray-400 mt-2">Comprehensive commission tracking and provider performance analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadProviders()}
              disabled={loading}
              className="border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Enhanced Filter Controls */}
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            {/* Provider Status Filters */}
            <div className="flex gap-2 bg-slate-700/50 p-1 rounded-lg">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-transparent text-gray-300 hover:bg-slate-600'}
              >
                All Providers ({providers.length})
              </Button>
              <Button
                variant={filter === 'due' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('due')}
                className={filter === 'due' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-transparent text-gray-300 hover:bg-slate-600'}
              >
                <Clock className="h-4 w-4 mr-1" />
                Payment Due ({providers.filter(p => getPaymentStatus(p) === 'Due').length})
              </Button>
              <Button
                variant={filter === 'paid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('paid')}
                className={filter === 'paid' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-transparent text-gray-300 hover:bg-slate-600'}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Paid ({providers.filter(p => getPaymentStatus(p) === 'Paid').length})
              </Button>
            </div>

            {/* Time Period Filters */}
            <div className="flex gap-2 bg-slate-700/50 p-1 rounded-lg">
              <Button
                variant={timeFilter === '7days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeFilter('7days')}
                className={timeFilter === '7days' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-transparent text-gray-300 hover:bg-slate-600'}
              >
                Last 7 Days
              </Button>
              <Button
                variant={timeFilter === '30days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeFilter('30days')}
                className={timeFilter === '30days' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-transparent text-gray-300 hover:bg-slate-600'}
              >
                Last 30 Days
              </Button>
              <Button
                variant={timeFilter === 'total' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeFilter('total')}
                className={timeFilter === 'total' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-transparent text-gray-300 hover:bg-slate-600'}
              >
                All Time
              </Button>
            </div>
          </div>

          {/* Active Filter Summary */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-gray-400">Filter:</span>
              <Badge variant="outline" className="border-blue-500 text-blue-400">
                {filter === 'all' ? 'All Providers' : filter === 'due' ? 'Payment Due' : 'Paid Providers'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span className="text-gray-400">Period:</span>
              <Badge variant="outline" className="border-purple-500 text-purple-400">
                {timeFilter === '7days' ? 'Last 7 Days' : timeFilter === '30days' ? 'Last 30 Days' : 'All Time'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-gray-400">Showing:</span>
              <span className="text-white font-semibold">{filteredProviders.length} providers</span>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Enhanced Top Earning Providers Section */}
      <div className="p-6 border-b border-slate-700 bg-gradient-to-b from-slate-800/30 to-transparent">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-white" />
              </div>
              Top Earning Providers
            </h3>
            <p className="text-sm text-gray-400 mt-1">Real-time commission data from completed bookings (5% of earnings)</p>
          </div>
          <div className="flex gap-2 bg-slate-700/50 p-1 rounded-lg">
            <Button
              variant={topProvidersTimeFilter === '7days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTopProvidersTimeFilter('7days')}
              className={topProvidersTimeFilter === '7days' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-transparent text-gray-300 hover:bg-slate-600'}
            >
              7 Days
            </Button>
            <Button
              variant={topProvidersTimeFilter === '30days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTopProvidersTimeFilter('30days')}
              className={topProvidersTimeFilter === '30days' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-transparent text-gray-300 hover:bg-slate-600'}
            >
              30 Days
            </Button>
            <Button
              variant={topProvidersTimeFilter === 'total' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTopProvidersTimeFilter('total')}
              className={topProvidersTimeFilter === 'total' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-transparent text-gray-300 hover:bg-slate-600'}
            >
              Total
            </Button>
          </div>
        </div>

        {topProviders.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-16 w-16 mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400">No providers found with completed bookings</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topProviders.map((provider, index) => {
              const earnings = topProvidersTimeFilter === '7days'
                ? provider.oneWeekEarnings
                : topProvidersTimeFilter === '30days'
                ? provider.oneMonthEarnings
                : provider.totalEarnings;

              const bookings = topProvidersTimeFilter === '7days'
                ? provider.oneWeekBookings
                : topProvidersTimeFilter === '30days'
                ? provider.oneMonthBookings
                : provider.totalBookings;

              return (
                <Card key={provider.providerId} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{provider.businessName}</h4>
                          <p className="text-xs text-gray-400">{provider.businessType}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-400">{formatCurrency(earnings)}</p>
                        <p className="text-xs text-gray-400">Commission: {formatCurrency(earnings * 0.05)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{bookings} total jobs</span>
                      <Badge variant="outline" className="border-green-500 text-green-400">
                        {topProvidersTimeFilter === '7days' ? 'Last 7 Days' :
                         topProvidersTimeFilter === '30days' ? 'Last 30 Days' : 'All Time'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="p-6 border-b border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {timeFilter === '7days' && (
            <Card className="bg-gradient-to-r from-green-600 to-green-700 border-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-100">Last 7 Days</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(timeBasedStats.oneWeek.earnings)}</p>
                    <p className="text-xs text-green-200">Commission: {formatCurrency(timeBasedStats.oneWeek.commission)}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
          )}

          {timeFilter === '30days' && (
            <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-100">Last 30 Days</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(timeBasedStats.oneMonth.earnings)}</p>
                    <p className="text-xs text-blue-200">Commission: {formatCurrency(timeBasedStats.oneMonth.commission)}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
          )}

          {timeFilter === 'total' && (
            <Card className="bg-gradient-to-r from-purple-600 to-purple-700 border-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-100">Total Earnings</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(timeBasedStats.total.earnings)}</p>
                    <p className="text-xs text-purple-200">Commission: {formatCurrency(timeBasedStats.total.commission)}</p>
                  </div>
                  <Receipt className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional summary cards for other time periods */}
          {timeFilter === 'total' && (
            <>
              <Card className="bg-gradient-to-r from-green-600 to-green-700 border-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-100">Last 7 Days</p>
                      <p className="text-xl font-bold text-white">{formatCurrency(timeBasedStats.oneWeek.earnings)}</p>
                      <p className="text-xs text-green-200">Commission: {formatCurrency(timeBasedStats.oneWeek.commission)}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-100">Last 30 Days</p>
                      <p className="text-xl font-bold text-white">{formatCurrency(timeBasedStats.oneMonth.earnings)}</p>
                      <p className="text-xs text-blue-200">Commission: {formatCurrency(timeBasedStats.oneMonth.commission)}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Comprehensive Commission Summary Section */}
      <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-750">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Commission System Summary</h3>
          <Badge variant="secondary" className="bg-blue-600 text-white">
            Real-time Data
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Total System Earnings */}
          <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 border-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-emerald-100 font-medium">Total System Earnings</p>
                  <p className="text-xs text-emerald-200">All Providers</p>
                </div>
                <DollarSign className="h-6 w-6 text-emerald-200" />
              </div>
              <p className="text-2xl font-bold text-white mb-2">
                {formatCurrency(timeBasedStats.total.earnings)}
              </p>
              <div className="space-y-1">
                <p className="text-xs text-emerald-200">
                  Total Commission: <span className="font-semibold text-white">{formatCurrency(timeBasedStats.total.commission)}</span>
                </p>
                <p className="text-xs text-emerald-300">
                  From {providers.reduce((sum, p) => sum + (p.total_jobs || 0), 0)} completed jobs
                </p>
              </div>
            </CardContent>
          </Card>

          {/* This Week Performance */}
          <Card className="bg-gradient-to-br from-amber-600 to-orange-600 border-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-amber-100 font-medium">This Week</p>
                  <p className="text-xs text-amber-200">Last 7 Days</p>
                </div>
                <Activity className="h-6 w-6 text-amber-200" />
              </div>
              <p className="text-2xl font-bold text-white mb-2">
                {formatCurrency(timeBasedStats.oneWeek.earnings)}
              </p>
              <div className="space-y-1">
                <p className="text-xs text-amber-200">
                  Commission: <span className="font-semibold text-white">{formatCurrency(timeBasedStats.oneWeek.commission)}</span>
                </p>
                <p className="text-xs text-amber-300">
                  {Math.round((timeBasedStats.oneWeek.earnings / Math.max(timeBasedStats.total.earnings, 1)) * 100)}% of total earnings
                </p>
              </div>
            </CardContent>
          </Card>

          {/* This Month Performance */}
          <Card className="bg-gradient-to-br from-cyan-600 to-blue-600 border-cyan-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-cyan-100 font-medium">This Month</p>
                  <p className="text-xs text-cyan-200">Last 30 Days</p>
                </div>
                <Calendar className="h-6 w-6 text-cyan-200" />
              </div>
              <p className="text-2xl font-bold text-white mb-2">
                {formatCurrency(timeBasedStats.oneMonth.earnings)}
              </p>
              <div className="space-y-1">
                <p className="text-xs text-cyan-200">
                  Commission: <span className="font-semibold text-white">{formatCurrency(timeBasedStats.oneMonth.commission)}</span>
                </p>
                <p className="text-xs text-cyan-300">
                  {Math.round((timeBasedStats.oneMonth.earnings / Math.max(timeBasedStats.total.earnings, 1)) * 100)}% of total earnings
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Commission Rate Info */}
          <Card className="bg-gradient-to-br from-violet-600 to-purple-600 border-violet-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-violet-100 font-medium">Commission Rate</p>
                  <p className="text-xs text-violet-200">System Standard</p>
                </div>
                <Target className="h-6 w-6 text-violet-200" />
              </div>
              <p className="text-2xl font-bold text-white mb-2">5%</p>
              <div className="space-y-1">
                <p className="text-xs text-violet-200">
                  Applied to all completed bookings
                </p>
                <p className="text-xs text-violet-300">
                  {providers.length} active providers
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Commission Progress Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-800/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Provider Commission Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-600 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-green-400 font-medium">Paid (Commission Up-to-date)</span>
                  </div>
                  <span className="text-white font-bold">
                    {providers.filter(p => getPaymentStatus(p) === 'Paid').length} providers
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-900/20 border border-red-600 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-red-400" />
                    <span className="text-red-400 font-medium">Due (Commission Required)</span>
                  </div>
                  <span className="text-white font-bold">
                    {providers.filter(p => getPaymentStatus(p) === 'Due').length} providers
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-900/20 border border-blue-600 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-400" />
                    <span className="text-blue-400 font-medium">Total Active Providers</span>
                  </div>
                  <span className="text-white font-bold">{providers.length} providers</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Commission Collection Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">Collection Progress</span>
                    <span className="text-sm text-white font-semibold">
                      {Math.round(((providers.filter(p => getPaymentStatus(p) === 'Paid').length) / Math.max(providers.length, 1)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-green-600 h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.round(((providers.filter(p => getPaymentStatus(p) === 'Paid').length) / Math.max(providers.length, 1)) * 100)}%`
                      }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-green-900/20 rounded-lg border border-green-600">
                    <p className="text-lg font-bold text-green-400">
                      {providers.filter(p => getPaymentStatus(p) === 'Paid').length}
                    </p>
                    <p className="text-xs text-green-300">Paid Providers</p>
                  </div>
                  <div className="p-3 bg-red-900/20 rounded-lg border border-red-600">
                    <p className="text-lg font-bold text-red-400">
                      {providers.filter(p => getPaymentStatus(p) === 'Due').length}
                    </p>
                    <p className="text-xs text-red-300">Due Providers</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-16 w-16 mx-auto text-gray-500 mb-4" />
            <h3 className="font-semibold text-lg mb-2 text-white">No providers found</h3>
            <p className="text-gray-400">
              {filter === 'due'
                ? 'No providers have completed 5 or more jobs since their last commission payment'
                : filter === 'paid'
                ? 'All providers have completed fewer than 5 jobs since their last payment'
                : 'There are no providers in the system'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-750">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300">Provider Details</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-gray-300">7 Days Performance</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-gray-300">30 Days Performance</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-gray-300">Total Performance</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-gray-300">Commission Status</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProviders.map((provider, index) => (
                  <tr key={provider.user_id} className={`border-b border-slate-700 hover:bg-slate-700/50 transition-colors ${index % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-750/50'}`}>
                    <td className="py-4 px-6">
                      <div className="space-y-2">
                        <div>
                          <p className="font-bold text-lg text-white">{provider.business_name || 'Unknown'}</p>
                          <p className="text-sm text-gray-400">{provider.profiles?.full_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-blue-500 text-blue-400 text-xs">
                            {provider.business_type}
                          </Badge>
                          {provider.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs text-yellow-400">{provider.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="space-y-2">
                        <div className="bg-green-900/20 border border-green-600 rounded-lg p-3">
                          <p className="font-bold text-xl text-green-400">{formatCurrency((provider as any).one_week_earnings || 0)}</p>
                          <p className="text-xs text-green-300">Earnings</p>
                          <div className="mt-1 pt-1 border-t border-green-600/30">
                            <p className="text-xs text-green-300">Commission</p>
                            <p className="font-semibold text-green-400">{formatCurrency((provider as any).one_week_commission || 0)}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="space-y-2">
                        <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
                          <p className="font-bold text-xl text-blue-400">{formatCurrency((provider as any).one_month_earnings || 0)}</p>
                          <p className="text-xs text-blue-300">Earnings</p>
                          <div className="mt-1 pt-1 border-t border-blue-600/30">
                            <p className="text-xs text-blue-300">Commission</p>
                            <p className="font-semibold text-blue-400">{formatCurrency((provider as any).one_month_commission || 0)}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="space-y-2">
                        <div className="bg-purple-900/20 border border-purple-600 rounded-lg p-3">
                          <p className="font-bold text-xl text-white">{formatCurrency(provider.total_earnings || 0)}</p>
                          <p className="text-xs text-purple-300">Total Earnings</p>
                          <div className="mt-1 pt-1 border-t border-purple-600/30">
                            <p className="text-xs text-purple-300">Total Commission</p>
                            <p className="font-semibold text-white">{formatCurrency(provider.total_commission || 0)}</p>
                          </div>
                          <div className="mt-1 pt-1 border-t border-purple-600/30">
                            <p className="text-xs text-purple-300">Jobs Completed</p>
                            <p className="font-semibold text-white">{provider.total_jobs || 0}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="space-y-2">
                        <Badge variant={
                          getPaymentStatus(provider) === 'Due' ? 'destructive' : 'default'
                        } className={`px-3 py-1 text-sm ${
                          getPaymentStatus(provider) === 'Due'
                            ? 'bg-red-600 text-white'
                            : 'bg-green-600 text-white'
                        }`}>
                          {getPaymentStatus(provider)}
                        </Badge>
                        <div className="text-xs text-gray-400">
                          <p>Jobs since payment:</p>
                          <p className="font-semibold text-white">{provider.completed_jobs_since_commission || 0}/5</p>
                        </div>
                        {provider.has_approved_payment && (
                          <div className="text-xs text-green-400">
                            <p>Last paid:</p>
                            <p className="font-semibold">{formatDate(provider.latest_approved_payment_date)}</p>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadProviderDetail(provider.user_id)}
                        className="border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Provider Detail Dialog */}
        <Dialog open={showProviderDetail} onOpenChange={setShowProviderDetail}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
            <DialogHeader className="border-b border-slate-700 pb-4">
              <DialogTitle className="text-xl text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Provider Commission Details - {selectedProvider?.business_name}
              </DialogTitle>
            </DialogHeader>
            {selectedProvider && (
              <div className="space-y-6 pt-4">
                {/* Provider Info */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h3 className="font-semibold text-lg text-white mb-3">Provider Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">Business Name</p>
                          <p className="font-medium text-white">{selectedProvider.business_name}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Provider Name</p>
                          <p className="font-medium text-white">{selectedProvider.profiles?.full_name}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Email</p>
                          <p className="font-medium text-white">{selectedProvider.profiles?.email}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Phone</p>
                          <p className="font-medium text-white">{selectedProvider.profiles?.phone || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Business Type</p>
                          <p className="font-medium text-white">{selectedProvider.business_type}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Address</p>
                          <p className="font-medium text-white">{selectedProvider.business_address}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h3 className="font-semibold text-lg text-white mb-3">Commission Stats</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-slate-600/50 rounded-lg">
                          <span className="font-medium text-gray-300">Jobs Since Payment</span>
                          <Badge variant={selectedProvider.completed_jobs_since_commission >= 5 ? 'destructive' : 'default'}
                                 className={selectedProvider.completed_jobs_since_commission >= 5 ? 'bg-red-600' : 'bg-green-600'}>
                            {selectedProvider.completed_jobs_since_commission}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-600/50 rounded-lg">
                          <span className="font-medium text-gray-300">Total Jobs</span>
                          <span className="font-medium text-white">{selectedProvider.total_jobs || 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-600/50 rounded-lg">
                          <span className="font-medium text-gray-300">7 Days Earnings</span>
                          <span className="font-medium text-green-400">{formatCurrency((selectedProvider as any).one_week_earnings || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-600/50 rounded-lg">
                          <span className="font-medium text-gray-300">7 Days Commission</span>
                          <span className="font-medium text-green-400">{formatCurrency((selectedProvider as any).one_week_commission || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-600/50 rounded-lg">
                          <span className="font-medium text-gray-300">30 Days Earnings</span>
                          <span className="font-medium text-blue-400">{formatCurrency((selectedProvider as any).one_month_earnings || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-600/50 rounded-lg">
                          <span className="font-medium text-gray-300">30 Days Commission</span>
                          <span className="font-medium text-blue-400">{formatCurrency((selectedProvider as any).one_month_commission || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-600/50 rounded-lg">
                          <span className="font-medium text-gray-300">Total Earnings</span>
                          <span className="font-medium text-white">{formatCurrency(selectedProvider.total_earnings || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-600/50 rounded-lg">
                          <span className="font-medium text-gray-300">Total Commission (5%)</span>
                          <span className="font-medium text-white">{formatCurrency((selectedProvider as any).total_commission || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-600/50 rounded-lg">
                          <span className="font-medium text-gray-300">Current Cycle Commission</span>
                          <span className="font-medium text-white">{formatCurrency((selectedProvider as any).current_cycle_commission || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-600/50 rounded-lg">
                          <span className="font-medium text-gray-300">Last Commission Paid</span>
                          <span className="font-medium text-white">{formatDate(selectedProvider.last_commission_paid_at)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-600/50 rounded-lg">
                          <span className="font-medium text-gray-300">Rating</span>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium text-white">{selectedProvider.rating?.toFixed(1) || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Commission History */}
                <div className="space-y-4">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h3 className="font-semibold text-lg text-white mb-3">Commission Payment History</h3>
                    {selectedProvider.commission_history.length === 0 ? (
                      <div className="text-center py-8">
                        <Receipt className="h-16 w-16 mx-auto text-gray-500 mb-4" />
                        <p className="text-gray-400">No commission payments recorded yet</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-600">
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Date</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Amount</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Jobs</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Method</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedProvider.commission_history.map((payment, index) => (
                              <tr key={payment.id} className={`border-b border-slate-600 hover:bg-slate-600/30 ${index % 2 === 0 ? 'bg-slate-700/20' : ''}`}>
                                <td className="py-3 px-4">
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-2 text-blue-400" />
                                    <span className="text-sm text-gray-300">{formatDate(payment.submitted_at)}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-semibold text-white">{formatCurrency(payment.amount)}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-gray-300">{payment.booking_count}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-gray-300">{payment.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <Badge variant={
                                    payment.status === 'pending' ? 'outline' :
                                    payment.status === 'approved' ? 'default' : 'destructive'
                                  } className={
                                    payment.status === 'pending' ? 'border-yellow-600 text-yellow-400' :
                                    payment.status === 'approved' ? 'bg-green-600 text-white' :
                                    'bg-red-600 text-white'
                                  }>
                                    {payment.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ProviderCommissionOverview;