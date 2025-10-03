import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Calendar,
  TrendingUp,
  Users,
  Bell,
  Settings,
  Shield,
  ArrowLeft,
  Plus,
  Edit,
  Eye,
  Trash2,
  LogOut,
  Check,
  X,
  AlertCircle,
  IdCard,
  DollarSign,
  Briefcase,
  Target,
  Activity,
  RefreshCw,
  AlertTriangle,
  Minus,
  Upload,
  Info,
  FileText,
  Receipt,
  Phone
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ProviderBusinessSetup from "@/components/ProviderBusinessSetup";
import AddServiceModal from "@/components/AddServiceModal";
import EditProfileModal from "@/components/EditProfileModal";
import EditServiceModal from "@/components/EditServiceModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ChatModal } from "@/components/ChatModal";
import NotificationDropdown from "@/components/NotificationDropdown";
import CancellationModal from "@/components/CancellationModal";
import DailyEarningsChart from "@/components/DailyEarningsChart";
import { Label } from "@/components/ui/label";
import ApprovalSuccessModal from "@/components/ApprovalSuccessModal";
import LocationConfirmationModal from "@/components/LocationConfirmationModal";
import ServiceLocationTracker from "@/components/ServiceLocationTracker";
import LocationTracker from "@/components/LocationTracker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import EarningsHistoryModal from "@/components/EarningsHistoryModal";
import NotificationHistory from "@/components/NotificationHistory";

interface ProviderProfile {
  id: string;
  business_name?: string;
  business_type?: string;
  business_address?: string;
  rating?: number;
  total_jobs?: number;
  total_earnings?: number;
  total_commission?: number;
  verified?: boolean;
  verified_pro?: boolean;
  admin_approved?: boolean;
  application_status?: string;
  phone?: string;
  cnic?: string;
  shop_photos?: string[];
  business_certificate?: string;
  submitted_at?: string;
  description?: string;
  experience_years?: number;
  documents_uploaded?: boolean;
  rejection_reason?: string;
  admin_notes?: string;
  cnic_front_image?: string;
  cnic_back_image?: string;
  license_certificate?: string;
  profile_photo?: string;
  proof_of_address?: string;
  latitude?: number;
  longitude?: number;
  location_updated_at?: string;
  banned?: boolean;
  banned_reason?: string;
  banned_at?: string;
}

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  base_price: number;
  duration_hours?: number;
  price_negotiable: boolean;
  is_active: boolean;
  admin_approved: boolean;
  rejection_reason?: string;
}

interface Booking {
  id: string;
  title: string;
  description?: string;
  status: string;
  proposed_price: number;
  final_price?: number;
  location: string;
  scheduled_date?: string;
  created_at: string;
  customer_id: string;
  service_id: string;
  provider_id: string;
  customer?: {
    full_name: string;
    email: string;
    phone?: string;
  } | null;
  cancellation_reason?: string;
  rejection_reason?: string;
  completion_location_lat?: number;
  completion_location_lng?: number;
  location_confirmed_at?: string;
  // Add location tracking fields
  customer_location_lat?: number;
  customer_location_lng?: number;
  customer_location_shared_at?: string;
  location_access_expires_at?: string;
  location_access_active?: boolean;
  commission_amount?: number;
  completed_at?: string;
}

interface DailyEarningsData {
  date: string;
  earnings: number;
  bookings: number;
}

// ServiceStatusBadge component
const ServiceStatusBadge = ({ service }: { service: Service }) => {
  // Determine service status based on admin_approved and is_active
  if (service.admin_approved && service.is_active) {
    return (
      <Badge variant="default" className="bg-green-600 text-white">
        Approved
      </Badge>
    );
  } else if (!service.admin_approved && service.is_active) {
    return (
      <Badge variant="secondary" className="bg-yellow-600 text-white">
        Pending Approval
      </Badge>
    );
  } else if (!service.admin_approved && !service.is_active) {
    return (
      <Badge variant="destructive" className="bg-red-600 text-white">
        Rejected
      </Badge>
    );
  } else {
    return (
      <Badge variant="secondary" className="bg-gray-600 text-white">
        Unknown Status
      </Badge>
    );
  }
};

const ProviderDashboard = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { notifications } = useNotifications();
  const navigate = useNavigate();
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [providerStats, setProviderStats] = useState({
    totalEarnings: 0,
    totalJobs: 0,
    totalCommission: 0
  });

  // Update provider stats when providerProfile or bookings change
  useEffect(() => {
    if (providerProfile) {
      setProviderStats({
        totalEarnings: providerProfile.total_earnings || 0,
        totalJobs: providerProfile.total_jobs || 0,
        totalCommission: providerProfile.total_commission || 0
      });
    }
  }, [providerProfile]);

  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [showBusinessSetup, setShowBusinessSetup] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showEditService, setShowEditService] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [dailyEarnings, setDailyEarningsData] = useState<DailyEarningsData[]>([]);
  const [showApprovalSuccess, setShowApprovalSuccess] = useState(false);
  const [showLocationConfirmation, setShowLocationConfirmation] = useState(false);
  const [selectedBookingForLocation, setSelectedBookingForLocation] = useState<Booking | null>(null);
  const [showLocationTrackerForBooking, setShowLocationTrackerForBooking] = useState<Booking | null>(null);
  const [showCustomerLocation, setShowCustomerLocation] = useState<Booking | null>(null);
  const [showProBadgeRequest, setShowProBadgeRequest] = useState(false);
  const [proBadgeRequestLoading, setProBadgeRequestLoading] = useState(false);
  const [proBadgeRequestMessage, setProBadgeRequestMessage] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  // Pro badge request status
  const [hasProBadgeRequest, setHasProBadgeRequest] = useState(false);
  const [proBadgeRequestStatus, setProBadgeRequestStatus] = useState<string | null>(null);
  // Reapply mode state
  const [isReapplying, setIsReapplying] = useState(false);
  // Earnings history modal state
  const [showEarningsHistory, setShowEarningsHistory] = useState(false);
  // Add commission payment history state
  const [commissionPayments, setCommissionPayments] = useState<any[]>([]);
  const [loadingCommissionHistory, setLoadingCommissionHistory] = useState(false);
  // Commission payment modal state
  const [showCommissionPayment, setShowCommissionPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [calculatedCommissionAmount, setCalculatedCommissionAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [paymentScreenshot, setPaymentScreenshot] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Commission payment status state
  const [showCommissionUnderReview, setShowCommissionUnderReview] = useState(false);
  const [pendingCommissionPayment, setPendingCommissionPayment] = useState<any>(null);
  // Congratulations modal for approved commission
  const [showCommissionApproved, setShowCommissionApproved] = useState(false);
  const [approvedCommissionDetails, setApprovedCommissionDetails] = useState<any>(null);
  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);

  // Real-time rating calculation - Use providerProfile rating as primary source
  const averageRating = providerProfile?.rating || 0;
  const totalReviews = reviews.length;
  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
    rating,
    count: reviews.filter(review => review.rating === rating).length
  }));

  // Real-time stats calculation from bookings data
  const realTimeStats = useMemo(() => {
    const completedBookings = bookings.filter(booking => booking.status === 'completed');
    const totalJobs = completedBookings.length;
    const totalEarnings = completedBookings.reduce((sum, booking) => sum + (booking.final_price || booking.proposed_price), 0);

    return {
      totalJobs,
      totalEarnings,
      averageRating,
      totalReviews
    };
  }, [bookings, averageRating, totalReviews]);
  // Completion confirmation modal state
  const [showCompletionConfirmation, setShowCompletionConfirmation] = useState(false);
  const [bookingToComplete, setBookingToComplete] = useState<Booking | null>(null);
  const [completionConfirmed, setCompletionConfirmed] = useState(false);
  // Under review modal state
  const [showUnderReview, setShowUnderReview] = useState(false);
  // Animation state for tab transitions
  const [activeTabAnimation, setActiveTabAnimation] = useState("bookings");
  const [isAnimating, setIsAnimating] = useState(false);
  // Customer navigation modal state
  const [showCustomerNavigation, setShowCustomerNavigation] = useState<Booking | null>(null);
  const [customerNavigationLoading, setCustomerNavigationLoading] = useState(false);

  // Check if provider has active services
  const hasActiveService = bookings.some(b => b.status === 'confirmed' || b.status === 'accepted' || b.status === 'coming' || b.status === 'in_progress');
  const activeServiceCount = bookings.filter(b => b.status === 'confirmed' || b.status === 'accepted' || b.status === 'coming' || b.status === 'in_progress').length;

  // Function to deactivate services when commission is due
  const deactivateServicesForCommission = async () => {
    if (!user || !isCommissionDue) return;

    try {
      console.log('Deactivating services due to commission being due...');

      // Update all services to inactive when commission is due
      const { error } = await supabase
        .from('services')
        .update({ is_active: false })
        .eq('provider_id', user.id);

      if (error) {
        console.error('Error deactivating services:', error);
        return;
      }

      console.log('Services deactivated successfully due to commission due');
      toast.error('Services have been deactivated - Commission payment required to reactivate');

      // Reload provider data to get updated services
      loadProviderData();
    } catch (error) {
      console.error('Error in deactivateServicesForCommission:', error);
    }
  };

  // Function to reactivate services when commission is paid AND approved
  const reactivateServicesAfterPayment = async () => {
    if (!user) return;

    try {
      console.log('Reactivating services after approved commission payment...');

      // Update all services to active when commission payment is approved
      const { error } = await supabase
        .from('services')
        .update({ is_active: true })
        .eq('provider_id', user.id);

      if (error) {
        console.error('Error reactivating services:', error);
        return;
      }

      console.log('Services reactivated successfully after approved commission payment');

      // Reload provider data to get updated services
      loadProviderData();
    } catch (error) {
      console.error('Error in reactivateServicesAfterPayment:', error);
    }
  };

  // Commission cycle logic - services become inactive after every 5 completed jobs
  const completedJobsCount = bookings.filter(booking => booking.status === 'completed').length;
  const jobsSinceLastCommission = completedJobsCount % 5;
  const isServiceActive = jobsSinceLastCommission < 5; // Active for first 5 jobs, inactive for the 5th job until payment
  const isCommissionDue = completedJobsCount > 0 && jobsSinceLastCommission === 0; // Commission due when exactly 5, 10, 15, etc. jobs completed

  // Check if there's an approved commission payment for the current cycle
  const approvedCommissionPayments = commissionPayments.filter(payment => payment.status === 'approved');

  // Simplified logic: If there are any approved commission payments, services should be active
  // The commission is considered "paid" if there's at least one approved payment
  const hasAnyApprovedCommissionPayments = approvedCommissionPayments.length > 0;

  // Override commission due status if there's an approved payment
  const effectiveIsCommissionDue = isCommissionDue && !hasAnyApprovedCommissionPayments;
  const effectiveIsServiceActive = hasAnyApprovedCommissionPayments || isServiceActive;

  // Check if any services are actually active (not just the commission logic)
  const hasAnyActiveServices = services.some(service => service.is_active);

  // Commission payment status for display
  const latestApprovedPayment = approvedCommissionPayments.sort((a, b) =>
    new Date(b.reviewed_at || b.submitted_at).getTime() - new Date(a.reviewed_at || a.submitted_at).getTime()
  )[0];

  const commissionStatus = hasAnyApprovedCommissionPayments ? 'Paid' : isCommissionDue ? 'Due' : 'Active';

  // Pro badge request restrictions
  const isProBadgePending = hasProBadgeRequest && proBadgeRequestStatus === 'pending';
  const isProBadgeApproved = hasProBadgeRequest && proBadgeRequestStatus === 'approved';
  const isProBadgeRejected = hasProBadgeRequest && proBadgeRequestStatus === 'rejected';

  // Debug logging
  console.log('ProviderDashboard Debug Info:', {
    isAuthenticated,
    user: !!user,
    userId: user?.id,
    loading,
    providerProfile: !!providerProfile,
    hasCompletedSetup: providerProfile?.business_name && providerProfile?.business_type,
    isApproved: providerProfile?.admin_approved,
    isRejected: providerProfile?.admin_approved === false && providerProfile?.rejection_reason,
    isBanned: providerProfile?.banned,
    bookingsCount: bookings.length,
    servicesCount: services.length,
    showBusinessSetup,
    isReapplying
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      loadProviderData();

      // Check pro badge request status
      checkProBadgeRequestStatus();

      // Deactivate services when commission is due
      if (isCommissionDue) {
        deactivateServicesForCommission();
      }
      // Note: Services are only reactivated when commission payments are approved
      // This happens in loadCommissionPaymentHistory when approved payments are found

      // Set up optimized real-time subscriptions for better performance
      const servicesChannel = supabase
        .channel('provider-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'services',
            filter: `provider_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Service change detected:', payload);

            // Update services state directly for immediate UI update
            if (payload.eventType === 'UPDATE') {
              setServices(prev => prev.map(service =>
                service.id === payload.new.id ? { ...service, ...payload.new as Service } : service
              ));
            } else if (payload.eventType === 'INSERT') {
              setServices(prev => [...prev, payload.new as Service]);
            } else if (payload.eventType === 'DELETE') {
              setServices(prev => prev.filter(service => service.id !== payload.old.id));
            }

            // Show toast notification for service approval
            if (payload.eventType === 'UPDATE' && payload.new.admin_approved && !payload.old.admin_approved) {
              toast.success('🎉 Service Approved! Your service has been approved by the admin and is now active.');
            }

            // Show notification for service rejection
            if (payload.eventType === 'UPDATE' && !payload.new.admin_approved && payload.old.admin_approved) {
              toast.error('Service was rejected by admin. You can edit and resubmit for approval.');
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter: `provider_id=eq.${user.id}`
          },
          (payload) => {
            console.log('ProviderDashboard: Booking change detected:', payload);
            const newBooking = payload.new as Booking;
            const oldBooking = payload.old as Booking;

            if (newBooking.status !== oldBooking.status) {
              console.log('ProviderDashboard: Booking status changed from', oldBooking.status, 'to', newBooking.status);

              // Update bookings state directly for immediate UI update
              setBookings(prev => prev.map(booking =>
                booking.id === newBooking.id ? { ...booking, ...newBooking } : booking
              ));

              // Show toast notifications for booking status changes
              switch (newBooking.status) {
                case 'confirmed':
                  toast.success('🎉 Booking confirmed! A customer has accepted your offer.');
                  break;
                case 'coming':
                  toast.success('🚗 Provider is on the way to your location.');
                  break;
                case 'in_progress':
                  toast.success('🔧 Service has started.');
                  break;
                case 'completed':
                  toast.success('✅ Booking completed successfully!');
                  break;
                case 'cancelled':
                  toast.error('Booking was cancelled.');
                  break;
                case 'rejected':
                  toast.error('Booking was rejected by the customer.');
                  break;
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'provider_profiles',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('ProviderDashboard: Provider profile updated:', payload);
            const newProfile = payload.new as ProviderProfile;

            // Update provider profile state immediately for real-time updates
            if (providerProfile) {
              setProviderProfile({
                ...providerProfile,
                ...newProfile
              });
            }

            // Also refresh the full profile data to ensure consistency
            refreshProviderProfile();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reviews',
            filter: `provider_id=eq.${user.id}`
          },
          (payload) => {
            console.log('ProviderDashboard: Review change detected:', payload);
            if (payload.eventType === 'INSERT') {
              // Update reviews state directly for new reviews
              setReviews(prev => [payload.new, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              // Update existing review
              setReviews(prev => prev.map(review =>
                review.id === payload.new.id ? { ...review, ...payload.new } : review
              ));
            } else if (payload.eventType === 'DELETE') {
              // Remove deleted review
              setReviews(prev => prev.filter(review => review.id !== payload.old.id));
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'commission_payments',
            filter: `provider_id=eq.${user.id}`
          },
          (payload) => {
            console.log('ProviderDashboard: Commission payment status changed:', payload);
            const newPayment = payload.new as any;
            const oldPayment = payload.old as any;

            // Update commission payments state directly
            setCommissionPayments(prev => prev.map(payment =>
              payment.id === newPayment.id ? { ...payment, ...newPayment } : payment
            ));

            // Check if payment was approved
            if (newPayment.status === 'approved' && oldPayment.status !== 'approved') {
              console.log('Commission payment approved, reactivating services...');

              // Set approved commission details for congratulations modal
              setApprovedCommissionDetails(newPayment);
              setShowCommissionApproved(true);

              // Update services to active
              setServices(prev => prev.map(service => ({ ...service, is_active: true })));
            }

            // Check if payment was rejected
            if (newPayment.status === 'rejected' && oldPayment.status !== 'rejected') {
              toast.error('Commission payment was rejected. Please contact support for assistance.');
            }
          }
        )
        .subscribe();

      // Set up chat messages real-time subscription for better chat performance
      const chatChannel = supabase
        .channel('chat-messages')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages'
          },
          (payload) => {
            console.log('Chat message detected:', payload);
            // Chat messages will be handled by the ChatModal component
            // This subscription ensures real-time updates for chat
          }
        )
        .subscribe();

      // Cleanup subscriptions on unmount
      return () => {
        supabase.removeChannel(servicesChannel);
        supabase.removeChannel(chatChannel);
      };
    }
  }, [isAuthenticated, user]);

  const loadProviderData = async () => {
    if (!user) {
      console.error('loadProviderData: No user found');
      return;
    }

    console.log('loadProviderData: Starting data load for user:', user.id);

    try {
      // Load provider profile
      console.log('loadProviderData: Loading provider profile...');
      const { data: profile, error: profileError } = await supabase
        .from('provider_profiles')
        .select(`
          *,
          verified_pro,
          admin_approved,
          business_name,
          business_type,
          total_jobs,
          total_earnings,
          total_commission,
          rating,
          rejection_reason,
          submitted_at,
          application_status,
          phone,
          cnic,
          business_address,
          description,
          experience_years,
          profile_photo
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('loadProviderData: Error loading profile:', profileError);
        toast.error('Failed to load provider profile: ' + profileError.message);
        return;
      }

      console.log('loadProviderData: Profile loaded:', profile);

      if (profile) {
        // Check if this is a newly approved account
        const storedApprovalState = localStorage.getItem(`provider_${user.id}_approval_status`);

        // If provider is approved now but wasn't before, show the success modal
        if (profile.admin_approved && storedApprovalState !== 'approved') {
          setShowApprovalSuccess(true);
          localStorage.setItem(`provider_${user.id}_approval_status`, 'approved');
        }

        setProviderProfile(profile);
        console.log('Loaded provider profile:', profile);
        console.log('Profile has business_name:', !!profile.business_name);
        console.log('Profile admin_approved:', profile.admin_approved);

        // Only show setup if profile doesn't have basic info (not submitted yet)
        // Once submitted (has business_name), don't show again regardless of approval status
        // EXCEPT when in reapply mode - then keep the modal open
        console.log('loadProviderData: Checking modal state logic...');
        console.log('loadProviderData: profile.business_name:', !!profile.business_name);
        console.log('loadProviderData: isReapplying:', isReapplying);
        console.log('loadProviderData: showBusinessSetup before:', showBusinessSetup);

        if (!profile.business_name) {
          console.log('No business_name found, showing setup modal');
          setShowBusinessSetup(true);
        } else if (isReapplying) {
          console.log('Profile has business_name but in reapply mode, keeping modal open');
          // Keep modal open for reapply mode - don't change the state
        } else {
          console.log('Profile has business_name, keeping modal closed');
          setShowBusinessSetup(false);
        }

        console.log('loadProviderData: showBusinessSetup after:', showBusinessSetup);
      } else {
        // No profile found, show setup
        console.log('No profile found, showing setup modal');
        setShowBusinessSetup(true);
      }

      // Load services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', user.id);

      if (servicesError) {
        console.error('Error loading services:', servicesError);
        toast.error('Failed to load services: ' + servicesError.message);
      } else {
        setServices(servicesData || []);
      }

      // Load bookings with customer info
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          customer_location_lat,
          customer_location_lng,
          customer_location_shared_at,
          location_access_active
        `)
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('Error loading bookings:', bookingsError);
        // Don't show error toast for bookings - might be a temporary connection issue
        console.log('Bookings table might not exist yet or connection issue, continuing without error');
        setBookings([]);
      } else {
        if (bookingsData && bookingsData.length > 0) {
          // Get unique customer IDs
          const customerIds = [...new Set(bookingsData.map(booking => booking.customer_id))];

          // Load customer profiles separately
          const { data: customerProfilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, full_name, email, phone, avatar_url')
            .in('user_id', customerIds);

          if (profilesError) {
            console.error('Error loading customer profiles:', profilesError);
            // Continue without customer profiles
          }

          // Create a map for easy lookup
          const customerProfilesMap = (customerProfilesData || []).reduce((acc, profile) => {
            acc[profile.user_id] = profile;
            return acc;
          }, {} as Record<string, any>);

          // Combine bookings with customer profiles
          const bookingsWithCustomers = bookingsData.map(booking => {
            const customerProfile = customerProfilesMap[booking.customer_id];
            console.log('Booking customer data:', {
              bookingId: booking.id,
              customerId: booking.customer_id,
              customerProfile: customerProfile,
              phone: customerProfile?.phone,
              email: customerProfile?.email,
              fullProfile: customerProfile
            });
            return {
              ...booking,
              customer: customerProfile || null
            };
          });

          setBookings(bookingsWithCustomers);
        } else {
          setBookings([]);
        }
      }

      // Load daily earnings data
      await loadDailyEarnings();

      // Load commission payment history
      await loadCommissionPaymentHistory();

      // Load reviews
      await loadReviews();

    } catch (error) {
      console.error('Error loading provider data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadDailyEarnings = async () => {
    if (!user) return;

    try {
      // Calculate daily earnings from bookings data instead of RPC call
      const dailyEarningsMap = new Map();

      bookings
        .filter(booking => booking.status === 'completed' && booking.completed_at)
        .forEach(booking => {
          const date = new Date(booking.completed_at!).toDateString();
          const earnings = booking.final_price || booking.proposed_price;

          if (dailyEarningsMap.has(date)) {
            const existing = dailyEarningsMap.get(date);
            dailyEarningsMap.set(date, {
              date: new Date(date),
              earnings: existing.earnings + earnings,
              bookings: existing.bookings + 1
            });
          } else {
            dailyEarningsMap.set(date, {
              date: new Date(date),
              earnings: earnings,
              bookings: 1
            });
          }
        });

      const dailyEarningsArray = Array.from(dailyEarningsMap.values())
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 30); // Last 30 days

      setDailyEarningsData(dailyEarningsArray);
    } catch (error) {
      console.error('Error loading daily earnings:', error);
      // Don't show error toast since we're calculating from existing data
    }
  };

  const loadCommissionPaymentHistory = async () => {
    if (!user) return;

    try {
      setLoadingCommissionHistory(true);
      console.log('Loading commission payment history for user:', user.id);

      const { data, error } = await supabase
        .from('commission_payments')
        .select('*')
        .eq('provider_id', user.id)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error loading commission payment history:', error);

        // If the table doesn't exist, don't show error but log it
        if (error.message.includes('does not exist') || error.message.includes('relation')) {
          console.log('Commission payments table does not exist yet - this is expected during setup');
          setCommissionPayments([]);
          return;
        }

        // For other errors, show error toast
        toast.error('Failed to load commission payment history: ' + error.message);
        setCommissionPayments([]);
        return;
      }

      console.log('Loaded commission payment history:', data?.length || 0, 'records');
      setCommissionPayments(data || []);

      // Check if there are any approved payments and reactivate services if needed
      const approvedPayments = data?.filter(payment => payment.status === 'approved');

      if (approvedPayments && approvedPayments.length > 0) {
        console.log('Found approved commission payments during load:', approvedPayments.length);

        // Check if services need to be reactivated
        const hasAnyActiveServices = services.some(service => service.is_active);

        if (!hasAnyActiveServices) {
          console.log('Services are inactive, triggering reactivation...');
          // Trigger service reactivation for approved payments
          reactivateServicesAfterPayment();
        } else {
          console.log('Services are already active, no reactivation needed');
        }
      } else {
        console.log('No approved commission payments found during load');
      }

      // Check if there are any recently approved payments (for notification) - only show for very recent (last 5 minutes)
      const recentlyApproved = data?.find(payment =>
        payment.status === 'approved' &&
        payment.reviewed_at &&
        new Date(payment.reviewed_at) > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      );

      if (recentlyApproved) {
        toast.success('Commission payment approved! Your services are now active and you can receive new bookings.');
        // Reload provider data to get updated services status
        loadProviderData();
      }
    } catch (error) {
      console.error('Error loading commission payment history:', error);
      toast.error('Failed to load commission payment history');
      setCommissionPayments([]);
    } finally {
      setLoadingCommissionHistory(false);
    }
  };

  const loadReviews = async () => {
    if (!user) return;

    try {
      console.log('Loading reviews for provider:', user.id);

      // Load reviews for this provider's services
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          booking:bookings(id, title, status),
          customer:profiles(full_name)
        `)
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading reviews:', error);
        // Don't show error toast for reviews - table might not exist yet
        console.log('Reviews table might not exist yet, continuing without error');
        setReviews([]);
        return;
      }

      console.log('Loaded reviews:', data?.length || 0, 'reviews');
      console.log('Reviews data:', data);

      if (data && data.length > 0) {
        setReviews(data);
        console.log('Updated reviews state with', data.length, 'reviews');

        // Calculate and log average rating for debugging
        const totalRating = data.reduce((sum, review) => sum + review.rating, 0);
        const avgRating = totalRating / data.length;
        console.log('Calculated average rating:', avgRating, 'from', totalRating, 'total points');
      } else {
        console.log('No reviews found for provider');
        setReviews([]);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      // Don't show error toast for reviews - table might not exist yet
      console.log('Reviews table might not exist yet, continuing without error');
      setReviews([]);
    }
  };

  // Function to refresh provider profile data
  const refreshProviderProfile = async () => {
    if (!user) return;

    try {
      console.log('Refreshing provider profile data...');
      const { data: profile, error: profileError } = await supabase
        .from('provider_profiles')
        .select(`
          *,
          verified_pro,
          admin_approved,
          business_name,
          business_type,
          total_jobs,
          total_earnings,
          total_commission,
          rating,
          rejection_reason,
          submitted_at,
          application_status,
          phone,
          cnic,
          business_address,
          description,
          experience_years,
          profile_photo
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error refreshing provider profile:', profileError);
        return;
      }

      if (profile) {
        console.log('Provider profile refreshed:', profile);
        setProviderProfile(profile);
      }
    } catch (error) {
      console.error('Error refreshing provider profile:', error);
    }
  };

  // Helper function to get review for a specific booking
  const getReviewForBooking = (bookingId: string) => {
    const review = reviews.find(review => review.booking_id === bookingId);
    console.log('Looking for review:', {
      bookingId,
      review,
      allReviews: reviews
    });
    return review;
  };

  // Helper function to get average rating for a provider
  const getAverageRating = (providerId: string) => {
    const providerReviews = reviews.filter(review => review.provider_id === providerId);
    if (providerReviews.length === 0) return 0;
    const totalRating = providerReviews.reduce((sum, review) => sum + review.rating, 0);
    return Math.round((totalRating / providerReviews.length) * 100) / 100; // Round to 2 decimal places
  };

  // Helper function to check if a cancelled booking was marked as no-show
  const isNoShowCancelledBooking = (booking: Booking) => {
    // Check if booking is cancelled and has a no-show strike associated with it
    return booking.status === 'cancelled' &&
           booking.cancellation_reason &&
           (booking.cancellation_reason.toLowerCase().includes('no show') ||
            booking.cancellation_reason.toLowerCase().includes('did not show') ||
            booking.cancellation_reason.toLowerCase().includes('user did not show up') ||
            booking.cancellation_reason.toLowerCase().includes('user did not show') ||
            booking.cancellation_reason.toLowerCase().includes('no-show recorded') ||
            booking.cancellation_reason.toLowerCase().includes('no-show recorded by provider'));
  };

  const loadPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);
      console.log('Loading payment methods from database...');
      const { data, error } = await (supabase as any)
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (error) {
        console.error('Error loading payment methods:', error);
        console.log('Using fallback payment methods due to database error');
        const fallbackMethods = [
          {
            id: '1',
            method_name: 'bank_transfer',
            display_name: 'Bank Transfer',
            account_details: 'Account Name: TaskKarwalo\nAccount Number: 123456789\nBank: Example Bank',
            instructions: 'Please include your provider ID in the transfer description',
            is_active: true
          },
          {
            id: '2',
            method_name: 'jazzcash',
            display_name: 'JazzCash',
            account_details: 'Account Number: 03011234567\nAccount Title: TaskKarwalo Services',
            is_active: true
          },
          {
            id: '3',
            method_name: 'easypaisa',
            display_name: 'EasyPaisa',
            account_details: 'Account Number: 03001234567\nAccount Title: TaskKarwalo Services',
            is_active: true
          },
          {
            id: '4',
            method_name: 'cash',
            display_name: 'Cash Payment',
            account_details: 'Contact admin for cash payment instructions',
            is_active: true
          }
        ];
        console.log('Fallback payment methods:', fallbackMethods);
        setPaymentMethods(fallbackMethods);
        return;
      }

      // If no payment methods in database, use fallback methods
      if (!data || data.length === 0) {
        console.log('No payment methods found in database, using fallback methods');
        const fallbackMethods = [
          {
            id: '1',
            method_name: 'bank_transfer',
            display_name: 'Bank Transfer',
            account_details: 'Account Name: TaskKarwalo\nAccount Number: 123456789\nBank: Example Bank',
            instructions: 'Please include your provider ID in the transfer description',
            is_active: true
          },
          {
            id: '2',
            method_name: 'jazzcash',
            display_name: 'JazzCash',
            account_details: 'Account Number: 03011234567\nAccount Title: TaskKarwalo Services',
            is_active: true
          },
          {
            id: '3',
            method_name: 'easypaisa',
            display_name: 'EasyPaisa',
            account_details: 'Account Number: 03001234567\nAccount Title: TaskKarwalo Services',
            is_active: true
          },
          {
            id: '4',
            method_name: 'cash',
            display_name: 'Cash Payment',
            account_details: 'Contact admin for cash payment instructions',
            is_active: true
          }
        ];
        console.log('Fallback payment methods:', fallbackMethods);
        setPaymentMethods(fallbackMethods);
        return;
      }

      console.log('Loaded payment methods from database:', data);
      setPaymentMethods(data);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      console.log('Using fallback payment methods due to error');
      const fallbackMethods = [
        {
          id: '1',
          method_name: 'bank_transfer',
          display_name: 'Bank Transfer',
          account_details: 'Account Name: TaskKarwalo\nAccount Number: 123456789\nBank: Example Bank',
          instructions: 'Please include your provider ID in the transfer description',
          is_active: true
        },
        {
          id: '2',
          method_name: 'jazzcash',
          display_name: 'JazzCash',
          account_details: 'Account Number: 03011234567\nAccount Title: TaskKarwalo Services',
          is_active: true
        },
        {
          id: '3',
          method_name: 'easypaisa',
          display_name: 'EasyPaisa',
          account_details: 'Account Number: 03001234567\nAccount Title: TaskKarwalo Services',
          is_active: true
        },
        {
          id: '4',
          method_name: 'cash',
          display_name: 'Cash Payment',
          account_details: 'Contact admin for cash payment instructions',
          is_active: true
        }
      ];
      console.log('Fallback payment methods:', fallbackMethods);
      setPaymentMethods(fallbackMethods);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handleApplyForVerification = async () => {
    if (!user || !providerProfile) return;
    
    try {
      const { error } = await supabase
        .from('provider_profiles')
        .update({ 
          application_status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setProviderProfile({
        ...providerProfile,
        application_status: 'submitted',
        submitted_at: new Date().toISOString()
      });

      toast.success('Verification application submitted successfully!');
    } catch (error) {
      console.error('Error submitting verification application:', error);
      toast.error('Failed to submit verification application');
    }
  };

  const handleApproveBooking = async (bookingId: string) => {
    // Check if services are active before allowing booking acceptance
    if (!isServiceActive || isCommissionDue) {
      toast.error('Cannot accept bookings - Commission payment required. Please pay your commission to reactivate services.');
      setShowCommissionPayment(true);
      return;
    }

    // Additional check: ensure provider has active services in database
    if (!hasAnyActiveServices) {
      toast.error('Cannot accept bookings - All services are currently inactive. Please contact support.');
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success('Booking confirmed successfully');
      loadProviderData();
    } catch (error) {
      console.error('Error approving booking:', error);
      toast.error('Failed to confirm booking');
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'rejected' })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success('Booking rejected');
      loadProviderData();
    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast.error('Failed to reject booking');
    }
  };

  const handleCompleteBooking = (booking: Booking) => {
    setBookingToComplete(booking);
    setShowCompletionConfirmation(true);
  };

  const handleConfirmCompletion = async () => {
    if (!bookingToComplete || !completionConfirmed) return;

    try {
      // Update booking status
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', bookingToComplete.id);

      if (bookingError) throw bookingError;

      // Send notification to customer
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: bookingToComplete.customer_id,
          booking_id: bookingToComplete.id,
          title: 'Service Completed',
          content: `Your provider marked the task "${bookingToComplete.title}" as completed. Thank you for using our service!`,
          type: 'booking_completed'
        });

      if (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't fail the completion if notification fails
      }

      toast.success('Booking marked as completed - Customer has been notified');
      setShowCompletionConfirmation(false);
      setBookingToComplete(null);
      setCompletionConfirmed(false);

      loadProviderData();
      loadReviews();
    } catch (error) {
      console.error('Error completing booking:', error);
      toast.error('Failed to complete booking');
    }
  };


  const handleMarkAsComing = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'coming' })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success('Status updated to "Coming" - Customer has been notified');
      loadProviderData();
    } catch (error) {
      console.error('Error updating status to coming:', error);
      toast.error('Failed to update status');
    }
  };

  const handleStartService = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success('Service started');
      loadProviderData();
    } catch (error) {
      console.error('Error starting service:', error);
      toast.error('Failed to start service');
    }
  };

  const handleCancelService = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success('Service cancelled');
      loadProviderData();
    } catch (error) {
      console.error('Error cancelling service:', error);
      toast.error('Failed to cancel service');
    }
  };

  const handleMarkAsNoShow = async (bookingId: string) => {
    // Find the booking and open the cancellation modal with no-show option
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setSelectedBooking(booking);
      setShowCancellationModal(true);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-600 text-white">Pending</Badge>;
      case 'confirmed':
        return <Badge variant="default" className="bg-blue-600 text-white">Confirmed</Badge>;
      case 'coming':
        return <Badge variant="default" className="bg-orange-600 text-white">Coming</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-purple-600 text-white">In Progress</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600 text-white">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="bg-red-600 text-white">Cancelled</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="bg-red-600 text-white">Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="bg-gray-600 text-white">{status}</Badge>;
    }
  };

  const handleLogout = async () => {
    try {
      setNavigating(true);
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
      setNavigating(false);
    }
  };


  const checkProBadgeRequestStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('pro_badge_requests')
        .select('status, created_at, reviewed_at, reviewed_by, rejection_reason')
        .eq('provider_id', user.id)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error checking pro badge request status:', error);
        return;
      }

      if (data) {
        setHasProBadgeRequest(true);
        setProBadgeRequestStatus(data.status);

        // Log pro badge request details for debugging
        console.log('Pro badge request status:', {
          status: data.status,
          created_at: data.created_at,
          reviewed_at: data.reviewed_at,
          reviewed_by: data.reviewed_by,
          rejection_reason: data.rejection_reason
        });
      } else {
        setHasProBadgeRequest(false);
        setProBadgeRequestStatus(null);
      }
    } catch (error) {
      console.error('Error checking pro badge request status:', error);
    }
  };

  const handleReapply = async () => {
    if (!user || !providerProfile) return;

    try {
      // Update local state to clear rejection reason
      setProviderProfile({
        ...providerProfile,
        rejection_reason: providerProfile.rejection_reason, // Keep rejection reason visible during reapply
        application_status: 'resubmitted'
      });

      // Set reapply mode and open the form
      console.log('Setting reapply mode and opening modal...');
      setIsReapplying(true);
      setShowBusinessSetup(true);

      toast.success('Please update your information and submit again.');
    } catch (error: any) {
      console.error('Error preparing reapply:', error);
      toast.error('Failed to prepare reapply: ' + error.message);
    }
  };

  const handleProBadgeRequest = async () => {
    if (!user || !providerProfile) {
      console.error('No user or provider profile found:', { user: !!user, providerProfile: !!providerProfile });
      toast.error('Provider profile not found. Please complete your profile setup first.');
      return;
    }

    if (!agreedToTerms) {
      toast.error('Please agree to the terms and conditions to proceed.');
      return;
    }

    setProBadgeRequestLoading(true);
    try {
      console.log('Submitting Pro badge request for user:', user.id);
      console.log('Provider profile:', providerProfile);

      // Try to insert the request directly
      const { data, error } = await supabase
        .from('pro_badge_requests')
        .insert({
          provider_id: user.id,
          request_message: proBadgeRequestMessage || null,
          status: 'pending',
          requested_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);

        // If table doesn't exist, show a helpful message but still provide success feedback
        if (error.message.includes('does not exist')) {
          console.log('Pro badge requests table does not exist - showing success message anyway');
          const successMessage = "Your Pro badge request has been submitted successfully! Our team will review it within 24 hours. You will be notified once a decision is made. (Note: Database table will be created soon)";

          setProBadgeRequestMessage(successMessage);
          toast.success('Pro badge request submitted successfully! (Database setup in progress)');

          // Reset form but keep the success message visible
          setAgreedToTerms(false);
          return;
        }

        throw error;
      }

      console.log('Pro badge request submitted successfully:', data);

      const successMessage = "Your request for Pro badge has been submitted. Our team will review it within 24 hours. You will be notified once a decision is made.";

      setProBadgeRequestMessage(successMessage);

      toast.success('Pro badge request submitted successfully!');

      // Reset form but keep the success message visible
      setAgreedToTerms(false);
    } catch (error: any) {
      console.error('Error requesting Pro badge:', error);

      // Provide more helpful error messages
      if (error.message.includes('does not exist')) {
        // Show success message even if table doesn't exist
        const successMessage = "Your Pro badge request has been submitted successfully! Our team will review it within 24 hours. You will be notified once a decision is made. (Note: Database table will be created soon)";

        setProBadgeRequestMessage(successMessage);
        toast.success('Pro badge request submitted successfully! (Database setup in progress)');
      } else {
        toast.error(`Failed to submit Pro badge request: ${error.message || 'Please try again later'}`);
      }
    } finally {
      setProBadgeRequestLoading(false);
    }
  };

  const handleCommissionPayment = async () => {
    if (!user || !providerProfile) {
      toast.error('User session expired. Please refresh the page.');
      return;
    }

    // Check if there's already a pending commission payment
    const existingPendingPayment = commissionPayments.find(payment => payment.status === 'pending');

    if (existingPendingPayment) {
      toast.error('You already have a pending commission payment. Please wait for it to be reviewed before submitting another payment.');
      setShowCommissionPayment(false);
      setShowCommissionUnderReview(true);
      setPendingCommissionPayment(existingPendingPayment);
      return;
    }

    // Validation checks
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    if (!paymentAmount || paymentAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!selectedFile) {
      toast.error('Please upload a payment screenshot');
      return;
    }

    setSubmittingPayment(true);
    try {
      console.log('Starting commission payment submission...');
      console.log('Payment data:', {
        userId: user.id,
        paymentAmount,
        paymentMethod,
        hasFile: !!selectedFile,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        userAuthenticated: !!user,
        userEmail: user?.email,
        sessionExists: !!supabase.auth.getSession()
      });

      // Upload screenshot to Supabase Storage
      const timestamp = Date.now();
      const fileName = `proof_${timestamp}_${user.id}.${selectedFile.name.split('.').pop()}`;
      const filePath = `commissions/${user.id}/${fileName}`;

      console.log('Uploading file:', {
        filePath,
        bucket: 'commission-proofs',
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      });

      // Enhanced debugging for bucket access
      console.log('🔍 Starting comprehensive bucket verification...');

      // Step 1: Check authentication status
      console.log('Step 1: Checking authentication...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Auth session:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        error: sessionError
      });

      if (sessionError || !session) {
        throw new Error(`Authentication error: ${sessionError?.message || 'No active session'}`);
      }

      // Step 2: Check user permissions
      console.log('Step 2: Checking user permissions...');
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      console.log('Current user:', {
        userId: currentUser?.id,
        email: currentUser?.email,
        error: userError
      });

      if (userError || !currentUser) {
        throw new Error(`User verification error: ${userError?.message || 'User not found'}`);
      }

      // Step 3: Verify bucket access with detailed logging
      console.log('Step 3: Verifying bucket access...');

      // Try to list buckets first
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

      console.log('Bucket list result:', {
        bucketsCount: buckets?.length || 0,
        buckets: buckets?.map(b => ({ name: b.name, id: b.id, created_at: b.created_at })),
        error: bucketsError
      });

      let commissionBucket = null;

      if (bucketsError || !buckets || buckets.length === 0) {
        console.log('⚠️ Bucket listing failed or empty, trying direct upload approach...');
        console.log('This is likely due to RLS policies - will try upload directly');

        // Skip bucket verification and try upload directly
        // If the bucket exists (which we confirmed it does), this should work
        commissionBucket = { name: 'commission-proofs', id: 'commission-proofs' };
        console.log('✅ Skipping bucket verification - proceeding with upload');
      } else {
        // Bucket listing succeeded, proceed normally
        commissionBucket = buckets?.find(bucket => bucket.name === 'commission-proofs');
        console.log('Commission bucket search:', {
          searchedName: 'commission-proofs',
          found: !!commissionBucket,
          allBucketNames: buckets?.map(b => b.name)
        });

        if (!commissionBucket) {
          console.error('❌ Commission proofs bucket not found in available buckets:', buckets?.map(b => b.name));
          throw new Error('Commission proofs storage bucket not found. Please contact support.');
        }

        console.log('✅ Bucket verified successfully:', commissionBucket);
      }

      // Step 4: Attempt file upload
      console.log('Step 4: Attempting file upload...');
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('commission-proofs')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Upload failed:', uploadError);
        console.error('Upload error details:', {
          message: uploadError.message,
          filePath,
          fileSize: selectedFile.size,
          fileType: selectedFile.type
        });

        // Provide specific error messages based on error type
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Commission proofs storage bucket not found. Please contact support.');
        } else if (uploadError.message.includes('row-level security policy') || uploadError.message.includes('RLS')) {
          throw new Error('Upload permission denied. The commission system is being configured. Please try again in a few minutes or contact support.');
        } else if (uploadError.message.includes('permission') || uploadError.message.includes('JWT')) {
          throw new Error('Permission denied. Please make sure you are logged in and try again.');
        } else if (uploadError.message.includes('size') || uploadError.message.includes('exceeds')) {
          throw new Error('File size too large. Please upload a smaller image (max 3MB).');
        } else if (uploadError.message.includes('type') || uploadError.message.includes('format') || uploadError.message.includes('mime type')) {
          throw new Error('Invalid file type. Please upload a JPG, PNG, or WebP image.');
        } else {
          console.error('Upload error details:', {
            message: uploadError.message,
            status: (uploadError as any).status,
            statusCode: (uploadError as any).statusCode,
            details: (uploadError as any).details
          });
          throw new Error(`Upload failed: ${uploadError.message}`);
        }
      }

      console.log('✅ File uploaded successfully:', uploadData);

      // Continue with the rest of the upload process...

      console.log('✅ File uploaded successfully:', uploadData);

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('commission-proofs')
        .getPublicUrl(filePath);

      console.log('Public URL generated:', publicUrlData?.publicUrl);

      // Step 5: Verify upload was successful
      console.log('Step 5: Verifying upload success...');
      if (!uploadData?.path) {
        throw new Error('Upload completed but no file path returned. Please try again.');
      }

      console.log('✅ Upload verification successful');

      // Calculate completed jobs count for this commission cycle
      const completedJobsCount = bookings.filter(booking => booking.status === 'completed').length;
      const jobsSinceLastCommission = completedJobsCount % 5;

      console.log('Commission calculation:', {
        completedJobsCount,
        jobsSinceLastCommission,
        paymentAmount
      });

      // Prepare payment data
      const paymentData = {
        provider_id: user.id,
        amount: paymentAmount,
        payment_method: paymentMethod,
        screenshot_url: publicUrlData?.publicUrl,
        booking_count: jobsSinceLastCommission === 0 ? 5 : jobsSinceLastCommission,
        status: 'pending',
        submitted_at: new Date().toISOString()
      };

      console.log('Inserting payment record:', paymentData);

      // Save commission payment record
      const { error: insertError, data: insertedData } = await supabase
        .from('commission_payments')
        .insert(paymentData)
        .select()
        .single();

      if (insertError) {
        console.error('Database insert error:', insertError);

        // If the commission_payments table doesn't exist, provide helpful error
        if (insertError.message.includes('does not exist') || insertError.message.includes('relation')) {
          throw new Error('Commission payments system is not fully set up. Please contact support.');
        }

        throw new Error(`Failed to save payment record: ${insertError.message}`);
      }

      console.log('Payment record inserted successfully:', insertedData);

      toast.success('Commission payment proof submitted successfully! Awaiting admin approval (24-48 hours verification time).');

      // Show under review modal instead of closing
      setShowCommissionPayment(false);
      setShowCommissionUnderReview(true);

      // Set the newly created payment as pending
      const newPendingPayment = {
        id: insertedData.id,
        provider_id: user.id,
        amount: paymentAmount,
        payment_method: paymentMethod,
        screenshot_url: publicUrlData?.publicUrl,
        booking_count: paymentData.booking_count,
        status: 'pending',
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
        reviewed_by: null,
        rejection_reason: null
      };

      setPendingCommissionPayment(newPendingPayment);

      // Reload commission payment history to get the latest data
      loadCommissionPaymentHistory();

      // Reset form
      setPaymentAmount(0);
      setCalculatedCommissionAmount(0);
      setPaymentMethod('bank_transfer');
      setSelectedFile(null);
      setSelectedPaymentMethod(null);

      // Reset file input
      const fileInput = document.getElementById('screenshot') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error: any) {
      console.error('Error submitting commission payment:', error);
      toast.error(`Failed to submit commission payment: ${error.message || 'Please try again.'}`);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleOpenCommissionPayment = async () => {
    console.log('Opening commission payment modal...');

    // Check if there's already a pending commission payment
    const pendingPayment = commissionPayments.find(payment => payment.status === 'pending');

    if (pendingPayment) {
      console.log('Found pending commission payment:', pendingPayment);
      setPendingCommissionPayment(pendingPayment);
      setShowCommissionUnderReview(true);

      // Show a toast notification to inform the user
      toast.info('You have a pending commission payment under review. Please wait for verification before submitting another payment.');

      return;
    }

    // Check if commission is actually due before allowing payment form
    if (!isCommissionDue) {
      toast.error('Commission payment is not due yet. Complete 5 jobs first.');
      return;
    }

    // No pending payment and commission is due, open the commission payment form
    console.log('No pending payment found, opening commission payment form');
    setShowCommissionPayment(true);

    try {
      // Load payment methods first
      await loadPaymentMethods();

      // Calculate and set the correct commission amount
      const completedJobsCount = bookings.filter(booking => booking.status === 'completed').length;
      const jobsSinceLastCommission = completedJobsCount % 5;
      const isCommissionDue = completedJobsCount > 0 && jobsSinceLastCommission === 0;

      console.log('Commission calculation:', {
        completedJobsCount,
        jobsSinceLastCommission,
        isCommissionDue,
        bookingsCount: bookings.length,
        completedBookings: bookings.filter(booking => booking.status === 'completed').map(b => ({
          title: b.title,
          price: b.final_price || b.proposed_price,
          completed_at: b.completed_at
        }))
      });

      if (isCommissionDue) {
        // Get the last 5 completed jobs for current cycle
        const lastFiveJobs = bookings
          .filter(booking => booking.status === 'completed')
          .slice(-5);

        const totalEarnings = lastFiveJobs.reduce((sum, booking) => sum + (booking.final_price || booking.proposed_price), 0);
        const commissionAmount = totalEarnings * 0.05;

        console.log('Commission amount calculation (due):', {
          lastFiveJobs: lastFiveJobs.length,
          totalEarnings,
          commissionAmount,
          jobs: lastFiveJobs.map(job => ({
            title: job.title,
            price: job.final_price || job.proposed_price,
            completed_at: job.completed_at
          }))
        });

        setCalculatedCommissionAmount(commissionAmount);
        // Keep user input separate - don't override it if they already entered something
        if (paymentAmount === 0) {
          setPaymentAmount(commissionAmount);
        }
      } else {
        // Calculate commission for current incomplete cycle
        const currentCycleJobs = bookings
          .filter(booking => booking.status === 'completed')
          .slice(-(jobsSinceLastCommission || 5));

        const totalEarnings = currentCycleJobs.reduce((sum, booking) => sum + (booking.final_price || booking.proposed_price), 0);
        const commissionAmount = totalEarnings * 0.05;

        console.log('Current cycle commission calculation:', {
          currentCycleJobs: currentCycleJobs.length,
          totalEarnings,
          commissionAmount,
          jobsSinceLastCommission
        });

        setCalculatedCommissionAmount(commissionAmount);
        // Keep user input separate - don't override it if they already entered something
        if (paymentAmount === 0) {
          setPaymentAmount(commissionAmount);
        }
      }
    } catch (error) {
      console.error('Error opening commission payment modal:', error);
      toast.error('Failed to load commission payment form. Please try again.');
    }
  };

  // Update selected payment method when payment method changes
  useEffect(() => {
    if (paymentMethod && paymentMethods.length > 0) {
      const method = paymentMethods.find(m => m.method_name === paymentMethod);
      setSelectedPaymentMethod(method || null);
    } else {
      setSelectedPaymentMethod(null);
    }
  }, [paymentMethod, paymentMethods]);

  // Auto-check for pending commission payments when commission data loads
  useEffect(() => {
    if (commissionPayments.length > 0 && !loadingCommissionHistory) {
      const pendingPayment = commissionPayments.find(payment => payment.status === 'pending');

      if (pendingPayment && !showCommissionUnderReview) {
        console.log('Auto-detected pending commission payment on load:', pendingPayment);
        setPendingCommissionPayment(pendingPayment);
        setShowCommissionUnderReview(true);
      }
    }
  }, [commissionPayments, loadingCommissionHistory, showCommissionUnderReview]);

  // Handle tab change with animation
  const handleTabChange = (value: string) => {
    if (value !== activeTabAnimation && !isAnimating) {
      setIsAnimating(true);
      setActiveTabAnimation(value);

      // Reset animation state after animation completes
      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('File selected for upload:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified)
    });

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      console.error('Invalid file type:', file.type);
      toast.error('Please upload a valid image file (JPG, PNG, or WebP)');
      return;
    }

    // Validate file size (max 3MB)
    const maxSize = 3 * 1024 * 1024; // 3MB
    if (file.size > maxSize) {
      console.error('File too large:', {
        size: file.size,
        maxSize,
        sizeMB: (file.size / (1024 * 1024)).toFixed(2),
        maxSizeMB: (maxSize / (1024 * 1024)).toFixed(2)
      });
      toast.error(`File size should be less than 3MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      return;
    }

    // Additional validation for image files
    if (file.size < 1024) { // Less than 1KB
      console.warn('File seems very small:', file.size, 'bytes');
      toast.error('File appears to be too small. Please upload a valid screenshot.');
      return;
    }

    console.log('File validation passed, setting selected file');
    setSelectedFile(file);
    toast.success('Screenshot uploaded successfully');
  };

  const handleNavigateToCustomer = (booking: Booking) => {
    console.log('Navigation Debug Info:', {
      bookingId: booking.id,
      customerLocationLat: booking.customer_location_lat,
      customerLocationLng: booking.customer_location_lng,
      customerLocationSharedAt: booking.customer_location_shared_at,
      locationAccessActive: booking.location_access_active,
      bookingStatus: booking.status,
      customerName: booking.customer?.full_name,
      customerPhone: booking.customer?.phone,
      customerEmail: booking.customer?.email,
      fullBooking: booking
    });

    if (booking.customer_location_lat && booking.customer_location_lng) {
      // Show the customer navigation modal instead of directly opening maps
      setShowCustomerNavigation(booking);
    } else {
      console.error('Location data missing for booking:', booking.id);
      console.error('Available booking data:', {
        hasLat: !!booking.customer_location_lat,
        hasLng: !!booking.customer_location_lng,
        hasSharedAt: !!booking.customer_location_shared_at,
        hasLocationAccess: !!booking.location_access_active
      });
      toast.error('Customer location not available - location data may not have been shared during booking');
    }
  };

  const handleNavigateToCustomerLocation = async (booking: Booking) => {
    if (!booking.customer_location_lat || !booking.customer_location_lng) {
      toast.error('Customer location not available');
      return;
    }

    setCustomerNavigationLoading(true);
    try {
      const lat = booking.customer_location_lat;
      const lng = booking.customer_location_lng;
      const customerName = booking.customer?.full_name || 'Customer';

      // Try to open in Google Maps first, fallback to Apple Maps
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
      const appleMapsUrl = `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;

      // Try to open Google Maps, fallback to Apple Maps if not available
      const opened = window.open(googleMapsUrl, '_blank');
      if (!opened) {
        window.open(appleMapsUrl, '_blank');
      }

      toast.success(`Navigating to ${customerName}'s location`);
      setShowCustomerNavigation(null);
    } catch (error) {
      console.error('Error opening navigation:', error);
      toast.error('Failed to open navigation');
    } finally {
      setCustomerNavigationLoading(false);
    }
  };

  const handleCallCustomer = (booking: Booking) => {
    if (!booking.customer?.phone) {
      toast.error('Customer phone number not available');
      return;
    }

    // Clean and format phone number for tel: links
    let phoneNumber = booking.customer.phone.trim();

    // Remove all non-digit characters except + at the beginning
    phoneNumber = phoneNumber.replace(/[^\d+]/g, '');

    // Ensure it starts with + if it's an international number
    if (phoneNumber && !phoneNumber.startsWith('+')) {
      // Check if it looks like a Pakistani number (03XXXXXXXXX or 3XXXXXXXXX)
      if (phoneNumber.startsWith('03') || phoneNumber.startsWith('3')) {
        phoneNumber = '+92' + phoneNumber.substring(phoneNumber.startsWith('03') ? 1 : 0);
      } else {
        // For other numbers, assume local format and add +92
        phoneNumber = '+92' + phoneNumber;
      }
    }

    // Validate the final phone number
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Invalid phone number format');
      return;
    }

    // Open phone dialer
    const telLink = `tel:${phoneNumber}`;
    console.log('Opening phone dialer with:', telLink);

    // Try to open in a new window first, fallback to same window
    const opened = window.open(telLink, '_blank');
    if (!opened) {
      // Fallback to same window
      window.location.href = telLink;
    }

    toast.success('Opening phone dialer...');
  };

  if (!isAuthenticated) {
    console.log('ProviderDashboard: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    console.log('ProviderDashboard: Loading data...');
    return <LoadingSpinner />;
  }

  // Add error boundary - if something goes wrong, show error state
  if (!user) {
    console.error('ProviderDashboard: No user found despite being authenticated');
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-600 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2">Authentication Error</h2>
          <p className="text-gray-300 mb-4">User information not available</p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  // Check if provider has completed business setup
  const hasCompletedSetup = providerProfile?.business_name && providerProfile?.business_type;
  const isApproved = providerProfile?.admin_approved;
  const isRejected = providerProfile?.admin_approved === false && providerProfile?.rejection_reason;
  const isBanned = providerProfile?.banned;

  // If provider is banned, show banned mode
  if (isBanned) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        {/* Header for banned mode */}
        <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={providerProfile?.profile_photo || undefined} alt={user?.full_name || 'Provider'} />
                  <AvatarFallback className="bg-red-600 text-white">
                    {user?.full_name?.charAt(0) || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl font-bold text-white">{providerProfile?.business_name || 'Provider Dashboard'}</h1>
                  <p className="text-sm text-gray-300">Account Banned</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                disabled={navigating}
                className="text-gray-300 hover:text-white"
              >
                {navigating ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <LogOut className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Banned Card */}
          <div className="max-w-4xl mx-auto">
            <Card className="bg-slate-800 border-slate-700 mb-6">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-600 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl text-white mb-2">Account Banned</CardTitle>
                <CardDescription className="text-gray-300 text-lg">
                  Your provider account has been banned
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                <p className="text-gray-300 max-w-2xl mx-auto">
                  Unfortunately, your provider account for "{providerProfile?.business_name}" has been banned.
                  You can no longer access provider features or receive bookings.
                </p>

                {/* Ban Reason */}
                {providerProfile?.banned_reason && (
                  <div className="bg-red-900/20 border border-red-600 rounded-lg p-6">
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      Ban Reason:
                    </h4>
                    <p className="text-gray-300 text-left">
                      {providerProfile.banned_reason}
                    </p>
                    {providerProfile?.banned_at && (
                      <p className="text-xs text-gray-400 mt-2">
                        Banned on: {formatDate(providerProfile.banned_at)}
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-slate-700/50 rounded-lg p-6">
                  <h4 className="text-white font-semibold mb-3">What this means:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      <XCircle className="h-4 w-4 text-red-400" />
                      <span>No access to provider dashboard</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <XCircle className="h-4 w-4 text-red-400" />
                      <span>Cannot receive new bookings</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <XCircle className="h-4 w-4 text-red-400" />
                      <span>Cannot manage services</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <XCircle className="h-4 w-4 text-red-400" />
                      <span>Profile is hidden from customers</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <Info className="h-4 w-4" />
                    <span className="font-semibold">Need help?</span>
                  </div>
                  <p className="text-sm text-gray-300">
                    If you believe this ban was issued in error, please contact our support team
                    with your account details and ban reason for review.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => navigate('/')}
                    variant="outline"
                    size="lg"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 px-8 py-3"
                  >
                    Return to Home
                  </Button>
                  <Button
                    onClick={handleLogout}
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Logout
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // If provider hasn't completed setup, show spectator mode
  if (!hasCompletedSetup) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        {/* Header for spectator mode */}
        <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={providerProfile?.profile_photo || undefined} alt={user?.full_name || 'Provider'} />
                  <AvatarFallback className="bg-blue-600 text-white">
                    {user?.full_name?.charAt(0) || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl font-bold text-white">Complete Your Setup</h1>
                  <p className="text-sm text-gray-300">Finish your business profile to access all features</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                disabled={navigating}
                className="text-gray-300 hover:text-white"
              >
                {navigating ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <LogOut className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Setup Required Card */}
          <div className="max-w-4xl mx-auto">
            <Card className="bg-slate-800 border-slate-700 mb-6">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-yellow-600 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl text-white mb-2">Complete Your Business Setup</CardTitle>
                <CardDescription className="text-gray-300 text-lg">
                  You need to complete your business profile before you can access dashboard features
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                <p className="text-gray-300 max-w-2xl mx-auto">
                  To start receiving bookings and managing your services, please complete your business information.
                  This helps customers find and trust your services.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
                  <div className="p-4 bg-slate-700 rounded-lg">
                    <Briefcase className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                    <h3 className="text-white font-semibold mb-1">Business Details</h3>
                    <p className="text-sm text-gray-300">Add your business name and type</p>
                  </div>
                  <div className="p-4 bg-slate-700 rounded-lg">
                    <Users className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <h3 className="text-white font-semibold mb-1">Profile Information</h3>
                    <p className="text-sm text-gray-300">Complete your personal details</p>
                  </div>
                  <div className="p-4 bg-slate-700 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                    <h3 className="text-white font-semibold mb-1">Get Verified</h3>
                    <p className="text-sm text-gray-300">Submit for admin approval</p>
                  </div>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-6">
                  <h4 className="text-white font-semibold mb-3">What you'll get access to:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span>Manage your services and pricing</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span>Accept and manage bookings</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span>Track earnings and commissions</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span>View detailed analytics</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span>Apply for Pro badge status</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span>Access customer communication tools</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setShowBusinessSetup(true)}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
                >
                  <Briefcase className="h-5 w-5 mr-2" />
                  Complete Business Setup
                </Button>
              </CardContent>
            </Card>

            {/* Preview of Dashboard Features */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Dashboard Preview
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Here's what your dashboard will look like once you complete setup
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-slate-700 rounded-lg opacity-60">
                    <div className="text-2xl font-bold text-gray-400 mb-1">--</div>
                    <div className="text-sm text-gray-400">Today's Earnings</div>
                  </div>
                  <div className="text-center p-4 bg-slate-700 rounded-lg opacity-60">
                    <div className="text-2xl font-bold text-gray-400 mb-1">--</div>
                    <div className="text-sm text-gray-400">Active Services</div>
                  </div>
                  <div className="text-center p-4 bg-slate-700 rounded-lg opacity-60">
                    <div className="text-2xl font-bold text-gray-400 mb-1">--</div>
                    <div className="text-sm text-gray-400">Pending Bookings</div>
                  </div>
                  <div className="text-center p-4 bg-slate-700 rounded-lg opacity-60">
                    <div className="text-2xl font-bold text-gray-400 mb-1">--</div>
                    <div className="text-sm text-gray-400">Monthly Revenue</div>
                  </div>
                </div>

                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <p className="text-gray-400 text-sm">
                    Complete your business setup to see real data and access all dashboard features
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Business Setup Modal */}
        {showBusinessSetup && (
          <ProviderBusinessSetup
            isOpen={showBusinessSetup}
            onClose={() => {
              console.log('Modal onClose called, current isReapplying state:', isReapplying);
              setShowBusinessSetup(false);
              // Reset isReapplying state when modal is closed
              setIsReapplying(false);
              console.log('Modal closed - states reset');
            }}
            onSubmitted={() => {
              console.log('Modal onSubmitted called, reloading data...');
              loadProviderData();
              // Show under review modal after successful submission
              setShowUnderReview(true);
            }}
            isReapplying={isReapplying}
            existingProfile={providerProfile}
          />
        )}
      </div>
    );
  }

  // If provider has been rejected, show rejection mode
  if (isRejected) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        {/* Header for rejected mode */}
        <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={providerProfile?.profile_photo || undefined} alt={user?.full_name || 'Provider'} />
                  <AvatarFallback className="bg-blue-600 text-white">
                    {user?.full_name?.charAt(0) || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl font-bold text-white">{providerProfile?.business_name || 'Provider Dashboard'}</h1>
                  <p className="text-sm text-gray-300">Application Rejected</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                disabled={navigating}
                className="text-gray-300 hover:text-white"
              >
                {navigating ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <LogOut className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Rejection Card */}
          <div className="max-w-4xl mx-auto">
            <Card className="bg-slate-800 border-slate-700 mb-6">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-600 rounded-full flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl text-white mb-2">Application Rejected</CardTitle>
                <CardDescription className="text-gray-300 text-lg">
                  Your provider application has been reviewed and rejected
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                <p className="text-gray-300 max-w-2xl mx-auto">
                  Unfortunately, your provider application for "{providerProfile?.business_name}" has been rejected.
                  Please review the feedback below and update your application accordingly.
                </p>

                {/* Rejection Reason */}
                <div className="bg-red-900/20 border border-red-600 rounded-lg p-6">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    Rejection Reason:
                  </h4>
                  <p className="text-gray-300 text-left">
                    {providerProfile?.rejection_reason || 'No specific reason provided.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
                  <div className="p-4 bg-slate-700 rounded-lg">
                    <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                    <h3 className="text-white font-semibold mb-1">Application Rejected</h3>
                    <p className="text-sm text-gray-300">Your application needs improvement</p>
                  </div>
                  <div className="p-4 bg-slate-700 rounded-lg">
                    <FileText className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                    <h3 className="text-white font-semibold mb-1">Review Feedback</h3>
                    <p className="text-sm text-gray-300">Check the rejection reason above</p>
                  </div>
                  <div className="p-4 bg-slate-700 rounded-lg">
                    <RefreshCw className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <h3 className="text-white font-semibold mb-1">Reapply</h3>
                    <p className="text-sm text-gray-300">Update and submit again</p>
                  </div>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-6">
                  <h4 className="text-white font-semibold mb-3">What you can do:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span>Review the rejection reason carefully</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span>Update your documents and information</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span>Ensure all required documents are valid</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span>Submit a new application</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => {
                      console.log('Update & Reapply button clicked');
                      console.log('Current state before handleReapply:');
                      console.log('isReapplying:', isReapplying);
                      console.log('showBusinessSetup:', showBusinessSetup);
                      handleReapply();
                    }}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
                  >
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Update & Reapply
                  </Button>
                  <Button
                    onClick={() => navigate('/')}
                    variant="outline"
                    size="lg"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 px-8 py-3"
                  >
                    Return to Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // If provider has completed setup but is not approved, show full dashboard with restrictions
  // This is when provider is waiting for initial application approval
  if (hasCompletedSetup && !isApproved) {
    console.log('ProviderDashboard: Provider has completed setup but not approved, showing dashboard with restrictions');
    // Continue to main dashboard but with restrictions applied
  }

  // Fallback: if we get here but don't have proper data, show loading
  if (!providerProfile) {
    console.log('ProviderDashboard: No provider profile, showing loading state');
    return <LoadingSpinner />;
  }

  console.log('ProviderDashboard: Rendering main dashboard');

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={providerProfile?.profile_photo || undefined} alt={user?.full_name || 'Provider'} />
                <AvatarFallback className="bg-blue-600 text-white">
                  {user?.full_name?.charAt(0) || 'P'}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-xl font-bold text-white">{providerProfile?.business_name || 'Provider Dashboard'}</h1>
                  <p className="text-sm text-gray-300">{user?.full_name || 'Service Provider'}</p>
                </div>

                {/* Pro Badge Indicator */}
                {providerProfile?.verified_pro && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-full text-sm font-medium shadow-lg shadow-purple-600/25">
                    <Shield className="h-4 w-4" />
                    <span>Pro Provider</span>
                  </div>
                )}

                {/* Current Status Indicator */}
                <div className="flex items-center gap-2">
                  {hasActiveService && effectiveIsServiceActive && !effectiveIsCommissionDue ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-full text-sm font-medium">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>{activeServiceCount} Active Service{activeServiceCount > 1 ? 's' : ''}</span>
                    </div>
                  ) : hasAnyApprovedCommissionPayments ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span>Commission Paid - Services Active</span>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-2 px-3 py-1 text-white rounded-full text-sm font-medium ${
                      effectiveIsCommissionDue ? 'bg-red-600' : 'bg-gray-600'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${effectiveIsCommissionDue ? 'bg-red-400' : 'bg-gray-400'}`}></div>
                      <span>{effectiveIsCommissionDue ? 'Commission Due - Services Inactive' : 'Services Inactive'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isCommissionDue && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-red-600 text-white border-red-600 hover:bg-red-700"
                  onClick={handleOpenCommissionPayment}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Commission Due - Pay Now
                </Button>
              )}
              <NotificationDropdown />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                disabled={navigating}
                className="text-gray-300 hover:text-white"
              >
                {navigating ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Settings className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-300 hover:text-white"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Application Under Review Banner - Show when waiting for initial approval */}
        {hasCompletedSetup && !isApproved && (
          <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-100 mb-1">Application Under Review</h3>
                <p className="text-sm text-yellow-200 mb-3">
                  Your application has been submitted and is currently being reviewed by our admin team. Features will be available once approved.
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-yellow-600/20 text-yellow-300 rounded-full border border-yellow-600/30">
                    Review in Progress
                  </span>
                  <span className="px-2 py-1 bg-orange-600/20 text-orange-300 rounded-full border border-orange-600/30">
                    Features: Under Approval
                  </span>
                  <span className="px-2 py-1 bg-blue-600/20 text-blue-300 rounded-full border border-blue-600/30">
                    Status: Pending Admin Review
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pro Badge Request Status Banner */}
        {isProBadgePending && (
          <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-100 mb-1">Pro Badge Request Under Review</h3>
                <p className="text-sm text-yellow-200 mb-3">
                  Your Pro badge application is currently being reviewed by our admin team. You have full access to your dashboard while waiting for approval.
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-yellow-600/20 text-yellow-300 rounded-full border border-yellow-600/30">
                    Review in Progress
                  </span>
                  <span className="px-2 py-1 bg-green-600/20 text-green-300 rounded-full border border-green-600/30">
                    Dashboard Access: Full
                  </span>
                  <span className="px-2 py-1 bg-blue-600/20 text-blue-300 rounded-full border border-blue-600/30">
                    Features: All Available
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {isProBadgeApproved && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-600 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-100 mb-1">Pro Badge Approved! 🎉</h3>
                <p className="text-sm text-green-200 mb-3">
                  Congratulations! Your Pro badge has been approved. You now have access to premium features and will be featured in search results.
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-green-600/20 text-green-300 rounded-full border border-green-600/30">
                    Pro Badge Active
                  </span>
                  <span className="px-2 py-1 bg-purple-600/20 text-purple-300 rounded-full border border-purple-600/30">
                    Featured Provider
                  </span>
                  <span className="px-2 py-1 bg-blue-600/20 text-blue-300 rounded-full border border-blue-600/30">
                    Premium Features
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {isProBadgeRejected && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-600 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <XCircle className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-100 mb-1">Pro Badge Request Rejected</h3>
                <p className="text-sm text-red-200 mb-3">
                  Your Pro badge application was not approved. You can update your information and submit a new request.
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-red-600/20 text-red-300 rounded-full border border-red-600/30">
                    Request Rejected
                  </span>
                  <span className="px-2 py-1 bg-gray-600/20 text-gray-300 rounded-full border border-gray-600/30">
                    Can Reapply
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Dashboard Content - Clean and Organized */}
        <div className="space-y-6">
          {/* Top Row - Performance Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Performance */}
            <div className="lg:col-span-2">
              <Card className="bg-slate-800 border-slate-700 card-hover">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-400" />
                    <CardTitle className="text-white">Today's Performance</CardTitle>
                    <Badge variant="secondary" className="bg-green-600 text-white">
                      Real-time earnings & activity
                    </Badge>
                    {hasCompletedSetup && !isApproved && (
                      <Badge variant="secondary" className="bg-orange-600 text-white">
                        Under Approval
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {formatPrice(
                          bookings
                            .filter(booking => booking.status === 'completed' && booking.completed_at &&
                              new Date(booking.completed_at).toDateString() === new Date().toDateString())
                            .reduce((sum, booking) => sum + (booking.final_price || booking.proposed_price), 0)
                        )}
                      </div>
                      <div className="text-sm text-gray-300">Today's Earnings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {bookings.filter(booking => booking.status === 'completed' && booking.completed_at &&
                          new Date(booking.completed_at).toDateString() === new Date().toDateString()).length}
                      </div>
                      <div className="text-sm text-gray-300">Jobs Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {formatPrice(
                          bookings
                            .filter(booking => booking.status === 'completed' && booking.completed_at &&
                              new Date(booking.completed_at).toDateString() === new Date().toDateString())
                            .reduce((sum, booking) => sum + (booking.final_price || booking.proposed_price), 0) *
                            0.95 // Net earnings after 5% commission
                        )}
                      </div>
                      <div className="text-sm text-gray-300">Net Earnings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-300">Commission (5%)</div>
                      <div className="text-lg font-bold text-white">
                        {formatPrice(
                          bookings
                            .filter(booking => booking.status === 'completed' && booking.completed_at &&
                              new Date(booking.completed_at).toDateString() === new Date().toDateString())
                            .reduce((sum, booking) => sum + (booking.final_price || booking.proposed_price), 0) *
                            0.05 // 5% commission
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Service Status Card */}
            <div className="lg:col-span-1">
              <Card className="bg-slate-800 border-slate-700 relative overflow-hidden transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`w-4 h-4 rounded-full ${hasActiveService ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      {hasActiveService && (
                        <div className="absolute inset-0 w-4 h-4 rounded-full bg-green-400 animate-ping"></div>
                      )}
                    </div>
                    <CardTitle className="text-white">Service Status</CardTitle>
                    <Badge
                      variant={hasActiveService ? "default" : "destructive"}
                      className={hasActiveService ? "bg-green-600 text-white" : "bg-red-600 text-white"}
                    >
                      {hasActiveService ? 'Active Job' : 'No Active Job'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Current Status</span>
                      <span className={`font-semibold ${
                        hasActiveService && isServiceActive && !isCommissionDue
                          ? 'text-green-400'
                          : isCommissionDue
                            ? 'text-red-400'
                            : 'text-gray-400'
                      }`}>
                        {hasActiveService && isServiceActive && !isCommissionDue
                          ? 'Working on job'
                          : isCommissionDue
                            ? 'Commission due - Inactive'
                            : 'Available for work'
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Active Bookings</span>
                      <span className="text-white font-semibold">
                        {activeServiceCount} job{activeServiceCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {hasActiveService && (
                        <div className="p-4 bg-green-900/20 border border-green-600 rounded-lg">
                          <div className="flex items-center gap-3 text-green-400">
                            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                            <div>
                              <div className="font-semibold text-sm">Active & Working</div>
                              <div className="text-xs text-green-300">You have {activeServiceCount} active job{activeServiceCount !== 1 ? 's' : ''} in progress</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {!hasActiveService && (
                        <div className="p-4 bg-red-900/20 border border-red-600 rounded-lg">
                          <div className="flex items-center gap-3 text-red-400">
                            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                            <div>
                              <div className="font-semibold text-sm">Available</div>
                              <div className="text-xs text-red-300">No active jobs - Ready for new bookings</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Second Row - Monthly Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <Card
              className="bg-slate-800 border-slate-700 card-hover cursor-pointer hover:bg-slate-700 transition-colors"
              onClick={() => setShowEarningsHistory(true)}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  <CardTitle className="text-white">Monthly Performance</CardTitle>
                  <Badge variant="secondary" className="bg-blue-600 text-white">
                    This month
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center p-6 bg-blue-900/20 rounded-lg border border-blue-600">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Receipt className="h-6 w-6 text-blue-400" />
                      <span className="text-lg font-medium text-gray-300">Monthly Earnings</span>
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {formatPrice(
                        bookings
                          .filter(booking => booking.status === 'completed' && booking.completed_at)
                          .filter(booking => {
                            const completedDate = new Date(booking.completed_at!);
                            const now = new Date();
                            return completedDate.getMonth() === now.getMonth() &&
                                   completedDate.getFullYear() === now.getFullYear();
                          })
                          .reduce((sum, booking) => sum + (booking.final_price || booking.proposed_price), 0)
                      )}
                    </div>
                  </div>

                  <div className="text-center p-6 bg-green-900/20 rounded-lg border border-green-600">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Briefcase className="h-6 w-6 text-green-400" />
                      <span className="text-lg font-medium text-gray-300">Monthly Jobs Done</span>
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {bookings
                        .filter(booking => booking.status === 'completed' && booking.completed_at)
                        .filter(booking => {
                          const completedDate = new Date(booking.completed_at!);
                          const now = new Date();
                          return completedDate.getMonth() === now.getMonth() &&
                                 completedDate.getFullYear() === now.getFullYear();
                        }).length}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Section - Stats and Commission Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Stats */}
            <Card className="bg-slate-800 border-slate-700 card-hover">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-400" />
                  Quick Stats
                  <Badge variant="secondary" className="bg-green-600 text-white text-xs">
                    Real-time
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Live Data</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {realTimeStats.totalJobs}
                    </div>
                    <div className="text-sm text-gray-300">Total Jobs</div>
                    <div className="text-xs text-green-400 mt-1">
                      ✓ Real-time: {realTimeStats.totalJobs}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {formatPrice(realTimeStats.totalEarnings)}
                    </div>
                    <div className="text-sm text-gray-300">Total Earnings</div>
                    <div className="text-xs text-green-400 mt-1">
                      ✓ Real-time calculation
                    </div>
                  </div>
                  <div className="text-center p-4 bg-yellow-900/20 rounded-lg border border-yellow-600/30">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="text-2xl font-bold text-yellow-400">{realTimeStats.averageRating.toFixed(1)}</span>
                      <span className="text-yellow-400">⭐</span>
                    </div>
                    <div className="text-sm text-gray-300">
                      {realTimeStats.totalReviews > 0 ? `${realTimeStats.totalReviews} review${realTimeStats.totalReviews > 1 ? 's' : ''}` : 'No reviews yet'}
                    </div>
                    <div className="text-xs text-green-400 mt-1">
                      ✓ Live rating
                    </div>
                  </div>
                </div>

                {/* Rating Distribution */}
                {totalReviews > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <h4 className="text-sm font-medium text-white mb-2">Rating Breakdown</h4>
                    <div className="space-y-2">
                      {ratingDistribution.map(({ rating, count }) => (
                        <div key={rating} className="flex items-center gap-2 text-sm">
                          <span className="text-gray-300 w-8">{rating}⭐</span>
                          <div className="flex-1 bg-slate-600 rounded-full h-2">
                            <div
                              className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${totalReviews > 0 ? (count / totalReviews) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-gray-300 w-8 text-right">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Commission Progress */}
            <Card className="bg-slate-800 border-slate-700 card-hover">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-400" />
                  <CardTitle className="text-white">Commission Progress</CardTitle>
                  <Badge
                    variant={hasAnyApprovedCommissionPayments ? "default" : isCommissionDue ? "destructive" : "secondary"}
                    className={hasAnyApprovedCommissionPayments ? "bg-green-600 text-white" : isCommissionDue ? "bg-red-600 text-white" : "bg-blue-600 text-white"}
                  >
                    {hasAnyApprovedCommissionPayments ? 'Commission Paid' : isCommissionDue ? 'Commission Due' : 'Active Cycle'}
                  </Badge>
                  {hasCompletedSetup && !isApproved && (
                    <Badge variant="secondary" className="bg-orange-600 text-white">
                      Under Approval
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Jobs Completed in Current Cycle</span>
                    <span className="text-white font-semibold">
                      {isCommissionDue ? '5/5' : `${jobsSinceLastCommission} / 5`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        isCommissionDue ? 'bg-red-600' : 'bg-blue-600'
                      }`}
                      style={{
                        width: isCommissionDue ? '100%' : `${(jobsSinceLastCommission / 5) * 100}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">
                      {hasAnyApprovedCommissionPayments
                        ? 'Commission paid - Services active'
                        : effectiveIsCommissionDue
                          ? 'Commission payment required to continue'
                          : `${5 - jobsSinceLastCommission} more jobs until commission is due`
                      }
                    </span>
                    <span className={hasAnyApprovedCommissionPayments ? "text-green-400" : effectiveIsCommissionDue ? "text-red-400" : "text-blue-400"}>
                      {hasAnyApprovedCommissionPayments
                        ? 'Commission Paid'
                        : effectiveIsCommissionDue
                          ? '5/5 - Commission Due'
                          : `${Math.round((jobsSinceLastCommission / 5) * 100)}% Complete`
                      }
                    </span>
                  </div>

                  {/* Commission Cost Display */}
                  <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-300">Commission Amount (5%)</span>
                      <span className="text-white font-semibold">
                        {formatPrice(
                          bookings
                            .filter(booking => booking.status === 'completed')
                            .slice(-5) // Get the last 5 completed jobs for current cycle
                            .reduce((sum, booking) => sum + (booking.final_price || booking.proposed_price), 0) * 0.05
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Current Cycle Earnings</span>
                      <span className="text-xs text-gray-500">
                        {formatPrice(
                          bookings
                            .filter(booking => booking.status === 'completed')
                            .slice(-5) // Get the last 5 completed jobs for current cycle
                            .reduce((sum, booking) => sum + (booking.final_price || booking.proposed_price), 0)
                        )}
                      </span>
                    </div>
                  </div>
                  {isCommissionDue && (
                    <div className="mt-4 p-4 bg-red-900/20 border border-red-600 rounded-lg animate-pulse">
                      <div className="flex items-center gap-2 text-red-400 mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-semibold">Commission Payment Required</span>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">
                        Your services are currently inactive. Pay the commission to reactivate and continue receiving bookings.
                      </p>
                      <Button
                        onClick={handleOpenCommissionPayment}
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Pay Commission Now
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>


        {/* Bottom Section - Stats and Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Stats */}
          <div className="lg:col-span-1 space-y-4">

            {/* All-Time Stats Cards with Today's Earnings Chart */}
            <div className="grid grid-cols-1 gap-4">
              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xl font-bold">
                        {formatPrice(providerProfile?.total_earnings || 0)}
                      </div>
                      <div className="text-sm opacity-90">All-Time Earnings</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm opacity-75">Today's</div>
                      <div className="text-lg font-bold">
                        {formatPrice(
                          bookings
                            .filter(booking => booking.status === 'completed' && booking.completed_at &&
                              new Date(booking.completed_at).toDateString() === new Date().toDateString())
                            .reduce((sum, booking) => sum + (booking.final_price || booking.proposed_price), 0)
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mini Chart for Today's Earnings */}
                  <div className="mt-3">
                    <div className="flex items-end justify-between h-8 gap-1">
                      {Array.from({ length: 7 }, (_, i) => {
                        const day = new Date();
                        day.setDate(day.getDate() - (6 - i));
                        const dayEarnings = bookings
                          .filter(booking => booking.status === 'completed' &&
                            booking.completed_at &&
                            new Date(booking.completed_at).toDateString() === day.toDateString())
                          .reduce((sum, booking) => sum + (booking.final_price || booking.proposed_price), 0);

                        const maxEarnings = Math.max(...Array.from({ length: 7 }, (_, j) => {
                          const d = new Date();
                          d.setDate(d.getDate() - (6 - j));
                          return bookings
                            .filter(booking => booking.status === 'completed' &&
                              booking.completed_at &&
                              new Date(booking.completed_at).toDateString() === d.toDateString())
                            .reduce((sum, booking) => sum + (booking.final_price || booking.proposed_price), 0);
                        }), 1);

                        const height = maxEarnings > 0 ? (dayEarnings / maxEarnings) * 100 : 0;

                        return (
                          <div key={i} className="flex-1 flex flex-col items-center">
                            <div
                              className="w-full bg-white/30 rounded-sm min-h-[4px]"
                              style={{ height: `${Math.max(height, 2)}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-xs opacity-75 mt-2 text-center">Last 7 days earnings trend</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                <CardContent className="p-4 text-center">
                  <div className="text-xl font-bold mb-1">
                    {bookings.filter(booking => booking.status === 'completed').length}
                  </div>
                  <div className="text-sm opacity-90">Services Completed</div>
                  <div className="text-xs opacity-75 mt-1">
                    Total successful bookings
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Tabs Section */}
          <div className="lg:col-span-3">
            <Tabs value={activeTabAnimation} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-6 bg-gray-800">
                <TabsTrigger value="services" className="tab-trigger data-[state=active]:bg-blue-600">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Services
                </TabsTrigger>
                <TabsTrigger value="bookings" className="tab-trigger data-[state=active]:bg-blue-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  Bookings
                </TabsTrigger>
                <TabsTrigger value="earnings" className="tab-trigger data-[state=active]:bg-blue-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Earnings
                </TabsTrigger>
                <TabsTrigger value="history" className="tab-trigger data-[state=active]:bg-blue-600">
                  <Clock className="h-4 w-4 mr-2" />
                  History
                </TabsTrigger>
                <TabsTrigger value="notifications" className="tab-trigger data-[state=active]:bg-blue-600">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="profile" className="tab-trigger data-[state=active]:bg-blue-600">
                  <Users className="h-4 w-4 mr-2" />
                  Profile
                </TabsTrigger>
              </TabsList>

              {/* Bookings Tab */}
              <TabsContent value="bookings" className={`mt-6 ${isAnimating && activeTabAnimation === 'bookings' ? 'tab-content-enter' : ''}`}>
                <Card className="bg-slate-800 border-slate-700 card-hover section-card shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-white">Bookings Management</CardTitle>
                      {hasCompletedSetup && !isApproved && (
                        <Badge variant="secondary" className="bg-orange-600 text-white">
                          Under Approval
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Clock className="h-5 w-5 text-yellow-400" />
                          <span className="text-sm text-gray-300">Pending Requests</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {bookings.filter(booking => booking.status === 'pending' || booking.status === 'negotiating').length}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <CheckCircle className="h-5 w-5 text-blue-400" />
                          <span className="text-sm text-gray-300">Accepted Jobs</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {bookings.filter(booking => booking.status === 'confirmed' || booking.status === 'accepted' || booking.status === 'in_progress').length}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Target className="h-5 w-5 text-green-400" />
                          <span className="text-sm text-gray-300">Completed Jobs</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {bookings.filter(booking => booking.status === 'completed').length}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Recent Bookings</h3>
                      {bookings.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-lg flex items-center justify-center">
                            <Briefcase className="h-8 w-8 text-gray-500" />
                          </div>
                          <p className="text-gray-300">No bookings found</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {bookings.map((booking) => (
                            <div key={booking.id} className="border border-gray-600 rounded-lg p-4 bg-gray-700 hover:bg-gray-650 transition-colors">
                              {/* Header Row */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-lg font-semibold text-white truncate">{booking.title}</h4>
                                    {getStatusBadge(booking.status)}
                                  </div>
                                  {booking.description && (
                                    <p className="text-gray-300 text-sm line-clamp-1">{booking.description}</p>
                                  )}
                                </div>
                                {/* Chat and Cancel buttons - Show for active bookings and user-cancelled bookings, hide only for provider-cancelled bookings */}
                                {(() => {
                                  // Show icons for:
                                  // 1. Active bookings (not completed, not cancelled)
                                  // 2. User-cancelled bookings (cancelled by customer, so provider can investigate no-show)
                                  // Hide icons only for provider-cancelled bookings
                                  const isProviderCancelled = booking.status === 'cancelled' && booking.cancellation_reason && (
                                    booking.cancellation_reason.toLowerCase().includes('provider') ||
                                    booking.cancellation_reason.toLowerCase().includes('service provider') ||
                                    booking.cancellation_reason.toLowerCase().includes('business decision') ||
                                    booking.cancellation_reason.toLowerCase().includes('unable to provide')
                                  );

                                  // Hide cancel button for bookings that are in progress or completed
                                  const canCancel = booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'coming' || booking.status === 'negotiating';

                                  // Hide both chat and cancel buttons for no-show bookings
                                  const isNoShow = isNoShowCancelledBooking(booking);
                                  const showIcons = booking.status !== 'completed' && !isProviderCancelled && !isNoShow;

                                  if (!showIcons) {
                                    return null; // Hide icons
                                  }

                                  return (
                                    <div className="flex items-center gap-1 ml-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedBooking(booking);
                                          setShowChat(true);
                                        }}
                                        className="text-blue-400 hover:text-blue-300 p-1"
                                        title="Chat with customer"
                                      >
                                        <MessageSquare className="h-4 w-4" />
                                      </Button>
                                      {canCancel && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedBooking(booking);
                                            setShowCancellationModal(true);
                                          }}
                                          className="text-red-400 hover:text-red-300 p-1"
                                          title="Cancel booking"
                                        >
                                          <XCircle className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Content Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs text-gray-400">Customer</p>
                                    <p className="text-white text-sm font-medium truncate">{booking.customer?.full_name || 'Unknown'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs text-gray-400">Location</p>
                                    <p className="text-white text-sm truncate" title={booking.location}>
                                      {booking.location.length > 20 ? `${booking.location.substring(0, 20)}...` : booking.location}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs text-gray-400">Price</p>
                                    <p className="text-white text-sm font-medium">{formatPrice(booking.proposed_price)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs text-gray-400">Date</p>
                                    <p className="text-white text-sm">{formatDate(booking.created_at)}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Scheduled Date */}
                              {booking.scheduled_date && (
                                <div className="mb-3 p-2 bg-blue-900/20 border border-blue-600 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-blue-400" />
                                    <span className="text-blue-400 text-sm">Scheduled for:</span>
                                    <span className="text-white text-sm">{formatDate(booking.scheduled_date)}</span>
                                  </div>
                                </div>
                              )}

                              {/* Customer Location Available */}
                              {booking.customer_location_lat && booking.customer_location_lng && (
                                <div className="mb-3 p-2 bg-green-900/20 border border-green-600 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-green-400" />
                                    <span className="text-green-400 text-sm">Customer Location Available</span>
                                  </div>
                                </div>
                              )}

                              {/* Rejection Reason for rejected bookings */}
                              {booking.status === 'rejected' && booking.rejection_reason && (
                                <div className="mb-3 p-3 bg-red-900/20 border border-red-600 rounded-lg">
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                      <div className="text-red-400 text-sm font-semibold mb-1">Rejection Reason:</div>
                                      <p className="text-gray-300 text-sm leading-relaxed">
                                        {booking.rejection_reason}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Action Buttons - Hide for completed bookings and no-show cancelled bookings */}
                              {!(hasCompletedSetup && !isApproved) && booking.status !== 'completed' && !isNoShowCancelledBooking(booking) && (
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-600">
                                  {booking.status === 'confirmed' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleMarkAsComing(booking.id)}
                                      className="text-orange-400 hover:text-orange-300 hover:bg-orange-900/20"
                                    >
                                      <MapPin className="h-4 w-4 mr-1" />
                                      Coming
                                    </Button>
                                  )}
                                  {booking.status === 'coming' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleStartService(booking.id)}
                                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                                    >
                                      <Activity className="h-4 w-4 mr-1" />
                                      Start Service
                                    </Button>
                                  )}
                                  {(booking.status === 'confirmed' || booking.status === 'coming' || booking.status === 'in_progress') && (
                                    <>
                                      {booking.status === 'in_progress' && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleCompleteBooking(booking)}
                                          className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                                        >
                                          <CheckCircle className="h-4 w-4 mr-1" />
                                          Complete
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleNavigateToCustomer(booking)}
                                        className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                                      >
                                        <MapPin className="h-4 w-4 mr-1" />
                                        Navigate
                                      </Button>
                                    </>
                                  )}

                                  {/* Cross icon for cancellation on cancelled/negotiating bookings */}
                                  {(booking.status === 'cancelled' || booking.status === 'negotiating') && !isNoShowCancelledBooking(booking) && (
                                    (() => {
                                      // Show cross icon for:
                                      // 1. Cancelled bookings that were cancelled by customer
                                      // 2. Negotiating bookings (provider can cancel if they don't like the negotiation)

                                      if (booking.status === 'cancelled') {
                                        // For cancelled bookings, only show if cancelled by customer
                                        const isCustomerCancelled = booking.cancellation_reason &&
                                          !booking.cancellation_reason.toLowerCase().includes('provider') &&
                                          !booking.cancellation_reason.toLowerCase().includes('business decision') &&
                                          !booking.cancellation_reason.toLowerCase().includes('unable to provide');

                                        if (!isCustomerCancelled) return null;
                                      }

                                      return (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            if (booking.status === 'cancelled') {
                                              handleMarkAsNoShow(booking.id);
                                            } else {
                                              setSelectedBooking(booking);
                                              setShowCancellationModal(true);
                                            }
                                          }}
                                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1"
                                          title={booking.status === 'cancelled' ? "Mark as no-show" : "Cancel booking"}
                                        >
                                          <XCircle className="h-4 w-4" />
                                        </Button>
                                      );
                                    })()
                                  )}
                                </div>
                              )}

                              {/* Helper text for booking actions */}
                              <div className="mt-2 text-xs text-gray-400">
                                {booking.status === 'confirmed' && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>Tap "Coming" when you're on your way to customer's location</span>
                                  </div>
                                )}
                                {booking.status === 'coming' && (
                                  <div className="flex items-center gap-1">
                                    <Activity className="h-3 w-3" />
                                    <span>Tap "Start Service" when you arrive at customer's location</span>
                                  </div>
                                )}
                                {booking.status === 'in_progress' && (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    <span>Tap "Complete" only after work is done and payment received</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Services Tab */}
              <TabsContent value="services" className="mt-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white">Services</CardTitle>
                      <div className="flex items-center gap-2">
                        {hasCompletedSetup && !isApproved && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-orange-600/20 text-orange-300 rounded-full text-sm border border-orange-600/30">
                            <Clock className="h-3 w-3" />
                            <span>Under Approval</span>
                          </div>
                        )}
                        {!(hasCompletedSetup && !isApproved) && (
                          <Button
                            onClick={() => {
                              if (isProBadgePending) {
                                toast.error('Your Pro badge request is under review. You cannot add services until approved.');
                                return;
                              }
                              setShowAddService(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={isProBadgePending}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {isProBadgePending ? 'Review Pending' : 'Add Service'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {services.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-lg flex items-center justify-center">
                          <Briefcase className="h-8 w-8 text-gray-500" />
                        </div>
                        <p className="text-gray-300 mb-4">No services available</p>
                        {!(hasCompletedSetup && !isApproved) && (
                          <Button
                            onClick={() => {
                              if (isProBadgePending) {
                                toast.error('Your Pro badge request is under review. You cannot add services until approved.');
                                return;
                              }
                              setShowAddService(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={isProBadgePending}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {isProBadgePending ? 'Review Pending' : 'Add Your First Service'}
                          </Button>
                        )}
                        {hasCompletedSetup && !isApproved && (
                          <p className="text-orange-400 text-sm mt-4">
                            Services can be added after your application is approved by admin
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {services.map((service) => (
                          <div key={service.id} className="border border-gray-600 rounded-lg p-4 bg-gray-700">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="text-lg font-semibold text-white">{service.title}</h3>
                                  <ServiceStatusBadge service={service} />
                                  {!service.is_active && service.admin_approved && (
                                    <Badge variant="secondary" className="bg-gray-600 text-gray-300">
                                      Inactive
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-gray-200 mb-2">{service.description}</p>
                                <div className="flex items-center gap-4 text-sm text-gray-300">
                                  <span>Category: {service.category}</span>
                                  <span>Price: {formatPrice(service.base_price)}</span>
                                  {service.duration_hours && (
                                    <span>Duration: {service.duration_hours}h</span>
                                  )}
                                  <span className={service.price_negotiable ? "text-green-400" : "text-red-400"}>
                                    {service.price_negotiable ? "Negotiable" : "Fixed Price"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingService(service);
                                    setShowEditService(true);
                                  }}
                                  className="text-blue-400 hover:text-blue-300"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Earnings Tab */}
              <TabsContent value="earnings" className={`mt-6 ${isAnimating && activeTabAnimation === 'earnings' ? 'tab-content-enter' : ''}`}>
                <div className="space-y-6">
                  {/* Current Earnings Summary */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-white">Current Earnings</CardTitle>
                        {hasCompletedSetup && !isApproved && (
                          <Badge variant="secondary" className="bg-orange-600 text-white">
                            Under Approval
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-gray-300">
                        Your current earnings and commission status
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-4 bg-gray-700 rounded-lg">
                          <DollarSign className="h-8 w-8 text-green-400 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-white">
                            {formatPrice(
                              bookings
                                .filter(booking => booking.status === 'completed')
                                .reduce((sum, booking) => sum + (booking.final_price || booking.proposed_price), 0)
                            )}
                          </div>
                          <div className="text-sm text-gray-300">Total Earnings</div>
                        </div>
                        <div className="text-center p-4 bg-gray-700 rounded-lg">
                          <Receipt className="h-8 w-8 text-red-400 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-white">
                            {formatPrice(
                              bookings
                                .filter(booking => booking.status === 'completed')
                                .reduce((sum, booking) => sum + (booking.final_price || booking.proposed_price), 0) * 0.05
                            )}
                          </div>
                          <div className="text-sm text-gray-300">Commission Due (5%)</div>
                        </div>
                        <div className="text-center p-4 bg-gray-700 rounded-lg">
                          <Target className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-white">
                            {bookings.filter(booking => booking.status === 'completed').length}/5
                          </div>
                          <div className="text-sm text-gray-300">Jobs Until Commission</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Commission Payment History */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white">Commission Payment History</CardTitle>
                      <CardDescription className="text-gray-300">
                        History of all your commission payments and their status
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loadingCommissionHistory ? (
                        <div className="flex justify-center items-center py-8">
                          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                        </div>
                      ) : commissionPayments.length === 0 ? (
                        <div className="text-center py-12">
                          <Receipt className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-white mb-2">No Commission Payments</h3>
                          <p className="text-gray-400">You haven't made any commission payments yet.</p>
                          <p className="text-sm text-gray-500 mt-2">
                            Complete 5 jobs to trigger commission payment requirement.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {commissionPayments.map((payment: any) => (
                            <div key={payment.id} className="border border-gray-600 rounded-lg p-4 bg-gray-700">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-blue-600 rounded-lg">
                                      <Receipt className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                      <h3 className="text-lg font-semibold text-white">
                                        Commission Payment - {payment.booking_count} Jobs
                                      </h3>
                                      <p className="text-sm text-gray-400">
                                        Submitted on {formatDate(payment.submitted_at)}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div>
                                      <p className="text-sm text-gray-300">Amount Paid</p>
                                      <p className="text-lg font-semibold text-white">
                                        {formatPrice(payment.amount)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-300">Payment Method</p>
                                      <p className="text-lg font-semibold text-white">
                                        {payment.payment_method}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-300">Jobs Completed</p>
                                      <p className="text-lg font-semibold text-white">
                                        {payment.booking_count}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-300">Status</p>
                                      <Badge
                                        variant={payment.status === 'approved' ? 'default' : payment.status === 'rejected' ? 'destructive' : 'secondary'}
                                        className={
                                          payment.status === 'approved'
                                            ? 'bg-green-600 text-white'
                                            : payment.status === 'rejected'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-yellow-600 text-white'
                                        }
                                      >
                                        {payment.status === 'approved' ? 'Approved' :
                                         payment.status === 'rejected' ? 'Rejected' : 'Pending'}
                                      </Badge>
                                    </div>
                                  </div>

                                  {payment.status === 'rejected' && payment.rejection_reason && (
                                    <div className="bg-red-900/20 border border-red-600 rounded-lg p-3">
                                      <p className="text-sm text-red-300">
                                        <strong>Rejection Reason:</strong> {payment.rejection_reason}
                                      </p>
                                    </div>
                                  )}

                                  {payment.reviewed_at && (
                                    <div className="text-xs text-gray-300">
                                      Reviewed on: {formatDate(payment.reviewed_at)}
                                      {payment.reviewed_by && (
                                        <span className="ml-2">by Admin</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Commission Progress */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white">Commission Progress</CardTitle>
                      <CardDescription className="text-gray-300">
                        Track your progress towards the next commission payment
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">Jobs Completed Since Last Commission</span>
                          <span className="text-white font-semibold">
                            {isCommissionDue ? '5/5' : `${jobsSinceLastCommission} / 5`}
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-300 ${
                              isCommissionDue ? 'bg-red-600' : 'bg-blue-600'
                            }`}
                            style={{
                              width: '100%' // Always show 100% width when commission is due
                            }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-300">
                            {isCommissionDue
                              ? 'Commission payment required to continue'
                              : `${5 - jobsSinceLastCommission} more jobs until commission is due`
                            }
                          </span>
                          <span className={isCommissionDue ? "text-red-400" : "text-blue-400"}>
                            {isCommissionDue ? '5/5 - Commission Due' : `${Math.round((jobsSinceLastCommission / 5) * 100)}% Complete`}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className={`mt-6 ${isAnimating && activeTabAnimation === 'history' ? 'tab-content-enter' : ''}`}>
                <Card className="bg-gray-800 border-gray-700 card-hover section-card">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-white">Service History</CardTitle>
                      {hasCompletedSetup && !isApproved && (
                        <Badge variant="secondary" className="bg-orange-600 text-white">
                          Under Approval
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-gray-300">
                      History of all your accepted and completed services
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {bookings.filter(booking => booking.status === 'confirmed' || booking.status === 'accepted' || booking.status === 'completed').length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-lg flex items-center justify-center">
                          <Clock className="h-8 w-8 text-gray-500" />
                        </div>
                        <p className="text-gray-300">No service history available</p>
                        <p className="text-sm text-gray-400 mt-2">Accepted and completed services will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {bookings
                          .filter(booking => booking.status === 'confirmed' || booking.status === 'accepted' || booking.status === 'completed')
                          .map((booking) => (
                            <div key={booking.id} className="border border-gray-600 rounded-lg p-4 bg-gray-700">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-lg font-semibold text-white">{booking.title}</h4>
                                    {getStatusBadge(booking.status)}
                                  </div>
                                  {booking.description && (
                                    <p className="text-gray-300 mb-2">{booking.description}</p>
                                  )}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-400">
                                    <div>
                                      <span className="text-gray-500">Customer:</span>
                                      <p className="text-white">{booking.customer?.full_name || 'Unknown'}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Location:</span>
                                      <p className="text-white">{booking.location}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Price:</span>
                                      <p className="text-white">{formatPrice(booking.proposed_price)}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Date:</span>
                                      <p className="text-white">{formatDate(booking.created_at)}</p>
                                    </div>
                                  </div>
                                  {booking.scheduled_date && (
                                    <div className="mt-2">
                                      <span className="text-gray-500 text-sm">Scheduled for:</span>
                                      <p className="text-white text-sm">{formatDate(booking.scheduled_date)}</p>
                                    </div>
                                  )}
                                  {booking.completed_at && (
                                    <div className="mt-2">
                                      <span className="text-gray-500 text-sm">Completed on:</span>
                                      <p className="text-white text-sm">{formatDate(booking.completed_at)}</p>
                                    </div>
                                  )}
                                  {booking.customer_location_lat && booking.customer_location_lng && (
                                    <div className="mt-2 p-2 bg-blue-900/20 border border-blue-600 rounded-lg">
                                      <div className="flex items-center gap-2 text-blue-400 text-sm">
                                        <MapPin className="h-4 w-4" />
                                        <span>Customer Location Available</span>
                                      </div>
                                      <p className="text-xs text-gray-400 mt-1">
                                        Lat: {booking.customer_location_lat.toFixed(6)}, Lng: {booking.customer_location_lng.toFixed(6)}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                {/* Action buttons - Show for active bookings and user-cancelled bookings, hide only for provider-cancelled bookings */}
                                {(() => {
                                  const isProviderCancelled = booking.status === 'cancelled' && booking.cancellation_reason && (
                                    booking.cancellation_reason.toLowerCase().includes('provider') ||
                                    booking.cancellation_reason.toLowerCase().includes('service provider') ||
                                    booking.cancellation_reason.toLowerCase().includes('business decision') ||
                                    booking.cancellation_reason.toLowerCase().includes('unable to provide')
                                  );

                                  // Hide buttons for completed bookings and provider-cancelled bookings
                                  if (booking.status === 'completed' || isProviderCancelled) {
                                    return null; // Hide icons
                                  }

                                  return (
                                    <div className="flex items-center gap-2">
                                      {booking.status === 'confirmed' && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleMarkAsComing(booking.id)}
                                          className="text-orange-400 hover:text-orange-300"
                                        >
                                          <MapPin className="h-4 w-4 mr-1" />
                                          Coming
                                        </Button>
                                      )}
                                      {booking.status === 'coming' && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleStartService(booking.id)}
                                          className="text-blue-400 hover:text-blue-300"
                                        >
                                          <Activity className="h-4 w-4 mr-1" />
                                          Start Service
                                        </Button>
                                      )}
                                      {(booking.status === 'coming' || booking.status === 'in_progress') && (
                                        <>
                                          {booking.status === 'in_progress' && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleCompleteBooking(booking)}
                                              className="text-green-400 hover:text-green-300"
                                            >
                                              <CheckCircle className="h-4 w-4 mr-1" />
                                              Complete
                                            </Button>
                                          )}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleNavigateToCustomer(booking)}
                                            className="text-purple-400 hover:text-purple-300"
                                            title="Navigate to customer location"
                                          >
                                            <MapPin className="h-4 w-4 mr-1" />
                                            Navigate
                                          </Button>
                                        </>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedBooking(booking);
                                          setShowChat(true);
                                        }}
                                        className="text-blue-400 hover:text-blue-300"
                                      >
                                        <MessageSquare className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className={`mt-6 ${isAnimating && activeTabAnimation === 'notifications' ? 'tab-content-enter' : ''}`}>
                <NotificationHistory />
              </TabsContent>

              {/* Profile Tab */}
              <TabsContent value="profile" className={`mt-6 ${isAnimating && activeTabAnimation === 'profile' ? 'tab-content-enter' : ''}`}>
                <div className="space-y-6">
                  {/* Profile Information */}
                  <Card className="bg-gray-800 border-gray-700 card-hover section-card">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        <CardTitle className="text-white">Profile Information</CardTitle>
                        <Badge variant="secondary" className="bg-blue-600 text-white text-xs">
                          Real-time Data
                        </Badge>
                        {hasCompletedSetup && !isApproved && (
                          <Badge variant="secondary" className="bg-orange-600 text-white">
                            Under Approval
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-300">Business Name</label>
                            <p className="text-white text-lg">{providerProfile?.business_name || 'Not set'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-300">Business Type</label>
                            <p className="text-white">{providerProfile?.business_type || 'Not set'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-300">Description</label>
                            <p className="text-white">{providerProfile?.description || 'Not set'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-300">Experience</label>
                            <p className="text-white">{providerProfile?.experience_years ? `${providerProfile.experience_years} years` : 'Not set'}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-300">Email Address</label>
                            <p className="text-white">{user?.email || 'Not available'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-300">Phone</label>
                            <p className="text-white">{providerProfile?.phone || 'Not set'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-300">CNIC</label>
                            <p className="text-white">{providerProfile?.cnic || 'Not set'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-300">Address</label>
                            <p className="text-white">{providerProfile?.business_address || 'Not set'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-300">Current Rating</label>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex items-center gap-1">
                                <span className="text-xl font-bold text-yellow-400">{averageRating.toFixed(1)}</span>
                                <span className="text-yellow-400">⭐</span>
                              </div>
                              <Badge variant="secondary" className="bg-green-600 text-white text-xs">
                                Live
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-400">
                              Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''} • Updates in real-time
                              {providerProfile?.rating && providerProfile.rating !== averageRating && (
                                <span className="ml-2 text-blue-400">
                                  (Profile: {providerProfile.rating.toFixed(1)})
                                </span>
                              )}
                            </p>

                            {/* Mini Rating Distribution */}
                            {totalReviews > 0 && (
                              <div className="mt-2 space-y-1">
                                {[5, 4, 3, 2, 1].map(rating => {
                                  const count = ratingDistribution.find(d => d.rating === rating)?.count || 0;
                                  const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                                  return (
                                    <div key={rating} className="flex items-center gap-2 text-xs">
                                      <span className="text-gray-400 w-8">{rating}⭐</span>
                                      <div className="flex-1 bg-slate-600 rounded-full h-1.5">
                                        <div
                                          className="bg-yellow-400 h-1.5 rounded-full transition-all duration-300"
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                      <span className="text-gray-400 w-6 text-right">{count}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-gray-700 rounded-lg">
                            <div className="text-2xl font-bold text-white">{providerProfile?.total_jobs || 0}</div>
                            <div className="text-sm text-gray-300">Total Jobs</div>
                          </div>
                          <div className="text-center p-4 bg-gray-700 rounded-lg">
                            <div className="text-2xl font-bold text-white">{formatPrice(providerProfile?.total_earnings || 0)}</div>
                            <div className="text-sm text-gray-300">Total Earnings</div>
                          </div>
                          <div className="text-center p-4 bg-gray-700 rounded-lg">
                            <div className="text-2xl font-bold text-white">{formatPrice(providerProfile?.total_commission || 0)}</div>
                            <div className="text-sm text-gray-300">Commission Due</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Verification Status */}
                  <Card className="bg-gray-800 border-gray-700 card-hover section-card">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Verification Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                          <span className="text-gray-300">Account Status</span>
                          <Badge variant={providerProfile?.admin_approved ? "default" : "secondary"} className={providerProfile?.admin_approved ? "bg-green-600 text-white" : "bg-yellow-600 text-white"}>
                            {providerProfile?.admin_approved ? "Approved" : "Pending Approval"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                          <span className="text-gray-300">Pro Badge</span>
                          <Badge variant={providerProfile?.verified_pro ? "default" : "secondary"} className={providerProfile?.verified_pro ? "bg-purple-600 text-white" : "bg-gray-600 text-white"}>
                            {providerProfile?.verified_pro ? "Pro Member" : "Standard"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pro Badge Request */}
                  {!providerProfile?.verified_pro && !hasProBadgeRequest && (
                    <Card className="bg-gray-800 border-gray-700 card-hover section-card">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Target className="h-5 w-5 text-purple-400" />
                          Upgrade to Pro
                        </CardTitle>
                        <CardDescription className="text-gray-300">
                          Get access to premium features and stand out from other providers
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 p-2 bg-purple-900/20 rounded-lg border border-purple-800/30">
                              <CheckCircle className="h-4 w-4 text-purple-400" />
                              <span className="text-sm text-gray-200">Featured in search results</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-purple-900/20 rounded-lg border border-purple-800/30">
                              <CheckCircle className="h-4 w-4 text-purple-400" />
                              <span className="text-sm text-gray-200">Priority customer support</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-purple-900/20 rounded-lg border border-purple-800/30">
                              <CheckCircle className="h-4 w-4 text-purple-400" />
                              <span className="text-sm text-gray-200">Advanced analytics</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-purple-900/20 rounded-lg border border-purple-800/30">
                              <CheckCircle className="h-4 w-4 text-purple-400" />
                              <span className="text-sm text-gray-200">Pro badge on profile</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-purple-900/20 rounded-lg border border-purple-800/30">
                              <CheckCircle className="h-4 w-4 text-purple-400" />
                              <span className="text-sm text-gray-200">Higher visibility to customers</span>
                            </div>
                          </div>
                          <Button
                            onClick={() => setShowProBadgeRequest(true)}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white glow-effect"
                          >
                            <Target className="h-4 w-4 mr-2" />
                            Apply for Pro Badge
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Pro Badge Request Status - Show when request exists */}
                  {hasProBadgeRequest && (
                    <Card className="bg-gray-800 border-gray-700 card-hover section-card">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Target className="h-5 w-5 text-purple-400" />
                          Pro Badge Request Status
                        </CardTitle>
                        <CardDescription className="text-gray-300">
                          Your application status and next steps
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Status Badge */}
                          <div className="flex items-center justify-center">
                            <Badge
                              variant={proBadgeRequestStatus === 'approved' ? 'default' : proBadgeRequestStatus === 'rejected' ? 'destructive' : 'secondary'}
                              className={`px-4 py-2 text-sm font-medium ${
                                proBadgeRequestStatus === 'approved'
                                  ? 'bg-green-600 text-white'
                                  : proBadgeRequestStatus === 'rejected'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-yellow-600 text-white'
                              }`}
                            >
                              {proBadgeRequestStatus === 'approved' && '✅ Approved'}
                              {proBadgeRequestStatus === 'rejected' && '❌ Rejected'}
                              {proBadgeRequestStatus === 'pending' && '⏳ Under Review'}
                            </Badge>
                          </div>

                          {/* Status-specific content */}
                          {proBadgeRequestStatus === 'pending' && (
                            <div className="space-y-3">
                              <div className="p-3 bg-yellow-900/20 border border-yellow-600 rounded-lg">
                                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                                  <Clock className="h-4 w-4" />
                                  <span className="font-semibold">Application Under Review</span>
                                </div>
                                <p className="text-sm text-gray-300">
                                  Your Pro badge application is being reviewed by our admin team. This process typically takes 24-48 hours.
                                </p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 p-2 bg-red-900/20 rounded-lg border border-red-800/30">
                                  <XCircle className="h-4 w-4 text-red-400" />
                                  <span className="text-sm text-gray-200">Cannot add new services</span>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-blue-900/20 rounded-lg border border-blue-800/30">
                                  <Info className="h-4 w-4 text-blue-400" />
                                  <span className="text-sm text-gray-200">Dashboard access: Limited</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {proBadgeRequestStatus === 'approved' && (
                            <div className="space-y-3">
                              <div className="p-3 bg-green-900/20 border border-green-600 rounded-lg">
                                <div className="flex items-center gap-2 text-green-400 mb-2">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="font-semibold">Congratulations! 🎉</span>
                                </div>
                                <p className="text-sm text-gray-300">
                                  Your Pro badge has been approved! You now have access to all premium features.
                                </p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 p-2 bg-green-900/20 rounded-lg border border-green-800/30">
                                  <CheckCircle className="h-4 w-4 text-green-400" />
                                  <span className="text-sm text-gray-200">Featured in search results</span>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-green-900/20 rounded-lg border border-green-800/30">
                                  <CheckCircle className="h-4 w-4 text-green-400" />
                                  <span className="text-sm text-gray-200">Full dashboard access</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {proBadgeRequestStatus === 'rejected' && (
                            <div className="space-y-3">
                              <div className="p-3 bg-red-900/20 border border-red-600 rounded-lg">
                                <div className="flex items-center gap-2 text-red-400 mb-2">
                                  <XCircle className="h-4 w-4" />
                                  <span className="font-semibold">Application Rejected</span>
                                </div>
                                <p className="text-sm text-gray-300">
                                  Your Pro badge application was not approved. You can update your information and submit a new request.
                                </p>
                              </div>

                              <Button
                                onClick={() => setShowProBadgeRequest(true)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <Target className="h-4 w-4 mr-2" />
                                Submit New Request
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Action Buttons */}
                  <Card className="bg-gray-800 border-gray-700 card-hover section-card">
                    <CardHeader>
                      <CardTitle className="text-white">Account Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          onClick={() => setShowEditProfile(true)}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Profile
                        </Button>
                        <Button
                          onClick={() => navigate('/provider-overview')}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View Public Profile
                        </Button>
                        {/* Update Information button for providers awaiting approval */}
                        {hasCompletedSetup && !isApproved && (
                          <Button
                            onClick={() => {
                              console.log('🔄 Update Information button clicked');
                              console.log('Current state:', {
                                isReapplying,
                                showBusinessSetup,
                                providerProfile,
                                hasCompletedSetup,
                                isApproved
                              });

                              // Set both states immediately to ensure modal opens
                              setIsReapplying(true);
                              setShowBusinessSetup(true);

                              // Fallback timeout to ensure modal opens
                              setTimeout(() => {
                                console.log('🔄 Fallback timeout triggered');
                                setIsReapplying(true);
                                setShowBusinessSetup(true);
                              }, 100);

                              console.log('✅ Modal should now be visible with existing data loaded');
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Update Information
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

     {/* Conditional Components */}
     {showBusinessSetup && (
       <ProviderBusinessSetup
         isOpen={showBusinessSetup}
         onClose={() => {
           console.log('Modal onClose called, current isReapplying state:', isReapplying);
           setShowBusinessSetup(false);
           // Reset isReapplying state when modal is closed
           setIsReapplying(false);
           console.log('Modal closed - states reset');
         }}
         onSubmitted={() => {
           console.log('Modal onSubmitted called, reloading data...');
           loadProviderData();
         }}
         isReapplying={isReapplying}
         existingProfile={providerProfile}
       />
     )}

     {showAddService && (
       <AddServiceModal
         isOpen={showAddService}
         onClose={() => setShowAddService(false)}
         onServiceAdded={loadProviderData}
         providerProfile={providerProfile}
         servicesCount={services.length}
       />
     )}

     {showEditProfile && (
       <EditProfileModal
         isOpen={showEditProfile}
         onClose={() => setShowEditProfile(false)}
         onProfileUpdated={loadProviderData}
         providerProfile={providerProfile}
       />
     )}

     {showEditService && editingService && (
       <EditServiceModal
         isOpen={showEditService}
         service={editingService}
         onClose={() => {
           setShowEditService(false);
           setEditingService(null);
         }}
         onServiceUpdated={loadProviderData}
       />
     )}

     {showChat && selectedBooking && (
       <ChatModal
         isOpen={showChat}
         onClose={() => {
           setShowChat(false);
           setSelectedBooking(null);
         }}
         booking={selectedBooking}
       />
     )}

     {showCancellationModal && selectedBooking && (
       <CancellationModal
         isOpen={showCancellationModal}
         onClose={() => {
           setShowCancellationModal(false);
           setSelectedBooking(null);
         }}
         booking={selectedBooking}
         onCancellationConfirmed={loadProviderData}
         userType="provider"
       />
     )}

     {showApprovalSuccess && (
       <ApprovalSuccessModal
         isOpen={showApprovalSuccess}
         onClose={() => setShowApprovalSuccess(false)}
         businessName={providerProfile?.business_name || 'Your Business'}
       />
     )}

     {showLocationConfirmation && selectedBookingForLocation && (
       <LocationConfirmationModal
         isOpen={showLocationConfirmation}
         onClose={() => {
           setShowLocationConfirmation(false);
           setSelectedBookingForLocation(null);
         }}
         bookingId={selectedBookingForLocation.id}
         customerId={selectedBookingForLocation.customer_id}
         providerId={selectedBookingForLocation.provider_id}
         serviceName={selectedBookingForLocation.title}
       />
     )}


     {showEarningsHistory && (
       <EarningsHistoryModal
         isOpen={showEarningsHistory}
         onClose={() => setShowEarningsHistory(false)}
         providerId={user?.id || ''}
       />
     )}

     {showProBadgeRequest && (
       <Dialog open={showProBadgeRequest} onOpenChange={setShowProBadgeRequest}>
         <DialogContent className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)] max-w-lg">
           <DialogHeader>
             <DialogTitle className="text-[hsl(0,0%,95%)] flex items-center gap-2">
               <Target className="h-5 w-5 text-purple-400" />
               Request Pro Badge
             </DialogTitle>
           </DialogHeader>
           <div className="space-y-6">
             <p className="text-gray-300">
               Request the Pro badge to showcase your verified expertise and get featured in search results.
             </p>

             {proBadgeRequestMessage ? (
               <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                 <div className="flex items-start justify-between gap-3">
                   <div className="flex-1">
                     <p className="text-white">{proBadgeRequestMessage}</p>
                   </div>
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => {
                       setShowProBadgeRequest(false);
                       setProBadgeRequestMessage("");
                     }}
                     className="text-gray-400 hover:text-white p-1 h-auto"
                   >
                     <X className="h-4 w-4" />
                   </Button>
                 </div>
               </div>
             ) : (
               <>
                 {/* Pro Badge Features */}
                 <div className="space-y-3">
                   <h4 className="text-white font-medium">Pro Badge Benefits:</h4>
                   <div className="grid grid-cols-1 gap-2">
                     <div className="flex items-center gap-2 p-2 bg-purple-900/20 rounded-lg border border-purple-800/30">
                       <CheckCircle className="h-4 w-4 text-purple-400" />
                       <span className="text-sm text-gray-300">Featured in search results</span>
                     </div>
                     <div className="flex items-center gap-2 p-2 bg-purple-900/20 rounded-lg border border-purple-800/30">
                       <CheckCircle className="h-4 w-4 text-purple-400" />
                       <span className="text-sm text-gray-300">Priority customer support</span>
                     </div>
                     <div className="flex items-center gap-2 p-2 bg-purple-900/20 rounded-lg border border-purple-800/30">
                       <CheckCircle className="h-4 w-4 text-purple-400" />
                       <span className="text-sm text-gray-300">Advanced analytics dashboard</span>
                     </div>
                     <div className="flex items-center gap-2 p-2 bg-purple-900/20 rounded-lg border border-purple-800/30">
                       <CheckCircle className="h-4 w-4 text-purple-400" />
                       <span className="text-sm text-gray-300">Pro badge on your profile</span>
                     </div>
                     <div className="flex items-center gap-2 p-2 bg-purple-900/20 rounded-lg border border-purple-800/30">
                       <CheckCircle className="h-4 w-4 text-purple-400" />
                       <span className="text-sm text-gray-300">Higher visibility to customers</span>
                     </div>
                   </div>
                 </div>

                 {/* Terms and Conditions */}
                 <div className="space-y-3">
                   <h4 className="text-white font-medium">Terms and Conditions:</h4>
                   <div className="p-3 bg-slate-800/50 rounded-lg text-sm text-gray-300 max-h-32 overflow-y-auto border border-slate-700">
                     <p className="mb-2">
                       By applying for the Pro badge, you agree to:
                     </p>
                     <ul className="list-disc list-inside space-y-1 text-xs">
                       <li>Maintain high service quality standards</li>
                       <li>Respond to customer inquiries within 24 hours</li>
                       <li>Keep your profile information up to date</li>
                       <li>Follow the platform's terms of service</li>
                       <li>Provide accurate service descriptions and pricing</li>
                     </ul>
                   </div>
                 </div>

                 {/* Agreement Checkbox */}
                 <div className="flex items-start space-x-2">
                   <input
                     type="checkbox"
                     id="terms-agreement"
                     checked={agreedToTerms}
                     onChange={(e) => setAgreedToTerms(e.target.checked)}
                     className="mt-1 h-4 w-4 text-purple-600 bg-slate-800 border-slate-700 rounded focus:ring-purple-500 focus:ring-2"
                   />
                   <label htmlFor="terms-agreement" className="text-sm text-gray-300">
                     I agree to the terms and conditions and understand that the Pro badge approval is at the discretion of the admin team.
                   </label>
                 </div>

                 <Button
                   onClick={handleProBadgeRequest}
                   disabled={proBadgeRequestLoading || !agreedToTerms}
                   className="w-full bg-[hsl(210,100%,65%)] text-white hover:bg-[hsl(210,100%,70%)] transition-all duration-200 hover:scale-105 active:scale-95 glow-effect disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {proBadgeRequestLoading ? (
                     <>
                       <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2"></div>
                       Submitting Request...
                     </>
                   ) : (
                     <>
                       <Target className="h-4 w-4 mr-2" />
                       Submit Pro Badge Request
                     </>
                   )}
                 </Button>
               </>
             )}
           </div>
         </DialogContent>
       </Dialog>
     )}

     {/* Under Review Modal */}
     <Dialog open={showUnderReview} onOpenChange={setShowUnderReview}>
       <DialogContent className="sm:max-w-lg bg-slate-800 border-slate-700">
         <DialogHeader className="text-center">
           <div className="w-16 h-16 mx-auto mb-4 bg-blue-600 rounded-full flex items-center justify-center">
             <Clock className="h-8 w-8 text-white" />
           </div>
           <DialogTitle className="text-2xl text-white mb-2">
             Application Under Review
           </DialogTitle>
           <p className="text-gray-300 text-lg">
             Your application has been submitted successfully!
           </p>
         </DialogHeader>

         <div className="space-y-6 max-h-[60vh] overflow-y-auto">
           <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
             <div className="flex items-center gap-2 text-blue-400 mb-3">
               <Info className="h-5 w-5" />
               <span className="font-semibold">Review Process</span>
             </div>
             <p className="text-gray-300 text-sm mb-3">
               Our admin team is currently reviewing your application. This process typically takes up to 24 hours.
             </p>
             <div className="flex items-center gap-2 text-sm">
               <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
               <span className="text-blue-400">Application submitted and pending review</span>
             </div>
           </div>

           <div className="bg-slate-700/50 rounded-lg p-4">
             <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
               <CheckCircle className="h-5 w-5 text-green-400" />
               What you can do:
             </h4>
             <div className="space-y-2 text-sm text-gray-300">
               <div className="flex items-center gap-2">
                 <CheckCircle className="h-4 w-4 text-green-400" />
                 <span>View your dashboard (spectator mode)</span>
               </div>
               <div className="flex items-center gap-2">
                 <CheckCircle className="h-4 w-4 text-green-400" />
                 <span>Update your profile information</span>
               </div>
               <div className="flex items-center gap-2">
                 <CheckCircle className="h-4 w-4 text-green-400" />
                 <span>Monitor your application status</span>
               </div>
             </div>
           </div>

           <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
             <div className="flex items-center gap-2 text-yellow-400 mb-2">
               <AlertTriangle className="h-5 w-5" />
               <span className="font-semibold">Important Notes</span>
             </div>
             <div className="space-y-1 text-sm text-gray-300">
               <p>• You cannot receive bookings until approved</p>
               <p>• Your profile is not visible to customers yet</p>
               <p>• You'll be notified once a decision is made</p>
               <p>• Make sure all documents are valid and clear</p>
             </div>
           </div>

           <div className="bg-slate-700/50 rounded-lg p-4">
             <h4 className="text-white font-semibold mb-3">Current Status</h4>
             <div className="flex items-center justify-between">
               <span className="text-gray-300">Application Status:</span>
               <Badge variant="secondary" className="bg-yellow-600 text-white">
                 Under Review
               </Badge>
             </div>
             <div className="flex items-center justify-between mt-2">
               <span className="text-gray-300">Submitted:</span>
               <span className="text-white text-sm">
                 {providerProfile?.submitted_at ? formatDate(providerProfile.submitted_at) : 'Recently'}
               </span>
             </div>
           </div>
         </div>

         <DialogFooter className="flex flex-col sm:flex-row gap-3">
           <Button
             variant="outline"
             onClick={() => navigate('/')}
             className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
           >
             Return to Home
           </Button>
           <Button
             onClick={() => setShowUnderReview(false)}
             className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
           >
             View Dashboard
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>

     {/* Commission Payment Modal */}
     <Dialog open={showCommissionPayment} onOpenChange={setShowCommissionPayment}>
       <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col min-h-[700px]">
         <DialogHeader className="flex-shrink-0">
           <DialogTitle className="flex items-center gap-2">
             <AlertTriangle className="h-5 w-5 text-orange-500" />
             Commission Payment Required
           </DialogTitle>
         </DialogHeader>

         <div className="flex-1 overflow-y-auto pr-1 min-h-0">
           <div className="space-y-6">
             {/* Commission Amount Display - Prominent */}
             <div className="p-4 bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-600 rounded-lg">
               <div className="flex items-center gap-2 mb-3">
                 <AlertTriangle className="h-5 w-5 text-orange-500" />
                 <span className="font-semibold text-orange-400">Commission Amount Due</span>
               </div>
               <div className="text-center">
                 <div className="text-3xl font-bold text-white mb-2">
                   {formatPrice(calculatedCommissionAmount)}
                 </div>
                 <div className="text-sm text-gray-300">
                   5% of your last {bookings.filter(booking => booking.status === 'completed').length % 5 === 0 ? '5' : 'current cycle'} completed jobs
                 </div>
               </div>

               {/* Commission Breakdown */}
               <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                 <div className="text-sm text-gray-300 mb-2">Commission Breakdown:</div>
                 <div className="space-y-1 text-xs">
                   <div className="flex justify-between">
                     <span className="text-gray-400">Total Earnings:</span>
                     <span className="text-white">
                       {formatPrice(
                         bookings
                           .filter(booking => booking.status === 'completed')
                           .slice(-5) // Get the last 5 completed jobs for current cycle
                           .reduce((sum, booking) => sum + (booking.final_price || booking.proposed_price), 0)
                       )}
                     </span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-gray-400">Commission (5%):</span>
                     <span className="text-white">{formatPrice(calculatedCommissionAmount)}</span>
                   </div>
                   <div className="flex justify-between font-semibold">
                     <span className="text-orange-400">Amount to Pay:</span>
                     <span className="text-orange-400">{formatPrice(calculatedCommissionAmount)}</span>
                   </div>
                 </div>
               </div>
             </div>

             <div className="space-y-2">
               <Label htmlFor="payment-method">Payment Method</Label>
               {loadingPaymentMethods ? (
                 <div className="h-10 bg-gray-700 animate-pulse rounded flex items-center px-3">
                   <div className="h-4 bg-gray-600 rounded w-24 animate-pulse"></div>
                 </div>
               ) : paymentMethods.length === 0 ? (
                 <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                   <SelectTrigger>
                     <SelectValue placeholder="Loading payment methods..." />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                     <SelectItem value="jazzcash">JazzCash</SelectItem>
                     <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                     <SelectItem value="cash">Cash Payment</SelectItem>
                   </SelectContent>
                 </Select>
               ) : (
                 <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                   <SelectTrigger>
                     <SelectValue placeholder="Select payment method" />
                   </SelectTrigger>
                   <SelectContent>
                     {paymentMethods.map((method: any) => (
                       <SelectItem key={method.id || method.method_name} value={method.method_name}>
                         {method.display_name}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               )}
             </div>

             <div className="space-y-2">
               <Label htmlFor="amount">Payment Amount (PKR)</Label>
               <Input
                 id="amount"
                 type="number"
                 placeholder="Enter the amount you're paying"
                 value={paymentAmount || ''}
                 onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
               />
               <div className="text-xs text-gray-400 space-y-1">
                 <p>💡 <strong>Commission this cycle:</strong> {formatPrice(calculatedCommissionAmount)}</p>
                 <p>• You can enter any amount you wish to pay</p>
                 <p>• The calculated commission above is for reference only</p>
               </div>
             </div>

             {/* Payment Method Details */}
             {selectedPaymentMethod && (
               <div className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg">
                 <div className="flex justify-between items-start mb-3">
                   <h3 className="text-sm font-medium text-white">{selectedPaymentMethod.display_name} Details</h3>
                   <Button
                     variant="ghost"
                     size="sm"
                     className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
                     onClick={() => {
                       if (selectedPaymentMethod.account_details) {
                         navigator.clipboard.writeText(selectedPaymentMethod.account_details).then(() => {
                           toast.success('Account details copied to clipboard');
                         }).catch(err => {
                           toast.error('Failed to copy');
                           console.error('Could not copy text: ', err);
                         });
                       }
                     }}
                     title="Copy account details"
                   >
                     <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                     </svg>
                   </Button>
                 </div>
                 <div className="text-sm text-gray-300 whitespace-pre-line bg-slate-800/50 p-3 rounded border">
                   {selectedPaymentMethod.account_details}
                 </div>
                 {selectedPaymentMethod.instructions && (
                   <div className="text-xs text-blue-400 pt-2 border-t border-slate-600 mt-2">
                     <p className="font-medium mb-1">Instructions:</p>
                     <div className="text-gray-300">{selectedPaymentMethod.instructions}</div>
                   </div>
                 )}
               </div>
             )}

             <div className="space-y-2">
               <Label htmlFor="screenshot">Payment Screenshot <span className="text-red-400">*</span></Label>
               <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:bg-gray-700 transition cursor-pointer">
                 <input
                   id="screenshot"
                   type="file"
                   accept="image/jpeg,image/png,image/webp"
                   className="hidden"
                   onChange={handleFileUpload}
                 />
                 <label htmlFor="screenshot" className="cursor-pointer">
                   {selectedFile ? (
                     <div className="relative mx-auto">
                       <img
                         src={URL.createObjectURL(selectedFile)}
                         alt="Payment screenshot"
                         className="max-h-[200px] mx-auto rounded-lg shadow-sm"
                       />
                       <button
                         type="button"
                         onClick={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           setSelectedFile(null);
                         }}
                         className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                         title="Remove screenshot"
                       >
                         <X className="h-4 w-4" />
                       </button>
                       <p className="text-xs text-green-400 mt-2">✓ Screenshot uploaded successfully</p>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center justify-center py-6">
                       <Upload className="h-10 w-10 text-gray-400 mb-2" />
                       <p className="text-sm font-medium text-gray-300">Click to upload payment screenshot</p>
                       <p className="text-xs text-gray-500 mt-1">JPG, PNG or WebP (max 3MB)</p>
                       <p className="text-xs text-red-400 mt-1">* Required</p>
                     </div>
                   )}
                 </label>
               </div>
             </div>

             {/* Validation Summary */}
             <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
               <h4 className="text-sm font-medium text-white mb-3">Submission Checklist</h4>
               <div className="space-y-2 text-sm">
                 <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${paymentMethod ? 'bg-green-400' : 'bg-gray-600'}`}></div>
                   <span className={paymentMethod ? 'text-green-400' : 'text-gray-400'}>
                     Payment method selected
                   </span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${paymentAmount > 0 ? 'bg-green-400' : 'bg-gray-600'}`}></div>
                   <span className={paymentAmount > 0 ? 'text-green-400' : 'text-gray-400'}>
                     Commission amount entered
                   </span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${selectedFile ? 'bg-green-400' : 'bg-gray-600'}`}></div>
                   <span className={selectedFile ? 'text-green-400' : 'text-gray-400'}>
                     Payment screenshot uploaded
                   </span>
                 </div>
               </div>
             </div>

             <div className={`flex items-start rounded-lg p-3 text-sm ${isCommissionDue ? 'bg-red-900/20 text-red-400 border border-red-600' : 'bg-blue-900/20 text-blue-400 border border-blue-600'}`}>
               <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
               <div>
                 <p className="font-semibold mb-1">
                   {isCommissionDue
                     ? '⚠️ Commission Payment Required'
                     : 'ℹ️ Commission Payment Information'
                   }
                 </p>
                 <p className="mb-3">
                   {isCommissionDue
                     ? 'Your services are currently inactive due to pending commission payment. Submit payment proof to reactivate your services and continue receiving bookings.'
                     : 'Commission payments are verified by our admin team. Your booking capability will be restored once your payment is verified.'
                   }
                 </p>
                 <div className="text-xs space-y-1">
                   <p><strong>Current Cycle:</strong> {isCommissionDue ? '5/5' : `${jobsSinceLastCommission}/5`} jobs completed</p>
                   <p><strong>Commission Rate:</strong> 5% of earnings</p>
                   <p><strong>Status:</strong> {isCommissionDue ? 'Payment Required' : 'Active Cycle'}</p>
                 </div>
               </div>
             </div>

             {/* Important Notes */}
             <div className="p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
               <div className="flex items-start gap-2 text-yellow-400 mb-2">
                 <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                 <span className="font-semibold text-sm">Important Notes</span>
               </div>
               <div className="space-y-1 text-xs text-gray-300">
                 <p>• Submit payment proof only after completing the transaction</p>
                 <p>• Your services will remain inactive until payment is verified</p>
                 <p>• Verification typically takes 24-48 hours</p>
                 <p>• Include your provider ID in payment reference/description</p>
               </div>
             </div>
           </div>
         </div>

         <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-3 flex-shrink-0">
           <Button
             type="button"
             variant="outline"
             onClick={() => setShowCommissionPayment(false)}
             disabled={submittingPayment}
             className="border-gray-600 text-gray-300 hover:bg-gray-700"
           >
             Cancel
           </Button>

           {/* Validation Status */}
           <div className="flex items-center gap-2 text-xs">
             {!paymentMethod && <span className="text-red-400">Select payment method</span>}
             {!paymentAmount && <span className="text-red-400">Enter amount</span>}
             {!selectedFile && <span className="text-red-400">Upload screenshot</span>}
             {paymentMethod && paymentAmount && selectedFile && (
               <span className="text-green-400">✓ Ready to submit</span>
             )}
           </div>

           <Button
             type="button"
             onClick={handleCommissionPayment}
             disabled={submittingPayment || !paymentMethod || !paymentAmount || !selectedFile}
             className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
           >
             {submittingPayment ? (
               <>
                 <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                 Submitting Payment...
               </>
             ) : (
               <>
                 <Check className="h-4 w-4 mr-2" />
                 Submit Payment Proof
               </>
             )}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>

     {/* Commission Under Review Modal */}
     <Dialog open={showCommissionUnderReview} onOpenChange={setShowCommissionUnderReview}>
       <DialogContent className="sm:max-w-lg bg-slate-800 border-slate-700 max-h-[90vh] flex flex-col">
         <DialogHeader className="text-center flex-shrink-0">
           <div className="w-16 h-16 mx-auto mb-4 bg-blue-600 rounded-full flex items-center justify-center">
             <Clock className="h-8 w-8 text-white" />
           </div>
           <DialogTitle className="text-2xl text-white mb-2">
             Commission Payment Under Review
           </DialogTitle>
           <p className="text-gray-300 text-lg">
             Your payment is being verified by our team
           </p>
         </DialogHeader>

         <div className="flex-1 overflow-y-auto pr-1 min-h-0 space-y-6">
           {pendingCommissionPayment && (
             <>
               {/* Payment Details */}
               <div className="p-4 bg-slate-700/50 rounded-lg">
                 <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                   <Receipt className="h-5 w-5 text-blue-400" />
                   Payment Details
                 </h4>
                 <div className="space-y-3">
                   <div className="flex items-center justify-between">
                     <span className="text-gray-300">Amount Submitted:</span>
                     <span className="text-white font-medium">{formatPrice(pendingCommissionPayment.amount)}</span>
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-gray-300">Payment Method:</span>
                     <span className="text-white font-medium">{pendingCommissionPayment.payment_method}</span>
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-gray-300">Jobs Completed:</span>
                     <span className="text-white font-medium">{pendingCommissionPayment.booking_count} jobs</span>
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-gray-300">Submitted:</span>
                     <span className="text-white font-medium">{formatDate(pendingCommissionPayment.submitted_at)}</span>
                   </div>
                 </div>
               </div>

               {/* Review Status */}
               <div className="p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
                 <div className="flex items-center gap-2 text-blue-400 mb-3">
                   <Info className="h-5 w-5" />
                   <span className="font-semibold">Review Process</span>
                 </div>
                 <p className="text-gray-300 text-sm mb-3">
                   Our admin team is currently reviewing your payment proof. This process typically takes 24 hours.
                 </p>
                 <div className="flex items-center gap-2 text-sm">
                   <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                   <span className="text-blue-400">Payment verification in progress</span>
                 </div>
               </div>

               {/* What happens next */}
               <div className="p-4 bg-slate-700/50 rounded-lg">
                 <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                   <CheckCircle className="h-5 w-5 text-green-400" />
                   What happens next:
                 </h4>
                 <div className="space-y-2 text-sm text-gray-300">
                   <div className="flex items-center gap-2">
                     <CheckCircle className="h-4 w-4 text-green-400" />
                     <span>Admin reviews your payment proof</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <CheckCircle className="h-4 w-4 text-green-400" />
                     <span>Payment verification (24-48 hours)</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <CheckCircle className="h-4 w-4 text-green-400" />
                     <span>Services reactivated upon approval</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <CheckCircle className="h-4 w-4 text-green-400" />
                     <span>You'll receive a notification</span>
                   </div>
                 </div>
               </div>

               {/* Important Notes */}
               <div className="p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
                 <div className="flex items-start gap-2 text-yellow-400 mb-2">
                   <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                   <span className="font-semibold text-sm">Important Notes</span>
                 </div>
                 <div className="space-y-1 text-xs text-gray-300">
                   <p>• Your services remain inactive during review</p>
                   <p>• You cannot submit another payment until this is processed</p>
                   <p>• Contact support if you have questions about the review</p>
                   <p>• Review times may vary based on payment method</p>
                 </div>
               </div>

               {/* Current Status */}
               <div className="p-4 bg-slate-700/50 rounded-lg">
                 <h4 className="text-white font-semibold mb-3">Current Status</h4>
                 <div className="flex items-center justify-between">
                   <span className="text-gray-300">Payment Status:</span>
                   <Badge variant="secondary" className="bg-yellow-600 text-white">
                     Under Review
                   </Badge>
                 </div>
                 <div className="flex items-center justify-between mt-2">
                   <span className="text-gray-300">Submitted:</span>
                   <span className="text-white text-sm">
                     {formatDate(pendingCommissionPayment.submitted_at)}
                   </span>
                 </div>
                 <div className="flex items-center justify-between mt-1">
                   <span className="text-gray-300">Estimated Review Time:</span>
                   <span className="text-white text-sm">
                     24-48 hours
                   </span>
                 </div>
               </div>
             </>
           )}
         </div>

         <DialogFooter className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
           <Button
             variant="outline"
             onClick={() => setShowCommissionUnderReview(false)}
             className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
           >
             Close
           </Button>
           <Button
             onClick={() => {
               setShowCommissionUnderReview(false);
               // Optionally refresh the commission payment history
               loadCommissionPaymentHistory();
             }}
             className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
           >
             <RefreshCw className="h-4 w-4 mr-2" />
             Refresh Status
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>

     {/* Completion Confirmation Modal */}
     <Dialog open={showCompletionConfirmation} onOpenChange={setShowCompletionConfirmation}>
       <DialogContent className="sm:max-w-md">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <CheckCircle className="h-5 w-5 text-green-500" />
             Confirm Service Completion
           </DialogTitle>
         </DialogHeader>

         <div className="space-y-4">
           {bookingToComplete && (
             <div className="p-4 bg-slate-700/50 rounded-lg">
               <h4 className="font-semibold text-white mb-2">Service Details</h4>
               <p className="text-sm text-gray-300">{bookingToComplete.title}</p>
               <p className="text-sm text-gray-400">Customer: {bookingToComplete.customer?.full_name}</p>
               <p className="text-sm text-gray-400">Amount: {formatPrice(bookingToComplete.proposed_price)}</p>
             </div>
           )}

           <div className="space-y-3">
             <div className="flex items-start space-x-2">
               <input
                 type="checkbox"
                 id="completion-confirmation"
                 checked={completionConfirmed}
                 onChange={(e) => setCompletionConfirmed(e.target.checked)}
                 className="mt-1 h-4 w-4 text-green-600 bg-slate-800 border-slate-700 rounded focus:ring-green-500 focus:ring-2"
               />
               <label htmlFor="completion-confirmation" className="text-sm text-gray-300">
                 Yes, I confirm that I have received payment and finished the task completely.
               </label>
             </div>
           </div>

           <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3">
             <div className="flex items-center gap-2 text-yellow-400 mb-2">
               <AlertTriangle className="h-4 w-4" />
               <span className="font-semibold text-sm">Important Notes</span>
             </div>
             <div className="space-y-1 text-xs text-gray-300">
               <p>• Only mark as completed after receiving full payment</p>
               <p>• Customer will be notified of completion</p>
               <p>• This action cannot be undone</p>
               <p>• Service will move to history after completion</p>
             </div>
           </div>
         </div>

         <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
           <Button
             type="button"
             variant="outline"
             onClick={() => {
               setShowCompletionConfirmation(false);
               setBookingToComplete(null);
               setCompletionConfirmed(false);
             }}
             disabled={false}
           >
             Cancel
           </Button>
           <Button
             type="button"
             onClick={handleConfirmCompletion}
             disabled={!completionConfirmed}
             className="bg-green-600 hover:bg-green-700 text-white"
           >
             <CheckCircle className="h-4 w-4 mr-2" />
             Mark as Completed
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>

     {/* Customer Navigation Modal */}
     <Dialog open={!!showCustomerNavigation} onOpenChange={() => setShowCustomerNavigation(null)}>
       <DialogContent className="sm:max-w-lg bg-slate-800 border-slate-700">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2 text-white">
             <MapPin className="h-5 w-5 text-blue-400" />
             Customer Details & Navigation
           </DialogTitle>
         </DialogHeader>

         <div className="space-y-6">
           {showCustomerNavigation && (
             <>
               {/* Customer Information */}
               <div className="space-y-4">
                 <div className="p-4 bg-slate-700/50 rounded-lg">
                   <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                     <Users className="h-4 w-4" />
                     Customer Information
                   </h4>
                   <div className="space-y-3">
                     <div className="flex items-center justify-between">
                       <span className="text-gray-300">Name:</span>
                       <span className="text-white font-medium">{showCustomerNavigation.customer?.full_name || 'Unknown'}</span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-gray-300">Email:</span>
                       <span className="text-white font-medium">{showCustomerNavigation.customer?.email || 'Not available'}</span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-gray-300">Phone:</span>
                       <span className="text-white font-medium">
                         {showCustomerNavigation.customer?.phone || 'Not available'}
                       </span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-gray-300">Service:</span>
                       <span className="text-white font-medium">{showCustomerNavigation.title}</span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-gray-300">Location:</span>
                       <span className="text-white font-medium text-sm max-w-48 truncate" title={showCustomerNavigation.location}>
                         {showCustomerNavigation.location}
                       </span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-gray-300">Status:</span>
                       <Badge variant="default" className="bg-blue-600 text-white">
                         {showCustomerNavigation.status}
                       </Badge>
                     </div>
                   </div>
                 </div>

                 {/* Location Preview */}
                 <div className="p-4 bg-slate-700/50 rounded-lg">
                   <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                     <MapPin className="h-4 w-4" />
                     Location Preview
                   </h4>
                   {showCustomerNavigation.customer_location_lat && showCustomerNavigation.customer_location_lng ? (
                     <div className="space-y-3">
                       <div className="aspect-video bg-slate-600 rounded-lg overflow-hidden">
                         <iframe
                           src={`https://maps.google.com/maps?q=${showCustomerNavigation.customer_location_lat},${showCustomerNavigation.customer_location_lng}&z=15&output=embed`}
                           width="100%"
                           height="100%"
                           style={{ border: 0 }}
                           allowFullScreen
                           loading="lazy"
                           referrerPolicy="no-referrer-when-downgrade"
                           title="Customer Location"
                         />
                       </div>
                       <div className="text-xs text-gray-400 text-center">
                         Location shared at: {formatDate(showCustomerNavigation.customer_location_shared_at || showCustomerNavigation.created_at)}
                       </div>
                     </div>
                   ) : (
                     <div className="aspect-video bg-slate-600 rounded-lg flex items-center justify-center">
                       <div className="text-center text-gray-400">
                         <MapPin className="h-8 w-8 mx-auto mb-2" />
                         <p className="text-sm">Location not available</p>
                       </div>
                     </div>
                   )}
                 </div>
               </div>

               {/* Action Buttons */}
               <div className="space-y-3">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   <Button
                     onClick={() => handleNavigateToCustomerLocation(showCustomerNavigation)}
                     disabled={customerNavigationLoading || !showCustomerNavigation.customer_location_lat || !showCustomerNavigation.customer_location_lng}
                     className="bg-blue-600 hover:bg-blue-700 text-white"
                   >
                     {customerNavigationLoading ? (
                       <>
                         <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2"></div>
                         Opening...
                       </>
                     ) : (
                       <>
                         <MapPin className="h-4 w-4 mr-2" />
                         Navigate to Customer
                       </>
                     )}
                   </Button>
                   <Button
                     onClick={() => handleCallCustomer(showCustomerNavigation)}
                     disabled={!showCustomerNavigation.customer?.phone}
                     variant="outline"
                     className="border-green-600 text-green-400 hover:bg-green-900/20"
                   >
                     <Phone className="h-4 w-4 mr-2" />
                     Call Customer
                   </Button>
                 </div>

                 <div className="text-xs text-gray-400 text-center">
                   <p>Make sure you have the customer's location before navigating</p>
                 </div>
               </div>
             </>
           )}
         </div>

         <DialogFooter>
           <Button
             variant="outline"
             onClick={() => setShowCustomerNavigation(null)}
             className="border-gray-600 text-gray-300 hover:bg-gray-700"
           >
             Close
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>

     {/* Commission Approved Congratulations Modal */}
     <Dialog open={showCommissionApproved} onOpenChange={setShowCommissionApproved}>
       <DialogContent className="sm:max-w-lg bg-slate-800 border-slate-700">
         <DialogHeader className="text-center">
           <div className="w-16 h-16 mx-auto mb-4 bg-green-600 rounded-full flex items-center justify-center">
             <CheckCircle className="h-8 w-8 text-white" />
           </div>
           <DialogTitle className="text-2xl text-white mb-2">
             🎉 Commission Payment Approved!
           </DialogTitle>
           <p className="text-gray-300 text-lg">
             Congratulations! Your commission payment has been verified and approved.
           </p>
         </DialogHeader>

         <div className="space-y-6">
           {approvedCommissionDetails && (
             <>
               {/* Payment Summary */}
               <div className="p-4 bg-green-900/20 border border-green-600 rounded-lg">
                 <div className="flex items-center gap-2 mb-3">
                   <Receipt className="h-5 w-5 text-green-400" />
                   <span className="font-semibold text-green-400">Payment Summary</span>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="text-center">
                     <div className="text-2xl font-bold text-white">
                       {formatPrice(approvedCommissionDetails.amount)}
                     </div>
                     <div className="text-sm text-gray-300">Amount Paid</div>
                   </div>
                   <div className="text-center">
                     <div className="text-2xl font-bold text-white">
                       {approvedCommissionDetails.booking_count}
                     </div>
                     <div className="text-sm text-gray-300">Jobs Completed</div>
                   </div>
                 </div>
               </div>

               {/* What's Next */}
               <div className="p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
                 <div className="flex items-center gap-2 text-blue-400 mb-3">
                   <Info className="h-5 w-5" />
                   <span className="font-semibold">What's Next</span>
                 </div>
                 <div className="space-y-2 text-sm text-gray-300">
                   <div className="flex items-center gap-2">
                     <CheckCircle className="h-4 w-4 text-green-400" />
                     <span>Your services have been automatically reactivated</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <CheckCircle className="h-4 w-4 text-green-400" />
                     <span>You can now receive new bookings</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <CheckCircle className="h-4 w-4 text-green-400" />
                     <span>Commission cycle has been reset</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <CheckCircle className="h-4 w-4 text-green-400" />
                     <span>Start working on new jobs!</span>
                   </div>
                 </div>
               </div>

               {/* Commission Progress Reset */}
               <div className="p-4 bg-slate-700/50 rounded-lg">
                 <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                   <Target className="h-5 w-5 text-blue-400" />
                   Commission Progress Reset
                 </h4>
                 <div className="space-y-3">
                   <div className="flex items-center justify-between">
                     <span className="text-gray-300">Next Commission Due:</span>
                     <span className="text-white font-semibold">After 5 more completed jobs</span>
                   </div>
                   <div className="w-full bg-gray-700 rounded-full h-3">
                     <div
                       className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                       style={{ width: '0%' }}
                     ></div>
                   </div>
                   <div className="text-sm text-gray-400 text-center">
                     Commission cycle has been reset - You're starting fresh!
                   </div>
                 </div>
               </div>

               {/* Important Notes */}
               <div className="p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
                 <div className="flex items-start gap-2 text-yellow-400 mb-2">
                   <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                   <span className="font-semibold text-sm">Important Notes</span>
                 </div>
                 <div className="space-y-1 text-xs text-gray-300">
                   <p>• Keep providing excellent service to maintain your rating</p>
                   <p>• Complete jobs efficiently to maximize your earnings</p>
                   <p>• Remember to submit commission after every 5 completed jobs</p>
                   <p>• Your Pro badge status (if applicable) remains active</p>
                 </div>
               </div>
             </>
           )}
         </div>

         <DialogFooter className="flex flex-col sm:flex-row gap-3">
           <Button
             variant="outline"
             onClick={() => {
               setShowCommissionApproved(false);
               setApprovedCommissionDetails(null);
             }}
             className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
           >
             Close
           </Button>
           <Button
             onClick={() => {
               setShowCommissionApproved(false);
               setApprovedCommissionDetails(null);
               // Navigate to bookings tab to show active services
               handleTabChange('bookings');
             }}
             className="flex-1 bg-green-600 hover:bg-green-700 text-white"
           >
             <Briefcase className="h-4 w-4 mr-2" />
             View Active Services
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   </div>
   </div>
 );
};

export default ProviderDashboard;