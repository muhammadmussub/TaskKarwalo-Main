
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
   Users,
   Star,
   MapPin,
   Clock,
   CheckCircle,
   XCircle,
   Calendar,
   ArrowLeft,
   UserCheck,
   FileText,
   LogOut,
   Shield,
   IdCard,
   UserX,
   User,
   Home,
   CreditCard,
   Receipt,
   Activity,
   Target
 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import UserManagementPanel from "@/components/UserManagementPanel";
import ServiceApprovalManagement from "@/components/admin/ServiceApprovalManagement";
import AdminMetricsDashboard from "@/components/AdminMetricsDashboard";
import CommissionManagement from "@/components/admin/CommissionManagement";
import ProviderVerificationReview from "@/components/admin/ProviderVerificationReview";
import PaymentMethodsAdmin from "@/components/admin/PaymentMethodsAdmin";
import ProviderCommissionOverview from "@/components/admin/ProviderCommissionOverview";
import ProviderOverviewSearch from "@/components/admin/ProviderOverviewSearch";
import NormalVerificationManagement from "@/components/admin/NormalVerificationManagement";
import ProBadgeManagement from "@/components/admin/ProBadgeManagement";
import CancellationAnalytics from "@/components/admin/CancellationAnalytics";
import ContentManagement from "@/components/admin/ContentManagement";
import UserReliabilityMonitor from "@/components/admin/UserReliabilityMonitor";

interface PendingProvider {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  business_address: string;
  phone?: string;
  cnic?: string;
  description?: string;
  shop_photos?: string[];
  business_certificate?: string;
  application_status?: string;
  submitted_at?: string;
  verified: boolean;
  admin_approved: boolean;
  verified_pro?: boolean;
  rating?: number;
  total_jobs?: number;
  total_earnings?: number;
  rejection_reason?: string;
  updated_at?: string;
  // Verification documents
  cnic_front_image?: string;
  cnic_back_image?: string;
  license_certificate?: string;
  profile_photo?: string;
  proof_of_address?: string;
  profiles?: {
    full_name: string;
    email: string;
    phone?: string;
  };
}

interface PendingService {
  id: string;
  title: string;
  description: string;
  category: string;
  base_price: number;
  provider_id: string;
  admin_approved: boolean;
  provider_profiles?: {
    business_name: string;
  };
}

interface SystemStats {
  totalUsers: number;
  totalProviders: number;
  totalBookings: number;
  totalRevenue: number;
  pendingBookings: number;
  confirmedBookings: number;
  inProgressBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalClearedCommission: number;
  pendingCommissionProviders: number;
  totalCommissionDue: number;
}

const AdminDashboard = () => {
  console.log('AdminDashboard rendered');
  const { user, isAuthenticated, logout } = useAuth();
  console.log('Auth context:', { user, isAuthenticated });
  const navigate = useNavigate();
  const [pendingProviders, setPendingProviders] = useState<PendingProvider[]>([]);
  const [rejectedProviders, setRejectedProviders] = useState<PendingProvider[]>([]);
  const [pendingServices, setPendingServices] = useState<PendingService[]>([]);
  const [approvedProviders, setApprovedProviders] = useState<PendingProvider[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    totalProviders: 0,
    totalBookings: 0,
    totalRevenue: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    inProgressBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalClearedCommission: 0,
    pendingCommissionProviders: 0,
    totalCommissionDue: 0
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    console.log('AdminDashboard useEffect called:', { isAuthenticated, user });
    if (isAuthenticated && user?.user_type === "admin") {
      console.log('AdminDashboard: User is authenticated as admin, loading data...');
      loadAdminData();
      loadSystemStats(); // Load initial data
    } else {
      console.log('AdminDashboard: User is not authenticated as admin:', { isAuthenticated, userType: user?.user_type });
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    console.log('AdminDashboard: Setting up realtime subscription');
    if (!user) {
      console.log('AdminDashboard: No user, returning early');
      return;
    }

    // Set up realtime subscription for admin data
    const channel = supabase
      .channel('admin-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_profiles'
        },
        (payload) => {
          console.log('Provider profile updated:', payload);
          loadAdminData();
          loadSystemStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'services'
        },
        (payload) => {
          console.log('Service updated:', payload);
          loadAdminData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('AdminDashboard: Booking updated:', payload);
          const newBooking = payload.new as any;
          const oldBooking = payload.old as any;

          // Always refresh stats when bookings change
          console.log('AdminDashboard: Refreshing system stats due to booking change');
          loadSystemStats();

          // Also refresh the AdminMetricsDashboard if it's loaded
          if ((window as any).refreshAdminMetrics) {
            (window as any).refreshAdminMetrics();
          }

          // Show toast notification for status changes
          if (newBooking && oldBooking && newBooking.status !== oldBooking.status) {
            console.log(`AdminDashboard: Booking status changed from ${oldBooking.status} to ${newBooking.status}`);
            if (newBooking.status === 'completed') {
              toast.success('Service completed - admin stats updated!');
            } else if (newBooking.status === 'in_progress') {
              toast.info('Service started - admin stats updated!');
            } else if (newBooking.status === 'confirmed') {
              toast.info('Service accepted - admin stats updated!');
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('Profile updated:', payload);
          loadSystemStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commission_payments'
        },
        (payload) => {
          console.log('Commission payments updated:', payload);
          loadSystemStats();
        }
      )
      .subscribe();

    // Auto refresh stats every 2 minutes
    const interval = setInterval(() => {
      console.log('AdminDashboard: Auto refreshing stats');
      loadSystemStats();
    }, 120000);

    return () => {
      console.log('AdminDashboard: Cleaning up subscription and interval');
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user]);

  const loadSystemStats = async () => {
    console.log('loadSystemStats called');
    try {
      setStatsLoading(true);
      console.log('Loading system stats...');
      
      const [userCountResult, providerCountResult, bookingCountResult, revenueDataResult, pendingBookingsResult, confirmedBookingsResult, inProgressBookingsResult, completedBookingsResult, cancelledBookingsResult, clearedCommissionResult, pendingCommissionProvidersResult] = await Promise.all([
        // Get total users count
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }),

        // Get total providers count - modified query - return ALL providers regardless of status
        supabase
          .from('provider_profiles')
          .select('*', { count: 'exact', head: true }),

        // Get total bookings count
        supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true }),

        // Get revenue data
        supabase
          .from('bookings')
          .select('final_price')
          .not('final_price', 'is', null)
          .eq('status', 'completed'), // Only count completed bookings for revenue

        // Get pending bookings count
        supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),

        // Get confirmed bookings count
        supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'confirmed'),

        // Get in-progress bookings count
        supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'in_progress'),

        // Get completed bookings count
        supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed'),

        // Get cancelled bookings count
        supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'cancelled'),

        // Get total cleared commission from approved commission payments
        supabase
          .from('commission_payments')
          .select('amount')
          .eq('status', 'approved'),

        // Get providers with pending commission payments (approved providers with 5+ completed jobs)
        supabase
          .from('provider_profiles')
          .select(`
            id,
            user_id,
            total_jobs,
            bookings(
              status
            )
          `)
          .eq('admin_approved', true)
      ]);

      console.log('System stats results:', { 
        userCountResult: !!userCountResult, 
        providerCountResult: !!providerCountResult, 
        bookingCountResult: !!bookingCountResult, 
        revenueDataResult: !!revenueDataResult 
      });

      // Check for errors in any of the queries - but don't return early, just log them
      if (userCountResult.error) {
        console.error('Error fetching user count:', userCountResult.error);
        // Don't show toast for RLS or permission errors, just log them
        if (!userCountResult.error.message.includes('RLS') && !userCountResult.error.message.includes('permission')) {
          toast.error(`Failed to fetch user count: ${userCountResult.error.message}`);
        }
      }
      if (providerCountResult.error) {
        console.error('Error fetching provider count:', providerCountResult.error);
        // Don't show toast for RLS or permission errors, just log them
        if (!providerCountResult.error.message.includes('RLS') && !providerCountResult.error.message.includes('permission')) {
          toast.error(`Failed to fetch provider count: ${providerCountResult.error.message}`);
        }
      }
      if (bookingCountResult.error) {
        console.error('Error fetching booking count:', bookingCountResult.error);
        // Don't show toast for RLS or permission errors, just log them
        if (!bookingCountResult.error.message.includes('RLS') && !bookingCountResult.error.message.includes('permission')) {
          toast.error(`Failed to fetch booking count: ${bookingCountResult.error.message}`);
        }
      }
      if (revenueDataResult.error) {
        console.error('Error fetching revenue data:', revenueDataResult.error);
        // Don't show toast for RLS or permission errors, just log them
        if (!revenueDataResult.error.message.includes('RLS') && !revenueDataResult.error.message.includes('permission')) {
          toast.error(`Failed to fetch revenue data: ${revenueDataResult.error.message}`);
        }
      }
      
      // Calculate total revenue
      const totalRevenue = revenueDataResult.data?.reduce(
        (sum, booking) => sum + (booking.final_price || 0),
        0
      ) || 0;

      // Calculate total cleared commission (sum of approved payment amounts)
      const totalClearedCommission = clearedCommissionResult.data?.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0
      ) || 0;

      // Calculate total commission due from all providers
      let totalCommissionDue = 0;
      // This will be calculated properly below using actual earnings data

      // Get actual earnings data for proper commission calculation
      const providerEarningsResult = await supabase
        .from('bookings')
        .select(`
          provider_id,
          final_price,
          proposed_price,
          status,
          completed_at
        `)
        .eq('status', 'completed')
        .not('final_price', 'is', null);

      // Get approved commission payments to calculate cleared amounts properly
      const approvedCommissionResult = await supabase
        .from('commission_payments')
        .select(`
          provider_id,
          amount,
          status,
          submitted_at,
          booking_count
        `)
        .eq('status', 'approved');

      // Calculate commission due and cleared from actual earnings
      let calculatedCommissionDue = 0;
      let calculatedCommissionCleared = 0;

      if (providerEarningsResult.data) {
        const providerBookingsMap = new Map();

        // Group bookings by provider
        providerEarningsResult.data.forEach(booking => {
          const providerId = booking.provider_id;
          if (!providerBookingsMap.has(providerId)) {
            providerBookingsMap.set(providerId, []);
          }
          providerBookingsMap.get(providerId).push(booking);
        });

        // Get approved commission payments to track which providers have paid
        const approvedProviders = new Set();
        if (approvedCommissionResult.data) {
          approvedCommissionResult.data.forEach(payment => {
            approvedProviders.add(payment.provider_id);
          });
        }

        // Calculate commission for each provider
        providerBookingsMap.forEach((bookings, providerId) => {
          const totalEarnings = bookings.reduce((sum, booking) => {
            return sum + (booking.final_price || booking.proposed_price || 0);
          }, 0);

          const expectedCommission = totalEarnings * 0.05;

          // If provider has approved commission payments, their commission is cleared
          if (approvedProviders.has(providerId)) {
            calculatedCommissionCleared += expectedCommission;
          } else {
            // If provider has no approved commission payments, their commission is due
            calculatedCommissionDue += expectedCommission;
          }
        });
      }

      // Calculate pending commission providers (providers with 5+ jobs who haven't paid commission)
      let pendingCommissionProviders = 0;
      if (pendingCommissionProvidersResult.error) {
        console.error('Error fetching pending commission providers:', pendingCommissionProvidersResult.error);
      } else if (pendingCommissionProvidersResult.data) {
        console.log('Pending commission providers raw data:', pendingCommissionProvidersResult.data);

        // Get approved commission payments to track which providers have paid
        const approvedProviders = new Set();
        if (approvedCommissionResult.data) {
          approvedCommissionResult.data.forEach(payment => {
            approvedProviders.add(payment.provider_id);
          });
        }

        // Count providers who have 5+ completed jobs but haven't paid commission
        pendingCommissionProvidersResult.data.forEach(provider => {
          const completedJobs = provider.bookings?.filter(booking => booking.status === 'completed').length || 0;
          if (completedJobs >= 5 && !approvedProviders.has(provider.user_id)) {
            pendingCommissionProviders++;
          }
        });
      } else {
        console.log('No pending commission providers data returned');
      }
      console.log('Calculated pending commission providers:', pendingCommissionProviders);

      setSystemStats({
        totalUsers: userCountResult.count || 0,
        totalProviders: providerCountResult.count || 0,
        totalBookings: bookingCountResult.count || 0,
        totalRevenue,
        pendingBookings: pendingBookingsResult.count || 0,
        confirmedBookings: confirmedBookingsResult.count || 0,
        inProgressBookings: inProgressBookingsResult.count || 0,
        completedBookings: completedBookingsResult.count || 0,
        cancelledBookings: cancelledBookingsResult.count || 0,
        totalClearedCommission: calculatedCommissionCleared, // Use calculated amount, not submitted amount
        pendingCommissionProviders,
        totalCommissionDue: calculatedCommissionDue
      });
    } catch (error: any) {
      console.error('Error loading system stats:', error);
      toast.error(`Failed to load system stats: ${error.message}`);
    } finally {
      console.log('loadSystemStats: Setting statsLoading to false');
      setStatsLoading(false);
    }
  };

  const loadAdminData = async () => {
    console.log('loadAdminData called');
    try {
      setLoading(true);
      console.log('loadAdminData: Setting loading to true');
      
      // Fetch provider profiles and services separately - simplified to avoid join issues
      const [providersResponse, servicesResponse, approvedProvidersResponse] = await Promise.all([
        // Fetch ALL provider profiles without any filters for the provider overview section
        supabase
          .from('provider_profiles')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('services')
          .select(`
            id,
            title,
            description,
            category,
            base_price,
            provider_id,
            admin_approved
          `)
          .eq('admin_approved', false)
          .order('created_at', { ascending: false }),

        supabase
          .from('provider_profiles')
          .select('*')
          .eq('admin_approved', true)
          .order('created_at', { ascending: false })
      ]);

      console.log('Supabase responses:', {
        providersResponse: !!providersResponse,
        servicesResponse: !!servicesResponse,
        approvedProvidersResponse: !!approvedProvidersResponse
      });

      // Check for errors in any of the queries
      if (providersResponse.error) {
        console.error('Error fetching providers:', providersResponse.error);
        // Don't show toast for RLS or permission errors, just log them
        if (!providersResponse.error.message.includes('RLS') && !providersResponse.error.message.includes('permission')) {
          toast.error(`Failed to fetch providers: ${providersResponse.error.message}`);
        }
        return;
      }
      if (servicesResponse.error) {
        console.error('Error fetching services:', servicesResponse.error);
        // Don't show toast for RLS or permission errors, just log them
        if (!servicesResponse.error.message.includes('RLS') && !servicesResponse.error.message.includes('permission')) {
          toast.error(`Failed to fetch services: ${servicesResponse.error.message}`);
        }
        return;
      }
      if (approvedProvidersResponse.error) {
        console.error('Error fetching approved providers:', approvedProvidersResponse.error);
        // Don't show toast for RLS or permission errors, just log them
        if (!approvedProvidersResponse.error.message.includes('RLS') && !approvedProvidersResponse.error.message.includes('permission')) {
          toast.error(`Failed to fetch approved providers: ${approvedProvidersResponse.error.message}`);
        }
        return;
      }

      // Get user IDs for profiles lookup
      const providerUserIds = (providersResponse.data || []).map(p => p.user_id);
      const serviceProviderIds = (servicesResponse.data || []).map(s => s.provider_id);
      const approvedProviderUserIds = (approvedProvidersResponse.data || []).map(p => p.user_id);
      const allUserIds = [...new Set([...providerUserIds, ...serviceProviderIds, ...approvedProviderUserIds])];

      console.log('User IDs for lookup:', { providerUserIds, serviceProviderIds, approvedProviderUserIds, allUserIds });

      // Fetch user profiles
      let profilesData = [];
      let profilesError = null;

      if (allUserIds.length > 0) {
        const profilesResponse = await supabase
          .from('profiles')
          .select('user_id, full_name, email, phone')
          .in('user_id', allUserIds);

        profilesData = profilesResponse.data || [];
        profilesError = profilesResponse.error;

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          // Don't show toast for RLS or permission errors, just log them
          if (!profilesError.message.includes('RLS') && !profilesError.message.includes('permission')) {
            toast.error(`Failed to fetch user profiles: ${profilesError.message}`);
          }
          // Continue with what we have rather than throwing
        }
      }

      // Create maps for easy lookup
      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Combine data for all providers
      const allProvidersWithProfiles = (providersResponse.data || [])
        .map(provider => ({
          ...provider,
          profiles: profilesMap[provider.user_id] || null
        }));

      // Debug: Log the loaded provider data
      console.log('AdminDashboard - Loaded provider data:', allProvidersWithProfiles.map(p => ({
        id: p.id,
        business_name: p.business_name,
        shop_photos: p.shop_photos,
        cnic_front_image: p.cnic_front_image,
        cnic_back_image: p.cnic_back_image,
        license_certificate: p.license_certificate,
        profile_photo: p.profile_photo,
        proof_of_address: p.proof_of_address,
        business_certificate: p.business_certificate,
        application_status: p.application_status
      })));

      // Combine data for approved providers
      const approvedProvidersWithProfiles = (approvedProvidersResponse.data || [])
        .map(provider => ({
          ...provider,
          profiles: profilesMap[provider.user_id] || null
        }));

      // Note: rejectedProvidersFiltered is already created above from the main providers list

      // Filter pending providers: those that are not approved AND don't have rejection reasons
      // Also include resubmitted applications (they have application_status = 'resubmitted')
      // BUT exclude providers who are already approved
      const pendingProvidersFiltered = allProvidersWithProfiles.filter(provider => {
        // Skip if provider is already approved
        if (provider.admin_approved) {
          return false;
        }

        const isPending = !provider.admin_approved && !provider.rejection_reason;
        const isResubmitted = provider.application_status === 'resubmitted';

        if (isPending || isResubmitted) {
          console.log('Found pending/resubmitted provider:', {
            id: provider.id,
            business_name: provider.business_name,
            admin_approved: provider.admin_approved,
            rejection_reason: provider.rejection_reason,
            application_status: provider.application_status,
            submitted_at: provider.submitted_at,
            documents_uploaded: provider.documents_uploaded
          });
        }
        return isPending || isResubmitted;
      });

      // Filter rejected providers: those that have rejection reasons
      // Make sure rejected providers are NOT included in pending list
      const rejectedProvidersFiltered = allProvidersWithProfiles.filter(provider => {
        const hasRejectionReason = provider.rejection_reason && provider.rejection_reason.trim() !== '';
        const isRejected = !provider.admin_approved && hasRejectionReason;

        if (isRejected) {
          console.log('Found rejected provider:', {
            id: provider.id,
            business_name: provider.business_name,
            admin_approved: provider.admin_approved,
            rejection_reason: provider.rejection_reason,
            application_status: provider.application_status,
            submitted_at: provider.submitted_at
          });
        }
        return isRejected;
      });

      // For services, we need to get the provider business names
      let serviceProviderProfilesData = [];
      let serviceProviderProfilesError = null;
      
      if (serviceProviderIds.length > 0) {
        const serviceProviderProfilesResponse = await supabase
          .from('provider_profiles')
          .select('user_id, business_name')
          .in('user_id', serviceProviderIds);
        
        serviceProviderProfilesData = serviceProviderProfilesResponse.data || [];
        serviceProviderProfilesError = serviceProviderProfilesResponse.error;
        
        if (serviceProviderProfilesError) {
          console.error('Error fetching service provider profiles:', serviceProviderProfilesError);
          // Don't show toast for RLS or permission errors, just log them
          if (!serviceProviderProfilesError.message.includes('RLS') && !serviceProviderProfilesError.message.includes('permission')) {
            toast.error(`Failed to fetch service provider profiles: ${serviceProviderProfilesError.message}`);
          }
          // Continue with what we have rather than throwing
        }
      }

      const serviceProviderProfilesMap = (serviceProviderProfilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      const servicesWithProfiles = (servicesResponse.data || [])
        .map(service => ({
          ...service,
          provider_profiles: serviceProviderProfilesMap[service.provider_id] || null
        }));

      console.log('Setting state:', {
        allProvidersWithProfiles,
        pendingProvidersFiltered,
        servicesWithProfiles,
        approvedProvidersWithProfiles,
        rejectedProvidersFiltered
      });

      setPendingProviders(pendingProvidersFiltered as PendingProvider[]);
      setRejectedProviders(rejectedProvidersFiltered as PendingProvider[]);
      setPendingServices(servicesWithProfiles as PendingService[]);
      setApprovedProviders(approvedProvidersWithProfiles as PendingProvider[]);

    } catch (error: any) {
      console.error('Error loading admin data:', error);
      toast.error(`Failed to load admin data: ${error.message}`);
    } finally {
      console.log('loadAdminData: Setting loading to false');
      setLoading(false);
    }
  };

  const approveProvider = async (providerId: string) => {
    try {
      const { error } = await supabase
        .from('provider_profiles')
        .update({ admin_approved: true, verified: true })
        .eq('id', providerId);

      if (error) throw error;

      toast.success("Provider approved successfully");
      loadAdminData(); // Reload data
    } catch (error: any) {
      toast.error("Failed to approve provider: " + error.message);
    }
  };

  const approveService = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ admin_approved: true, is_active: true })
        .eq('id', serviceId);

      if (error) throw error;

      toast.success("Service approved successfully");
      loadAdminData(); // Reload data
    } catch (error: any) {
      toast.error("Failed to approve service: " + error.message);
    }
  };

  const toggleVerifiedBadge = async (providerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('provider_profiles')
        .update({ verified_pro: !currentStatus })
        .eq('id', providerId);

      if (error) throw error;

      toast.success(!currentStatus ? "Verified Pro badge granted!" : "Verified Pro badge removed!");
      loadAdminData();
    } catch (error: any) {
      toast.error("Failed to update verified status: " + error.message);
    }
  };

  const rejectProvider = async (providerId: string, rejectionReason: string) => {
    try {
      const { error } = await supabase
        .from('provider_profiles')
        .update({
          admin_approved: false,
          verified: false,
          rejection_reason: rejectionReason
        })
        .eq('id', providerId);

      if (error) throw error;

      toast.success("Provider rejected and notified");
      loadAdminData(); // Reload data
    } catch (error: any) {
      toast.error("Failed to reject provider: " + error.message);
    }
  };

  const rejectService = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      toast.success("Service rejected");
      loadAdminData(); // Reload data
    } catch (error: any) {
      toast.error("Failed to reject service: " + error.message);
    }
  };

  if (!isAuthenticated || user?.user_type !== "admin") {
    console.log('AdminDashboard: Redirecting to home page');
    console.log('AdminDashboard: isAuthenticated =', isAuthenticated);
    console.log('AdminDashboard: user =', user);
    console.log('AdminDashboard: user?.user_type =', user?.user_type);
    console.log('AdminDashboard: user?.user_type !== "admin" =', user?.user_type !== "admin");
    return <Navigate to="/" replace />;
  }

  if (loading) {
    console.log('AdminDashboard: Showing loading state');
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-[hsl(210,100%,65%)] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[hsl(0,0%,95%)]">Loading admin dashboard...</p>
          <p className="text-[hsl(210,100%,75%)] text-sm mt-2">If this takes too long, please check the console for errors</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground">Manage providers and platform operations</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.avatar_url || undefined} />
                <AvatarFallback>{user?.full_name?.charAt(0) || 'A'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.full_name || 'Admin User'}</p>
                <p className="text-sm text-muted-foreground">Administrator</p>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  {statsLoading ? (
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-bold text-primary">{systemStats.totalUsers}</p>
                  )}
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Providers</p>
                  {statsLoading ? (
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-bold text-primary">{systemStats.totalProviders}</p>
                  )}
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                  {statsLoading ? (
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-bold text-orange-600">{pendingProviders.length}</p>
                  )}
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Accepted Jobs</p>
                  {statsLoading ? (
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-bold text-blue-600">{systemStats.confirmedBookings}</p>
                  )}
                </div>
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  {statsLoading ? (
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-bold text-yellow-600">{systemStats.inProgressBookings}</p>
                  )}
                </div>
                <Activity className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  {statsLoading ? (
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-bold text-green-600">{systemStats.completedBookings}</p>
                  )}
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cancelled</p>
                  {statsLoading ? (
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-bold text-red-600">{systemStats.cancelledBookings}</p>
                  )}
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue and Total Bookings Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Bookings</p>
                  {statsLoading ? (
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-bold text-primary">{systemStats.totalBookings}</p>
                  )}
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  {statsLoading ? (
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-bold text-primary">PKR {systemStats.totalRevenue.toFixed(2)}</p>
                  )}
                </div>
                <Receipt className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Commission Due</p>
                  {statsLoading ? (
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-bold text-orange-600">PKR {systemStats.totalCommissionDue.toFixed(2)}</p>
                  )}
                  <p className="text-xs text-muted-foreground">5% of provider earnings pending</p>
                </div>
                <Target className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Commission Cleared</p>
                  {statsLoading ? (
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-bold text-green-600">PKR {systemStats.totalClearedCommission.toFixed(2)}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Total calculated commission approved</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Payments</p>
                  {statsLoading ? (
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-bold text-red-600">{systemStats.pendingCommissionProviders}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Providers awaiting payment</p>
                </div>
                <Clock className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[hsl(210,100%,65%)] data-[state=active]:text-white">Overview</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-[hsl(210,100%,65%)] data-[state=active]:text-white">Users</TabsTrigger>
            <TabsTrigger value="providers" className="data-[state=active]:bg-[hsl(210,100%,65%)] data-[state=active]:text-white">Providers</TabsTrigger>
            <TabsTrigger value="services" className="data-[state=active]:bg-[hsl(210,100%,65%)] data-[state=active]:text-white">Services</TabsTrigger>
            <TabsTrigger value="reliability" className="data-[state=active]:bg-[hsl(210,100%,65%)] data-[state=active]:text-white">Reliability</TabsTrigger>
            <TabsTrigger value="commission" className="data-[state=active]:bg-[hsl(210,100%,65%)] data-[state=active]:text-white">Commission</TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-[hsl(210,100%,65%)] data-[state=active]:text-white">Content</TabsTrigger>
          </TabsList>
            
          <TabsContent value="overview">
            <div className="space-y-6">
              <AdminMetricsDashboard />

              {/* Cancellation Analytics */}
              <CancellationAnalytics />
            </div>
          </TabsContent>
            
          <TabsContent value="users">
            <UserManagementPanel />
          </TabsContent>
            
          <TabsContent value="providers">
            <div className="space-y-6">
              {/* Provider Overview Section */}
              <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
                <CardHeader>
                  <CardTitle className="text-[hsl(0,0%,95%)]">All Providers Overview</CardTitle>
                  <CardDescription className="text-[hsl(210,100%,75%)]">
                    Search and view all providers in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProviderOverviewSearch />
                </CardContent>
              </Card>
              
              {/* Provider Verification */}
              <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
                <CardHeader>
                  <CardTitle className="text-[hsl(0,0%,95%)]">Provider Verification</CardTitle>
                  <CardDescription className="text-[hsl(210,100%,75%)]">
                    Review and approve provider applications with all documents and information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <NormalVerificationManagement
                    pendingProviders={pendingProviders}
                    rejectedProviders={rejectedProviders}
                    onReviewComplete={loadAdminData}
                  />
                </CardContent>
              </Card>

              {/* Pro Badge Management */}
              <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
                <CardHeader>
                  <CardTitle className="text-[hsl(0,0%,95%)]">Pro Badge Management</CardTitle>
                  <CardDescription className="text-[hsl(210,100%,75%)]">
                    Manage Pro badge status for approved providers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProBadgeManagement />
                </CardContent>
              </Card>
              
              {/* Provider Commission Overview Section */}
              <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
                <CardHeader>
                  <CardTitle className="text-[hsl(0,0%,95%)]">Provider Commission Overview</CardTitle>
                  <CardDescription className="text-[hsl(210,100%,75%)]">
                    Manage provider commission payments and track payment status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProviderCommissionOverview />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
            
          <TabsContent value="services">
            <ServiceApprovalManagement />
          </TabsContent>

          <TabsContent value="reliability">
            <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
              <CardHeader>
                <CardTitle className="text-[hsl(0,0%,95%)]">User Reliability Monitor</CardTitle>
                <CardDescription className="text-[hsl(210,100%,75%)]">
                  Monitor and manage users with no-show strikes and account suspensions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserReliabilityMonitor />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commission">
            <div className="space-y-6">
              <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
                <CardHeader>
                  <CardTitle className="text-[hsl(0,0%,95%)]">Commission Management</CardTitle>
                  <CardDescription className="text-[hsl(210,100%,75%)]">
                    Manage commission rates and settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CommissionManagement />
                </CardContent>
              </Card>

              <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
                <CardHeader>
                  <CardTitle className="text-[hsl(0,0%,95%)]">Payment Methods & Commission Payments</CardTitle>
                  <CardDescription className="text-[hsl(210,100%,75%)]">
                    Manage payment methods and review commission payments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PaymentMethodsAdmin />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="content">
            <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
              <CardHeader>
                <CardTitle className="text-[hsl(0,0%,95%)]">Content Management</CardTitle>
                <CardDescription className="text-[hsl(210,100%,75%)]">
                  Manage website content, contact information, FAQs, and policies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContentManagement />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
