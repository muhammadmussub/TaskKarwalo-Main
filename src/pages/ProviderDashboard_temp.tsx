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
  IdCard,
  Receipt
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
        {/* Welcome Message */}
        {!hasCompletedSetup && (
          <Card className="mb-6 bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-[hsl(210,100%,65%)] mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-[hsl(0,0%,95%)] mb-2">Complete Your Profile</h3>
                  <p className="text-[hsl(210,100%,75%)] mb-4">
                    Please complete your business profile to start offering services and receiving bookings.
                  </p>
                  <Button 
                    onClick={() => setShowBusinessSetup(true)}
                    className="bg-[hsl(210,100%,65%)] text-white hover:bg-[hsl(210,100%,70%)] transition-all duration-200 hover:scale-105 active:scale-95 glow-effect"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Set Up Business Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        {hasCompletedSetup && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[hsl(210,100%,75%)]">Total Bookings</p>
                    <p className="text-2xl font-bold text-[hsl(0,0%,95%)]">{bookings.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-[hsl(210,100%,65%)]" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[hsl(210,100%,75%)]">Active Services</p>
                    <p className="text-2xl font-bold text-[hsl(0,0%,95%)]">
                      {services.filter(s => s.is_active).length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-[hsl(210,100%,65%)]" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[hsl(210,100%,75%)]">Total Earnings</p>
                    <p className="text-2xl font-bold text-[hsl(0,0%,95%)]">
                      {formatPrice(providerProfile?.total_earnings || 0)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-[hsl(210,100%,65%)]" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[hsl(210,100%,75%)]">Rating</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                      <span className="text-lg font-bold text-[hsl(0,0%,95%)]">
                        {providerProfile?.rating?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <Star className="h-8 w-8 text-yellow-400 fill-yellow-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        {hasCompletedSetup && (
          <Tabs defaultValue="bookings" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-5 bg-[hsl(220,20%,15%)]">
              <TabsTrigger 
                value="bookings" 
                className="data-[state=active]:bg-[hsl(210,100%,65%)] data-[state=active]:text-white"
              >
                Bookings
              </TabsTrigger>
              <TabsTrigger 
                value="services" 
                className="data-[state=active]:bg-[hsl(210,100%,65%)] data-[state=active]:text-white"
              >
                Services
              </TabsTrigger>
              <TabsTrigger 
                value="earnings" 
                className="data-[state=active]:bg-[hsl(210,100%,65%)] data-[state=active]:text-white"
              >
                Earnings
              </TabsTrigger>
              <TabsTrigger 
                value="profile" 
                className="data-[state=active]:bg-[hsl(210,100%,65%)] data-[state=active]:text-white"
              >
                Profile
              </TabsTrigger>
              <TabsTrigger 
                value="commission" 
                className="data-[state=active]:bg-[hsl(210,100%,65%)] data-[state=active]:text-white"
              >
                Commission
              </TabsTrigger>
            </TabsList>
            
            {/* Bookings Tab */}
            <TabsContent value="bookings">
              <div className="space-y-6">
                <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
                  <CardHeader>
                    <CardTitle className="text-[hsl(0,0%,95%)]">Recent Bookings</CardTitle>
                    <CardDescription className="text-[hsl(210,100%,75%)]">
                      Manage your service bookings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {bookings.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-[hsl(210,100%,75%)] mx-auto mb-4" />
                        <p className="text-[hsl(210,100%,75%)] mb-2">No bookings yet</p>
                        <p className="text-sm text-[hsl(210,100%,75%)]">
                          When customers book your services, they will appear here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {bookings.map((booking) => (
                          <div 
                            key={booking.id} 
                            className="border border-[hsl(220,20%,18%)] rounded-lg p-4 hover:bg-[hsl(220,20%,15%)] transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-[hsl(0,0%,95%)]">{booking.title}</h3>
                                  {getStatusBadge(booking.status)}
                                </div>
                                <p className="text-sm text-[hsl(210,100%,75%)] mb-2">
                                  {booking.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-4 text-xs text-[hsl(210,100%,75%)]">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(booking.created_at)}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Receipt className="h-3 w-3" />
                                    <span>{formatPrice(booking.proposed_price)}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate max-w-[150px]">{booking.location}</span>
                                  </div>
                                </div>
                                {booking.customer && (
                                  <div className="mt-2 text-xs text-[hsl(210,100%,75%)]">
                                    Customer: {booking.customer.full_name} ({booking.customer.email})
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap gap-2">
                                {booking.status === 'pending' && (
                                  <>
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleApproveBooking(booking.id)}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Accept
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleRejectBooking(booking.id)}
                                      className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                                
                                {booking.status === 'confirmed' && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleStartService(booking.id)}
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Start Service
                                  </Button>
                                )}
                                
                                {booking.status === 'in_progress' && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleCompleteBooking(booking.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Complete
                                  </Button>
                                )}
                                
                                {(booking.status === 'confirmed' || booking.status === 'in_progress') && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedBooking(booking);
                                      setShowCancellationModal(true);
                                    }}
                                    className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                )}
                                
                                {booking.status === 'completed' && booking.location_confirmed_at && (
                                  <div className="flex items-center gap-1 text-green-500 text-sm">
                                    <CheckCircle className="h-4 w-4" />
                                    <span>Location Confirmed</span>
                                  </div>
                                )}
                                
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowChat(true);
                                  }}
                                  className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                                >
                                  <MessageSquare className="h-4 w-4 mr-1 text-[hsl(210,100%,65%)]" />
                                  Chat
                                </Button>
                                
                                {(booking.status === 'completed' && !booking.location_confirmed_at) && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => {
                                      setSelectedBookingForLocation(booking);
                                      setShowLocationConfirmation(true);
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <MapPin className="h-4 w-4 mr-1" />
                                    Confirm Location
                                  </Button>
                                )}
                                
                                {booking.location_access_active && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => {
                                      setShowLocationTrackerForBooking(booking);
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                  >
                                    <MapPin className="h-4 w-4 mr-1" />
                                    Track Customer
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Services Tab */}
            <TabsContent value="services">
              <div className="space-y-6">
                <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-[hsl(0,0%,95%)]">Your Services</CardTitle>
                        <CardDescription className="text-[hsl(210,100%,75%)]">
                          Manage your service offerings
                        </CardDescription>
                      </div>
                      <Button 
                        onClick={() => setShowAddService(true)}
                        className="bg-[hsl(210,100%,65%)] text-white hover:bg-[hsl(210,100%,70%)] transition-all duration-200 hover:scale-105 active:scale-95 glow-effect"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Service
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {services.length === 0 ? (
                      <div className="text-center py-8">
                        <Settings className="h-12 w-12 text-[hsl(210,100%,75%)] mx-auto mb-4" />
                        <p className="text-[hsl(210,100%,75%)] mb-2">No services added yet</p>
                        <p className="text-sm text-[hsl(210,100%,75%)] mb-4">
                          Add your first service to start receiving bookings
                        </p>
                        <Button 
                          onClick={() => setShowAddService(true)}
                          className="bg-[hsl(210,100%,65%)] text-white hover:bg-[hsl(210,100%,70%)] transition-all duration-200 hover:scale-105 active:scale-95 glow-effect"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Service
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {services.map((service) => (
                          <Card key={service.id} className="bg-[hsl(220,20%,15%)] border-[hsl(220,20%,18%)] hover:border-[hsl(210,100%,65%)] transition-colors">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h3 className="font-semibold text-[hsl(0,0%,95%)]">{service.title}</h3>
                                  <p className="text-sm text-[hsl(210,100%,75%)]">{service.category}</p>
                                </div>
                                <Badge 
                                  variant={service.is_active ? "default" : "secondary"}
                                  className={service.is_active ? "bg-green-600" : "bg-gray-600"}
                                >
                                  {service.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-[hsl(210,100%,75%)] mb-3 line-clamp-2">
                                {service.description}
                              </p>
                              
                              <div className="flex items-center justify-between mb-4">
                                <div className="text-lg font-semibold text-[hsl(0,0%,95%)]">
                                  {formatPrice(service.base_price)}
                                </div>
                                <Badge 
                                  variant={service.admin_approved ? "default" : "destructive"}
                                  className={service.admin_approved ? "bg-[hsl(210,100%,65%)]" : ""}
                                >
                                  {service.admin_approved ? "Approved" : "Pending"}
                                </Badge>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => {
                                    setEditingService(service);
                                    setShowEditService(true);
                                  }}
                                  className="flex-1 bg-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,20%)] transition-all duration-200 hover:scale-105 active:scale-95"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      const { error } = await supabase
                                        .from('services')
                                        .update({ is_active: !service.is_active })
                                        .eq('id', service.id);
                                      
                                      if (error) {
                                        toast.error("Failed to update service");
                                      } else {
                                        toast.success(`Service ${service.is_active ? 'deactivated' : 'activated'}`);
                                        loadProviderData();
                                      }
                                    } catch (error) {
                                      console.error("Error updating service:", error);
                                      toast.error("Failed to update service");
                                    }
                                  }}
                                  className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)] transition-all duration-200 hover:scale-105 active:scale-95"
                                >
                                  {service.is_active ? (
                                    <X className="h-4 w-4 text-[hsl(210,100%,65%)]" />
                                  ) : (
                                    <Check className="h-4 w-4 text-[hsl(210,100%,65%)]" />
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Earnings Tab */}
            <TabsContent value="earnings">
              <div className="space-y-6">
                <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
                  <CardHeader>
                    <CardTitle className="text-[hsl(0,0%,95%)]">Earnings Overview</CardTitle>
                    <CardDescription className="text-[hsl(210,100%,75%)]">
                      Track your earnings over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[hsl(0,0%,95%)]">Total Earnings</span>
                        <span className="text-xl font-bold text-[hsl(0,0%,95%)]">
                          {formatPrice(providerProfile?.total_earnings || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[hsl(0,0%,95%)]">Commission Paid</span>
                        <span className="text-xl font-bold text-[hsl(0,0%,95%)]">
                          {formatPrice(providerProfile?.total_commission || 0)}
                        </span>
                      </div>
                    </div>
                    
                    <DailyEarningsChart data={dailyEarnings} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Profile Management */}
            <TabsContent value="profile">
              <div className="space-y-6">
                <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
                  <CardHeader>
                    <CardTitle className="text-[hsl(0,0%,95%)]">Business Profile</CardTitle>
                    <CardDescription className="text-[hsl(210,100%,75%)]">
                      Manage your business information and verification status
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        {user?.avatar_url ? (
                          <AvatarImage src={user.avatar_url} alt={user.full_name || "Provider"} />
                        ) : (
                          <AvatarFallback className="bg-[hsl(220,15%,15%)] text-[hsl(0,0%,95%)]">
                            {user?.full_name?.charAt(0) || "P"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-[hsl(0,0%,95%)]">{user?.full_name || "Provider"}</h3>
                        <p className="text-sm text-[hsl(210,100%,75%)]">{user?.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {providerProfile?.verified ? (
                            <Badge variant="default" className="flex items-center gap-1 bg-[hsl(210,100%,65%)]">
                              <Shield className="h-3 w-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-[hsl(220,15%,15%)] text-[hsl(210,100%,75%)]">Not Verified</Badge>
                          )}
                          {providerProfile?.admin_approved ? (
                            <Badge variant="default" className="bg-[hsl(210,100%,65%)]">Approved</Badge>
                          ) : (
                            <Badge variant="destructive">Pending Approval</Badge>
                          )}
                          {providerProfile?.verified_pro && (
                            <Badge variant="default" className="bg-purple-600">
                              <Shield className="h-3 w-3 mr-1" />
                              Pro
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Ratings Display */}
                    {providerProfile?.rating !== undefined && providerProfile?.rating !== null && (
                      <div className="mt-4 p-4 bg-[hsl(220,15%,15%)] rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-[hsl(0,0%,95%)]">Your Rating</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-5 w-5 ${
                                      star <= Math.round(providerProfile.rating || 0)
                                        ? "text-yellow-400 fill-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-[hsl(0,0%,95%)] font-medium">
                                {providerProfile.rating.toFixed(1)}
                              </span>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate("/ratings-history")}
                            className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                          >
                            View History
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <Separator className="bg-[hsl(220,20%,18%)]" />
                    
                    {providerProfile ? (
                      <div className="grid gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="businessName" className="text-[hsl(0,0%,95%)]">Business Name</Label>
                            <div className="mt-1 p-2 bg-[hsl(220,15%,15%)] rounded-md text-[hsl(0,0%,95%)]">
                              {providerProfile.business_name || "Not set"}
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="businessType" className="text-[hsl(0,0%,95%)]">Business Type</Label>
                            <div className="mt-1 p-2 bg-[hsl(220,15%,15%)] rounded-md text-[hsl(0,0%,95%)]">
                              {providerProfile.business_type || "Not set"}
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="address" className="text-[hsl(0,0%,95%)]">Business Address</Label>
                            <div className="mt-1 p-2 bg-[hsl(220,15%,15%)] rounded-md text-[hsl(0,0%,95%)]">
                              {providerProfile.business_address || "Not set"}
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="phone" className="text-[hsl(0,0%,95%)]">Business Phone</Label>
                            <div className="mt-1 p-2 bg-[hsl(220,15%,15%)] rounded-md text-[hsl(0,0%,95%)]">
                              {providerProfile.phone || "Not set"}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            onClick={() => setShowEditProfile(true)}
                            className="bg-[hsl(210,100%,65%)] text-white hover:bg-[hsl(210,100%,70%)] transition-all duration-200 hover:scale-105 active:scale-95 glow-effect"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Business Profile
                          </Button>
                          
                          {/* Show Apply for Verification button if provider has submitted first service but not applied for verification */}
                          {services.length >= 1 && (!providerProfile?.verified || providerProfile?.application_status !== 'approved') && (
                            <Button 
                              onClick={handleApplyForVerification}
                              variant="outline"
                              className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)] transition-all duration-200 hover:scale-105 active:scale-95"
                            >
                              <IdCard className="h-4 w-4 mr-2 text-[hsl(210,100%,65%)]" />
                              Apply for Verification
                            </Button>
                          )}
                          
                          {!providerProfile?.verified_pro && (
                            <Button 
                              onClick={() => setShowProBadgeRequest(true)}
                              variant="outline"
                              className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)] transition-all duration-200 hover:scale-105 active:scale-95"
                            >
                              <Shield className="h-4 w-4 mr-2 text-[hsl(210,100%,65%)]" />
                              Request Pro Badge
                            </Button>
                          )}
                        </div>

                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-[hsl(210,100%,75%)] mb-4">Business profile not set up yet</p>
                        <Button 
                          onClick={() => setShowBusinessSetup(true)}
                          className="bg-[hsl(210,100%,65%)] text-white hover:bg-[hsl(210,100%,70%)] transition-all duration-200 hover:scale-105 active:scale-95 glow-effect"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Set Up Business Profile
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Commission History Tab */}
            <TabsContent value="commission">
              <div className="space-y-6">
                <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
                  <CardHeader>
                    <CardTitle className="text-[hsl(0,0%,95%)]">Commission Payments</CardTitle>
                    <CardDescription className="text-[hsl(210,100%,75%)]">
                      Manage your commission payments and view payment history
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-[hsl(0,0%,95%)]">Commission Status</h3>
                        <p className="text-sm text-[hsl(210,100%,75%)]">
                          {providerProfile?.completed_jobs_since_commission || 0} out of 5 completed jobs since last payment
                        </p>
                        {providerProfile?.last_commission_paid_at && (
                          <p className="text-xs text-[hsl(210,100%,75%)] mt-1">
                            Last paid on {new Date(providerProfile.last_commission_paid_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => setShowCommissionReminder(true)}
                        className={`${providerProfile?.commission_reminder_active
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                          : 'bg-[hsl(210,100%,65%)] hover:bg-[hsl(210,100%,70%)] text-white'}`}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Pay Commission Now
                      </Button>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-[hsl(0,0%,95%)] mb-4">Payment History</h3>
                    
                    {loadingCommissionHistory ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(210,100%,65%)]"></div>
                      </div>
                    ) : commissionPayments.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-[hsl(220,20%,18%)] rounded-lg">
                        <p className="text-[hsl(210,100%,75%)] mb-2">No commission payment history found</p>
                        <p className="text-sm text-[hsl(210,100%,75%)]">
                          When you make commission payments, they will appear here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {commissionPayments.map((payment) => (
                          <div 
                            key={payment.id} 
                            className="border border-[hsl(220,20%,18%)] rounded-lg p-4 hover:bg-[hsl(220,20%,15%)] transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-[hsl(0,0%,95%)]">
                                    {formatPrice(payment.amount)}
                                  </h4>
                                  {payment.status === 'pending' && (
                                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                      Pending
                                    </Badge>
                                  )}
                                  {payment.status === 'approved' && (
                                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                                      Approved
                                    </Badge>
                                  )}
                                  {payment.status === 'rejected' && (
                                    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                                      Rejected
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-[hsl(210,100%,75%)]">
                                  Via {payment.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </p>
                                <p className="text-xs text-[hsl(210,100%,75%)] mt-1">
                                  Submitted on {new Date(payment.submitted_at).toLocaleDateString()} 
                                  {payment.reviewed_at && ` • Reviewed on ${new Date(payment.reviewed_at).toLocaleDateString()}`}
                                </p>
                                {payment.rejection_reason && (
                                  <p className="text-xs text-red-400 mt-1">
                                    Reason: {payment.rejection_reason}
                                  </p>
                                )}
                              </div>
                              
                              <div>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                                    >
                                      View Proof
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Payment Proof</DialogTitle>
                                    </DialogHeader>
                                    <div className="flex flex-col items-center justify-center p-2">
                                      <img 
                                        src={payment.screenshot_url} 
                                        alt="Payment proof" 
                                        className="max-w-full max-h-[60vh] object-contain rounded-md"
                                      />
                                      <div className="w-full text-center mt-4">
                                        <p className="font-medium">
                                          {formatPrice(payment.amount)} • {payment.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          Submitted on {new Date(payment.submitted_at).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-6 pt-6 border-t border-[hsl(220,20%,18%)]">
                      <h3 className="text-lg font-semibold text-[hsl(0,0%,95%)] mb-3">Commission Guidelines</h3>
                      <ul className="list-disc list-inside space-y-2 text-sm text-[hsl(210,100%,75%)]">
                        <li>Commission payment is required after every 5 completed jobs</li>
                        <li>The standard commission rate is 10% of your earnings</li>
                        <li>Payments are verified by our admin team within 24-48 hours</li>
                        <li>Failure to pay commission may result in account restrictions</li>
                        <li>If you have questions about your commission, please contact support</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}

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
  );
};

export default ProviderDashboard;