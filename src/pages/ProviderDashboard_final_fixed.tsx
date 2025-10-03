import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Star, 
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
  Trash2,
  LogOut,
  Check,
  X,
  AlertCircle,
  IdCard
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import CommissionReminder from "@/components/CommissionReminder";

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
  // Commission tracking fields
  completed_jobs_since_commission?: number;
  last_commission_paid_at?: string;
  commission_reminder_active?: boolean;
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
  };
  cancellation_reason?: string;
  completion_location_lat?: number;
  completion_location_lng?: number;
  location_confirmed_at?: string;
  // Add location tracking fields
  customer_location_lat?: number;
  customer_location_lng?: number;
  customer_location_shared_at?: string;
  location_access_expires_at?: string;
  location_access_active?: boolean;
}

interface DailyEarningsData {
  date: string;
  earnings: number;
  bookings: number;
}

const ProviderDashboard = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { notifications } = useNotifications();
  const navigate = useNavigate();
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
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
  const [showProBadgeRequest, setShowProBadgeRequest] = useState(false);
  const [proBadgeRequestLoading, setProBadgeRequestLoading] = useState(false);
  const [proBadgeRequestMessage, setProBadgeRequestMessage] = useState("");
  // Commission reminder state
  const [showCommissionReminder, setShowCommissionReminder] = useState(false);
  // Add commission payment history state
  const [commissionPayments, setCommissionPayments] = useState<any[]>([]);
  const [loadingCommissionHistory, setLoadingCommissionHistory] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadProviderData();
      
      // Check if provider has commission reminder active
      checkCommissionReminder();
    }
  }, [isAuthenticated, user]);

  const loadProviderData = async () => {
    if (!user) return;
    
    try {
      // Load provider profile
      const { data: profile } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

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
        if (!profile.business_name) {
          console.log('No business_name found, showing setup modal');
          setShowBusinessSetup(true);
        } else {
          console.log('Profile has business_name, keeping modal closed');
        }
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
        toast.error('Failed to load services');
      } else {
        setServices(servicesData || []);
      }

      // Load bookings with customer info
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:profiles!bookings_customer_id_fkey(full_name, email, phone)
        `)
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('Error loading bookings:', bookingsError);
        toast.error('Failed to load bookings');
      } else {
        setBookings(bookingsData || []);
      }

      // Load daily earnings data
      await loadDailyEarnings();

      // Load commission payment history
      await loadCommissionPaymentHistory();

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
      const { data, error } = await supabase
        .rpc('get_daily_earnings', { provider_id: user.id });

      if (error) {
        console.error('Error loading daily earnings:', error);
        toast.error('Failed to load earnings data');
      } else {
        setDailyEarningsData(data || []);
      }
    } catch (error) {
      console.error('Error loading daily earnings:', error);
      toast.error('Failed to load earnings data');
    }
  };

  const loadCommissionPaymentHistory = async () => {
    if (!user) return;
    
    try {
      setLoadingCommissionHistory(true);
      const { data, error } = await supabase
        .from('commission_payments')
        .select('*')
        .eq('provider_id', user.id)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error loading commission payment history:', error);
        toast.error('Failed to load commission payment history');
      } else {
        setCommissionPayments(data || []);
      }
    } catch (error) {
      console.error('Error loading commission payment history:', error);
      toast.error('Failed to load commission payment history');
    } finally {
      setLoadingCommissionHistory(false);
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

  const handleCompleteBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success('Booking marked as completed');
      loadProviderData();
    } catch (error) {
      console.error('Error completing booking:', error);
      toast.error('Failed to complete booking');
    }
  };

  const handleStartService = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'in_progress' })
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
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'confirmed':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Confirmed</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-purple-100 text-purple-800">In Progress</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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

  const checkCommissionReminder = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('provider_profiles')
        .select('commission_reminder_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.commission_reminder_active) {
        setShowCommissionReminder(true);
      }
    } catch (error) {
      console.error('Error checking commission reminder:', error);
    }
  };

  const handleProBadgeRequest = async () => {
    if (!user || !providerProfile) return;
    
    setProBadgeRequestLoading(true);
    try {
      // In a real app, this would send a request to admin for review
      // For now, we'll just show a message
      setProBadgeRequestMessage("Your request for Pro badge has been submitted. Our team will review it within 24 hours.");
      
      // Update profile to show request was made
      const { error } = await supabase
        .from('provider_profiles')
        .update({ 
          pro_badge_requested: true,
          pro_badge_requested_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setProviderProfile({
        ...providerProfile,
        pro_badge_requested: true,
        pro_badge_requested_at: new Date().toISOString()
      });

      toast.success('Pro badge request submitted successfully!');
    } catch (error) {
      console.error('Error requesting Pro badge:', error);
      toast.error('Failed to submit Pro badge request');
    } finally {
      setProBadgeRequestLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  // Check if provider has completed business setup
  const hasCompletedSetup = providerProfile?.business_name && providerProfile?.business_type;

  return (
    <div className="min-h-screen bg-[hsl(220,20%,10%)] text-[hsl(0,0%,95%)]">
      {/* Header */}
      <header className="border-b border-[hsl(220,20%,18%)] bg-[hsl(220,20%,12%)] sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/')}
                className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Provider Dashboard</h1>
                <p className="text-sm text-[hsl(210,100%,75%)]">
                  Welcome back, {user?.full_name || 'Provider'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <NotificationDropdown />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleLogout}
                disabled={navigating}
                className="text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
              >
                {navigating ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                ) : (
                  <LogOut className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Only including critical elements here for brevity */}

        {/* Conditional Components */}
        {showBusinessSetup && (
          <ProviderBusinessSetup 
            isOpen={showBusinessSetup} 
            onClose={() => setShowBusinessSetup(false)}
            onSubmitted={loadProviderData}
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
            currentUser={user}
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
            bookingId={selectedBooking.id}
            customerId={selectedBooking.customer_id}
            providerId={user?.id || ''}
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
            isProvider={true}
            onCancellationComplete={loadProviderData}
          />
        )}
        
        {showApprovalSuccess && (
          <ApprovalSuccessModal
            isOpen={showApprovalSuccess}
            onClose={() => setShowApprovalSuccess(false)}
          />
        )}
        
        {showLocationConfirmation && selectedBookingForLocation && (
          <LocationConfirmationModal
            isOpen={showLocationConfirmation}
            onClose={() => {
              setShowLocationConfirmation(false);
              setSelectedBookingForLocation(null);
            }}
            booking={selectedBookingForLocation}
            onLocationConfirmed={loadProviderData}
          />
        )}
        
        {showCommissionReminder && (
          <CommissionReminder
            isOpen={showCommissionReminder}
            onClose={() => {
              setShowCommissionReminder(false);
              loadProviderData(); // Reload data after closing to refresh commission history
            }}
            providerId={user?.id || ''}
            completedJobsCount={providerProfile?.completed_jobs_since_commission || 0}
            providerName={user?.full_name || 'Provider'}
          />
        )}
      </div>
    </div>
  );
};

export default ProviderDashboard;