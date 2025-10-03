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
  Receipt,
  CheckCircle,
  XCircle,
  MessageSquare,
  Calendar,
  ArrowLeft,
  Plus,
  Heart,
  LogOut,
  Edit,
  X,
  User,
  AlertTriangle,
  Info,
  Bell
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ChatModal } from "@/components/ChatModal";
import NotificationDropdown from "@/components/NotificationDropdown";
import NotificationHistory from "@/components/NotificationHistory";
import ReviewModal from "@/components/ReviewModal";
import CancellationModal from "@/components/CancellationModal";
import MapView from "@/components/MapView";
import ProviderLocationTracker from "@/components/ProviderLocationTracker";
import { DialogClose } from "@radix-ui/react-dialog";
import SeasonalNudges from "@/components/user/SeasonalNudges";
import SmartSuggestions from "@/components/user/SmartSuggestions";
import QuickBookTiles from "@/components/user/QuickBookTiles";
import ToDoList from "@/components/user/ToDoList";
import PhoneVerificationModal from "@/components/PhoneVerificationModal";
import OTPVerificationModal from "@/components/OTPVerificationModal";

interface Booking {
   id: string;
   title: string;
   description?: string;
   status: string;
   proposed_price: number;
   final_price?: number;
   commission_amount?: number;
   location?: string;
   scheduled_date: string;
   created_at: string;
   customer_id: string;
   provider_id: string;
   service_id?: string;
   cancellation_reason?: string;
   completion_location_lat?: number;
   completion_location_lng?: number;
   location_confirmed_at?: string;
   provider_profiles?: {
     business_name: string;
     business_address?: string;
     latitude?: number;
     longitude?: number;
     phone?: string;
   };
   profiles?: {
     email: string;
     full_name: string;
   };
   // Add customer location fields
   customer_location_lat?: number;
   customer_location_lng?: number;
   customer_location_shared_at?: string;
   location_access_active?: boolean;
   // Add reviews field for checking if review exists
   reviews?: Array<{ customer_id: string }> | null;
 }

const UserDashboard = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { notifications } = useNotifications();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    phone: ''
  });
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showLocationTracker, setShowLocationTracker] = useState(false);
  const [showProviderTracker, setShowProviderTracker] = useState(false);
  const [showLocationShare, setShowLocationShare] = useState(false);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<"prompt" | "granted" | "denied" | "unavailable">("prompt");
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showFloatingChat, setShowFloatingChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{display_name: string, lat: number, lon: number}[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phone verification states
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState('');

  // Strike warning states
  const [showStrikeWarning, setShowStrikeWarning] = useState(false);
  const [showNewStrikePopup, setShowNewStrikePopup] = useState(false);
  const [newStrikeData, setNewStrikeData] = useState<{
    provider_name: string;
    reason: string;
    strike_date: string;
  } | null>(null);
  const [strikeData, setStrikeData] = useState<{
    count: number;
    recentStrikes: Array<{
      id: string;
      strike_date: string;
      reason: string;
      provider_name: string;
    }>;
    isSuspended: boolean;
    suspensionEndTime: string | null;
  } | null>(null);


  // Check location permission status on component mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationPermissionStatus("unavailable");
      return;
    }
    
    // Check permission status if possible
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
        setLocationPermissionStatus(permissionStatus.state as "prompt" | "granted" | "denied");
        
        permissionStatus.onchange = () => {
          setLocationPermissionStatus(permissionStatus.state as "prompt" | "granted" | "denied");
        };
      }).catch(() => {
        // If permission query fails, set to prompt
        setLocationPermissionStatus("prompt");
      });
    }
  }, []);

  // Request location permission
  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationPermissionStatus("granted");
        toast.success("Location access granted");
      },
      (error) => {
        console.error("Error getting location:", error);
        setLocationPermissionStatus("denied");
        toast.error("Location access denied. Please enable location services.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  // Function to automatically set user location when creating a booking
  const autoSetUserLocation = async (bookingId: string) => {
    if (!user) return;

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // Update the booking with customer location
          const { error } = await supabase
            .from('bookings')
            .update({
              customer_location_lat: latitude,
              customer_location_lng: longitude,
              customer_location_shared_at: new Date().toISOString(),
              location_access_active: true
            } as any) // Type assertion to handle missing fields in types
            .eq('id', bookingId);

          if (error) {
            console.error('Error updating booking with location:', error);
            toast.error("Failed to update booking with location");
            return;
          }

          toast.success("Your location has been automatically set for this booking");
          loadUserData(); // Reload bookings to reflect changes
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Failed to get your location. Please try again or enter manually.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    } catch (error) {
      console.error('Error setting user location:', error);
      toast.error("Failed to set your location");
    }
  };

  // Function to search for locations
  const searchLocations = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=PK`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching locations:', error);
      toast.error("Failed to search locations");
    } finally {
      setIsSearching(false);
    }
  };

  // Function to share location for a specific booking
  const shareLocationForBooking = async (booking: Booking) => {
    if (!user) return;

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // Update the booking with customer location
          const { error } = await supabase
            .from('bookings')
            .update({
              customer_location_lat: latitude,
              customer_location_lng: longitude,
              customer_location_shared_at: new Date().toISOString(),
              location_access_active: true
            } as any) // Type assertion to handle missing fields in types
            .eq('id', booking.id);

          if (error) {
            console.error('Error updating booking with location:', error);
            toast.error("Failed to share your location");
            return;
          }

          toast.success("Your location has been shared with the service provider!");
          setShowLocationShare(false);
          loadUserData(); // Reload bookings to reflect changes
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Failed to get your location. Please try again.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    } catch (error) {
      console.error('Error sharing location:', error);
      toast.error("Failed to share your location");
    }
  };

  // Function to select a location from search results
  const selectLocationFromSearch = async (location: {display_name: string, lat: number, lon: number}, booking: Booking) => {
    if (!user) return;

    try {
      // Update the booking with selected location
      const { error } = await supabase
        .from('bookings')
        .update({
          customer_location_lat: location.lat,
          customer_location_lng: location.lon,
          customer_location_shared_at: new Date().toISOString(),
          location_access_active: true
        } as any) // Type assertion to handle missing fields in types
        .eq('id', booking.id);

      if (error) {
        console.error('Error updating booking with location:', error);
        toast.error("Failed to share your location");
        return;
      }

      toast.success("Your location has been shared with the service provider!");
      setShowLocationShare(false);
      setSearchQuery("");
      setSearchResults([]);
      loadUserData(); // Reload bookings to reflect changes
    } catch (error) {
      console.error('Error sharing location:', error);
      toast.error("Failed to share your location");
    }
  };

// Cleanup search when modal closes
useEffect(() => {
  if (!showLocationShare) {
    setSearchQuery("");
    setSearchResults([]);
  }
}, [showLocationShare]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    console.log('UserDashboard: Auth state check');
    console.log('UserDashboard: isAuthenticated =', isAuthenticated);
    console.log('UserDashboard: user =', user);
    console.log('UserDashboard: loading =', loading);

    if (isAuthenticated && user) {
      // Check phone verification status
      checkPhoneVerification();
      // Check for no-show strikes
      checkNoShowStrikes();
      console.log('UserDashboard: Loading user data for', user.id);
      loadUserData();
    }
  }, [isAuthenticated, user]);

  const checkPhoneVerification = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('phone_verified, phone')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking phone verification:', error);
        return;
      }

      if (!profile?.phone_verified) {
        // Open phone verification modal instead of just showing toast
        setShowPhoneVerification(true);
      }
    } catch (error) {
      console.error('Error checking phone verification:', error);
    }
  };

  const checkNoShowStrikes = async () => {
    if (!user) return;

    try {
      // Get user's profile with strike count and suspension status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('no_show_strikes_count, is_suspended, suspension_end_time')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking strikes:', profileError);
        return;
      }

      // If user has strikes, get recent strike details
      if (profile && profile.no_show_strikes_count > 0) {
        const { data: strikesData, error: strikesError } = await (supabase as any)
          .from('user_strikes')
          .select(`
            id,
            created_at,
            strike_reason,
            provider_profiles!user_strikes_provider_id_fkey(business_name)
          `)
          .eq('user_id', user.id)
          .eq('is_no_show', true)
          .order('created_at', { ascending: false })
          .limit(5);

        if (strikesError) {
          console.error('Error fetching strike details:', strikesError);
          console.log('This might be due to RLS policy issues with user_strikes table');

          // Try fallback to no_show_strikes table if user_strikes fails
          const { data: fallbackStrikesData, error: fallbackError } = await supabase
            .from('no_show_strikes')
            .select(`
              id,
              strike_date,
              reason,
              provider_profiles!no_show_strikes_provider_id_fkey(business_name)
            `)
            .eq('user_id', user.id)
            .order('strike_date', { ascending: false })
            .limit(5);

          if (fallbackError) {
            console.error('Error fetching fallback strike details:', fallbackError);
            console.log('Both user_strikes and no_show_strikes tables failed. This indicates RLS policy issues.');
            toast.error('Unable to load strike information due to permission issues. Please contact support if this persists.');
            return;
          }

          const recentStrikes = fallbackStrikesData?.map(strike => ({
            id: strike.id,
            strike_date: strike.strike_date,
            reason: strike.reason,
            provider_name: strike.provider_profiles?.business_name || 'Unknown Provider'
          })) || [];

          setStrikeData({
            count: profile.no_show_strikes_count,
            recentStrikes,
            isSuspended: profile.is_suspended || false,
            suspensionEndTime: profile.suspension_end_time
          });

          // Show strike warning modal
          setShowStrikeWarning(true);
          return;
        }

        const recentStrikes = strikesData?.map(strike => ({
          id: strike.id,
          strike_date: strike.created_at,
          reason: strike.strike_reason,
          provider_name: strike.provider_profiles?.business_name || 'Unknown Provider'
        })) || [];

        setStrikeData({
          count: profile.no_show_strikes_count,
          recentStrikes,
          isSuspended: profile.is_suspended || false,
          suspensionEndTime: profile.suspension_end_time
        });

        // Show strike warning modal
        setShowStrikeWarning(true);
      }
    } catch (error) {
      console.error('Error checking no-show strikes:', error);
    }
  };

  // Phone verification handlers
  const handlePhoneVerificationComplete = (phoneNumber: string) => {
    setPendingPhoneNumber(phoneNumber);
    setShowPhoneVerification(false);
    setShowOTPVerification(true);
  };

  const handleOTPVerificationSuccess = async () => {
    setShowOTPVerification(false);
    setPendingPhoneNumber('');
    toast.success('Phone number verified successfully!');

    // Reload user data to refresh the dashboard
    if (user) {
      loadUserData();
    }
  };

  useEffect(() => {
    if (!user) return;

    // Set up realtime subscription for bookings and chat messages
    const channel = supabase
      .channel('user-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `customer_id=eq.${user.id}`
        },
        (payload) => {
          console.log('UserDashboard: Booking updated:', payload);
          const newBooking = payload.new as Booking;
          const oldBooking = payload.old as Booking;

          if (newBooking.status !== oldBooking.status) {
            console.log('UserDashboard: Booking status changed from', oldBooking.status, 'to', newBooking.status);
            loadUserData(); // Reload bookings

            // Show toast notifications for booking status changes
            switch (newBooking.status) {
              case 'confirmed':
                toast.success('🎉 Your booking has been confirmed by the provider!');
                break;
              case 'coming':
                toast.success('🚗 Provider is on the way to your location!', {
                  duration: 8000, // Show longer for important updates
                  style: {
                    background: '#f97316',
                    color: 'white',
                  }
                });
                break;
              case 'rejected':
                toast.error('Your booking was rejected by the provider.');
                break;
              case 'completed':
                toast.success('✅ Your service has been completed!');
                // Automatically show review modal for completed bookings
                setSelectedBooking(newBooking);
                setShowReviewModal(true);
                break;
              case 'cancelled':
                toast.error('Your booking was cancelled.');
                break;
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `sender_id=neq.${user.id}` // Only get messages from others (providers)
        },
        (payload) => {
          console.log('UserDashboard: New message received:', payload);
          // Reload bookings to get updated chat context
          loadUserData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
          // No filter here - we want to know about ALL messages for this user's bookings
        },
        (payload) => {
          console.log('UserDashboard: Chat message update detected:', payload);
          const newMessage = payload.new;

          // Check if this message is for one of our bookings
          const relevantBooking = bookings.find(b => b.id === newMessage.booking_id);
          if (relevantBooking) {
            console.log('UserDashboard: Message is for our booking, reloading data');
            loadUserData();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('UserDashboard: New notification received:', payload);
          // Refresh notifications in context
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('refreshNotifications'));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('UserDashboard: Notification updated:', payload);
          // Refresh notifications in context
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('refreshNotifications'));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_strikes',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('UserDashboard: New strike received:', payload);
          const newStrike = payload.new;

          // Show new strike popup
          setNewStrikeData({
            provider_name: newStrike.provider_profiles?.business_name || 'Provider',
            reason: newStrike.strike_reason || 'No-show recorded',
            strike_date: newStrike.created_at
          });
          setShowNewStrikePopup(true);

          // Refresh strike data
          checkNoShowStrikes();

          // Play notification sound if available
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Strike Recorded', {
              body: `You received a no-show strike from ${newStrike.provider_profiles?.business_name || 'a provider'}`,
              icon: '/favicon.ico'
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('UserDashboard: Profile updated:', payload);
          const updatedProfile = payload.new;

          // Check if suspension status changed
          if (updatedProfile.is_suspended !== payload.old?.is_suspended) {
            if (updatedProfile.is_suspended) {
              toast.error('⚠️ Your account has been suspended due to multiple no-show strikes. You can use the platform again after 48 hours.', {
                duration: 10000
              });
            } else {
              toast.success('✅ Your account suspension has been lifted. You can now book services again.');
            }
            // Refresh strike data to get updated suspension status
            checkNoShowStrikes();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadUserData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      console.log('UserDashboard: Starting to load user data for user:', user.id);

      // Load bookings first
       const { data: bookingsData, error: bookingsError } = await supabase
         .from('bookings')
         .select(`
           *,
           reviews!left(customer_id)
         `)
         .eq('customer_id', user.id)
         .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('UserDashboard: Bookings error:', bookingsError);
        throw bookingsError;
      }

      if (!bookingsData || bookingsData.length === 0) {
        setBookings([]);
        return;
      }

      // Get unique provider IDs from bookings
      const providerIds = [...new Set(bookingsData.map(booking => booking.provider_id))];

      // Load provider profiles separately
      const { data: providerProfilesData, error: profilesError } = await supabase
        .from('provider_profiles')
        .select('user_id, business_name, business_address, phone, latitude, longitude')
        .in('user_id', providerIds);

      if (profilesError) {
        console.error('UserDashboard: Provider profiles error:', profilesError);
        // Continue without provider profiles data
      }

      // Create a map for easy lookup
      const providerProfilesMap = (providerProfilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Combine bookings with provider profiles
      const bookingsWithProfiles = bookingsData.map(booking => ({
        ...booking,
        provider_profiles: providerProfilesMap[booking.provider_id] || null
      }));

      if (bookingsError) {
        console.error('UserDashboard: Bookings error:', bookingsError);
        throw bookingsError;
      }

      console.log('UserDashboard: Loaded bookings data:', bookingsWithProfiles?.length || 0, 'bookings');
      setBookings(bookingsWithProfiles as unknown as Booking[]);
    } catch (error: any) {
      console.error('UserDashboard: Error loading user data:', error);
      setError("Failed to load dashboard data. Please refresh the page.");
      toast.error("Failed to load bookings: " + error.message);
    } finally {
      console.log('UserDashboard: Finished loading, setting loading to false');
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    setEditFormData({
      full_name: user.full_name || '',
      phone: user.phone || ''
    });
    setShowEditProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    if (!editFormData.full_name.trim()) {
      toast.error("Full name is required");
      return;
    }
    
    setEditLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editFormData.full_name,
          phone: editFormData.phone
        })
        .eq('user_id', user.id);
      
      if (error) {
        toast.error("Failed to update profile: " + error.message);
        return;
      }
      
      toast.success("Profile updated successfully!");
      setShowEditProfile(false);
      // Refresh auth context by reloading the page or triggering a re-fetch
      window.location.reload();
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Failed to update profile");
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelBooking = (booking: Booking) => {
    if (!user) return;

    // Open the cancellation modal instead of using confirm dialog
    setSelectedBooking(booking);
    setShowCancellationModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Confirmed</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Accepted</Badge>;
      case 'coming':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">Coming</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Function to show provider location on map
  const showProviderLocation = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowLocationTracker(true);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getNextMonday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // If Sunday (0), next Monday is 1 day, otherwise 8 - current day
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    return nextMonday;
  };

  const handleCallProvider = (booking: Booking) => {
    if (booking.provider_profiles?.phone) {
      window.open(`tel:${booking.provider_profiles.phone}`);
    } else {
      toast.error("Provider phone number not available");
    }
  };

  const handleMarkAsCompleted = async (booking: Booking) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success("Service marked as completed!");
      loadUserData(); // Reload bookings to reflect changes
    } catch (error: any) {
      toast.error("Failed to mark service as completed: " + error.message);
    }
  };

  const handleRateService = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowReviewModal(true);
  };

  // Add this debugging function
  const checkAuthentication = () => {
    console.log('UserDashboard: Checking authentication before render');
    console.log('UserDashboard: isAuthenticated =', isAuthenticated);
    console.log('UserDashboard: user =', user);
    console.log('UserDashboard: user?.user_type =', user?.user_type);
    
    if (!isAuthenticated) {
      console.log('UserDashboard: Not authenticated, redirecting to home');
      return false;
    }
    
    return true;
  };

  if (loading) {
    console.log('UserDashboard: Still loading...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    console.log('UserDashboard: Showing error state:', error);
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Dashboard Error</h2>
          <p className="text-red-400 mb-6">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  // Check authentication before rendering dashboard
  if (!checkAuthentication()) {
    console.log('UserDashboard: Redirecting to home page');
    return <Navigate to="/" />;
  }

  // Make sure we only allow customers to access this dashboard
  if (user?.user_type !== 'customer') {
    console.log('UserDashboard: User is not a customer, redirecting to appropriate dashboard');
    if (user?.user_type === 'provider') {
      return <Navigate to="/provider-dashboard" />;
    } else if (user?.user_type === 'admin') {
      return <Navigate to="/admin-dashboard" />;
    }
    return <Navigate to="/" />;
  }

  // Add function to handle rebooking with auto location
  const handleRebookService = async (booking: Booking) => {
    if (!user) return;

    try {
      // Create a new booking based on the previous one
      const { data: newBooking, error } = await supabase
        .from('bookings')
        .insert({
          title: booking.title,
          description: booking.description || `${booking.title} (rebooked from previous service)`,
          customer_id: user.id,
          provider_id: booking.provider_id,
          service_id: booking.service_id,
          proposed_price: booking.final_price || booking.proposed_price,
          location: booking.location || '',
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // If user has granted location permission, automatically set their location
      if (locationPermissionStatus === "granted" && userLocation) {
        await autoSetUserLocation(newBooking.id);
      }

      // Create notification for provider
      await supabase
        .from('notifications')
        .insert({
          user_id: booking.provider_id,
          title: "New Booking Request",
          content: `New booking request for ${booking.title} from a returning customer`,
          type: "new_booking",
          booking_id: newBooking.id
        });

      toast.success("Service rebooked successfully! Provider has been notified.");
      loadUserData(); // Reload bookings to show the new one
    } catch (error) {
      console.error('Error rebooking service:', error);
      toast.error("Failed to rebook service. Please try again.");
    }
  };


  try {
    return (
      <div className="min-h-screen bg-slate-900 text-white relative overflow-hidden">



        {/* Header */}
        <header className="border-b border-slate-700 bg-slate-800 relative z-10">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold">User Dashboard</h1>
            </div>

            <div className="flex items-center gap-4">
              <NotificationDropdown />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

      <div className="container py-6">
        {/* Welcome Section with Stats Cards */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Aslamaulikum, {user?.full_name || 'User'}!
              </h2>
              <p className="text-slate-300 text-lg">Here's your service booking overview</p>
            </div>
          </div>

          {/* Quick Stats Cards at the top */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            <Card className="bg-slate-800 border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300 group-hover:text-blue-400 transition-colors">Active Bookings</CardTitle>
                <Clock className="h-4 w-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white group-hover:text-blue-300 transition-colors">
                  {bookings.filter(b => b.status === 'confirmed' || b.status === 'accepted').length}
                </div>
                <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Currently in progress</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300 group-hover:text-green-400 transition-colors">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-400 group-hover:text-green-300 transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white group-hover:text-green-300 transition-colors">
                  {bookings.filter(b => b.status === 'completed').length}
                </div>
                <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Successfully finished</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300 group-hover:text-purple-400 transition-colors">Total Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-slate-400 group-hover:text-purple-300 transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white group-hover:text-purple-300 transition-colors">{bookings.length}</div>
                <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">All time bookings</p>
              </CardContent>
            </Card>

            {/* Strikes Card */}
            <Card className={`shadow-sm transition-all duration-300 hover:scale-105 group ${
              strikeData && strikeData.count > 0
                ? strikeData.count >= 3
                  ? 'bg-red-900/20 border-red-700'
                  : 'bg-orange-900/20 border-orange-700'
                : 'bg-slate-800 border-slate-700'
            }`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={`text-sm font-medium transition-colors group-hover:scale-105 ${
                  strikeData && strikeData.count > 0
                    ? strikeData.count >= 3
                      ? 'text-red-300 group-hover:text-red-200'
                      : 'text-orange-300 group-hover:text-orange-200'
                    : 'text-slate-300 group-hover:text-blue-400'
                }`}>
                  {strikeData && strikeData.count >= 3 ? '🚫 Suspended' : '⚠️ Strikes'}
                </CardTitle>
                <AlertTriangle className={`h-4 w-4 transition-colors ${
                  strikeData && strikeData.count > 0
                    ? strikeData.count >= 3
                      ? 'text-red-400 group-hover:text-red-300'
                      : 'text-orange-400 group-hover:text-orange-300'
                    : 'text-blue-400 group-hover:text-blue-300'
                }`} />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold transition-colors ${
                  strikeData && strikeData.count > 0
                    ? strikeData.count >= 3
                      ? 'text-red-300 group-hover:text-red-200'
                      : 'text-orange-300 group-hover:text-orange-200'
                    : 'text-white group-hover:text-blue-300'
                }`}>
                  {strikeData ? strikeData.count : 0}
                </div>
                <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                  {strikeData && strikeData.count >= 3
                    ? 'Account suspended'
                    : strikeData && strikeData.count > 0
                      ? `${3 - strikeData.count} until suspension`
                      : 'No strikes this week'
                  }
                </p>
                {strikeData && strikeData.isSuspended && strikeData.suspensionEndTime && (
                  <p className="text-xs text-red-400 mt-1">
                    Until: {new Date(strikeData.suspensionEndTime).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions & Smart Features */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Active Conversations */}
          <Card className="lg:col-span-2 bg-slate-800 border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 group">
            <CardHeader className="group-hover:bg-slate-700/50 transition-colors">
              <CardTitle className="flex items-center gap-2 group-hover:text-blue-300 transition-colors">
                <MessageSquare className="h-5 w-5 text-blue-400 group-hover:text-blue-300 transition-colors animate-pulse" />
                Active Conversations
              </CardTitle>
              <CardDescription className="group-hover:text-slate-200 transition-colors">
                Quick access to your ongoing chats and negotiations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bookings.filter(b => b.status === 'pending' || b.status === 'negotiating' || b.status === 'confirmed' || b.status === 'accepted').length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-16 w-16 text-slate-500 mx-auto mb-4 animate-bounce" />
                  <p className="text-slate-400 mb-4 text-lg">No active conversations</p>
                  <Button
                    onClick={() => navigate("/")}
                    size="lg"
                    className="transition-all duration-200 hover:scale-105 active:scale-95 bg-blue-600 hover:bg-blue-700"
                  >
                    Browse Services to Start Chatting
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Show "coming" bookings first */}
                  {bookings
                    .filter(b => b.status === 'coming')
                    .map((booking, index) => (
                      <div
                        key={booking.id}
                        className="border-2 border-orange-200 rounded-lg p-4 hover:bg-orange-50 transition-all duration-300 cursor-pointer bg-orange-50/50 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-400/20 group/item"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between">
                            <h4 className="font-semibold text-base text-gray-900 group-hover/item:text-orange-700 transition-colors flex items-center gap-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                              {booking.title}
                            </h4>
                            <Badge className="bg-orange-100 text-orange-800 border-orange-300 group-hover/item:border-orange-400 group-hover/item:text-orange-900 transition-colors">
                              <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse mr-1"></div>
                              Coming
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 group-hover/item:text-gray-700 transition-colors">
                            {booking.provider_profiles?.business_name || 'Provider'} is on the way!
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-100 transition-all duration-200 hover:scale-105"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBooking(booking);
                                setShowProviderTracker(true);
                              }}
                            >
                              <MapPin className="h-3 w-3 mr-1" />
                              Track
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-100 transition-all duration-200 hover:scale-105"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBooking(booking);
                                setShowChat(true);
                              }}
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Chat
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                  {/* Then show other active bookings */}
                  {bookings
                    .filter(b => b.status === 'pending' || b.status === 'negotiating' || b.status === 'confirmed' || b.status === 'accepted')
                    .slice(0, 4)
                    .map((booking, index) => (
                      <div
                        key={booking.id}
                        className="border border-slate-600 rounded-lg p-4 hover:bg-slate-700/50 transition-all duration-300 cursor-pointer bg-slate-700/30 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-400/20 group/item"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between">
                            <h4 className="font-semibold text-base text-white group-hover/item:text-blue-300 transition-colors">{booking.title}</h4>
                            <Badge variant="outline" className="text-xs border-blue-400 text-blue-300 group-hover/item:border-blue-300 group-hover/item:text-blue-200 transition-colors">
                              {booking.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-300 group-hover/item:text-slate-200 transition-colors">
                            {booking.provider_profiles?.business_name || 'Provider'}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white transition-all duration-200 hover:scale-105"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBooking(booking);
                                setShowChat(true);
                              }}
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Chat
                            </Button>
                            {booking.status === 'confirmed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white transition-all duration-200 hover:scale-105"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBooking(booking);
                                  setShowProviderTracker(true);
                                }}
                              >
                                <MapPin className="h-3 w-3" />
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

          {/* Smart Suggestions */}
          <div className="space-y-4">
            <div>
              <SmartSuggestions userId={user.id} bookings={bookings} />
            </div>
            <div className="hover:scale-105 transition-transform duration-300">
              <QuickBookTiles />
            </div>
          </div>
        </div>

        {/* Seasonal Nudges */}
        <div className="mb-8">
          <SeasonalNudges />
        </div>

        {/* To-Do List */}
        <div className="mb-8">
          <ToDoList />
        </div>

        {/* Location Tracker Modal */}
        {selectedBooking && showLocationTracker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-semibold">Confirm Your Location</h3>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowLocationTracker(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 p-4">
                <div className="mb-4">
                  <h4 className="font-medium">{selectedBooking.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    Please confirm your location so the provider can find you easily
                  </p>
                </div>
                
                {/* Auto Location Button */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {locationPermissionStatus !== "granted" ? (
                    <Button 
                      onClick={requestLocationPermission}
                      variant="outline"
                      size="sm"
                      disabled={locationPermissionStatus === "unavailable"}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      {locationPermissionStatus === "unavailable" 
                        ? "Location Unavailable" 
                        : "Enable Auto Location"}
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => autoSetUserLocation(selectedBooking.id)}
                      variant="outline"
                      size="sm"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Use My Current Location
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Reset any manual location input if needed
                    }}
                  >
                    Enter Location Manually
                  </Button>
                </div>
                
                <div className="h-96 rounded-lg overflow-hidden border">
                  <MapView 
                    services={[{
                      id: selectedBooking.id,
                      title: selectedBooking.title,
                      provider_id: selectedBooking.provider_id,
                      provider_profiles: selectedBooking.provider_profiles
                    }]}
                    onServiceSelect={() => {}}
                    showCompletionLocations={true}
                    userLocation={userLocation || undefined}
                    onLocationChange={(lat, lng) => {
                      // Handle manual location selection if needed
                      setUserLocation({ lat, lng });
                    }}
                  />
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Blue marker: Provider location
                  </p>
                  <p>
                    <MapPin className="h-4 w-4 inline mr-1" style={{ color: '#8b5cf6' }} />
                    Purple marker: Service completion location
                  </p>
                  {userLocation && (
                    <p>
                      <MapPin className="h-4 w-4 inline mr-1" style={{ color: '#3b82f6' }} />
                      Your location (auto-detected)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Provider Tracker Modal */}
        {selectedBooking && showProviderTracker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-semibold">Track Your Service</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowProviderTracker(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                <ProviderLocationTracker
                  booking={selectedBooking}
                  onCallProvider={() => handleCallProvider(selectedBooking)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Location Share Modal */}
        {selectedBooking && showLocationShare && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-semibold">Share Your Location</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLocationShare(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 p-4">
                <div className="mb-4">
                  <h4 className="font-medium">{selectedBooking.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    Share your current location to help the service provider find you easily
                  </p>
                </div>

                {/* Location Search */}
                <div className="mb-4">
                  <Label htmlFor="location-search" className="text-sm font-medium mb-2 block">
                    Search for a location
                  </Label>
                  <div className="relative">
                    <Input
                      id="location-search"
                      placeholder="Enter address, city, or landmark..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchLocations(e.target.value);
                      }}
                      className="pr-10"
                    />
                    <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                      {searchResults.map((result, index) => (
                        <button
                          key={index}
                          onClick={() => selectLocationFromSearch(result, selectedBooking)}
                          className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                        >
                          <div className="text-sm font-medium text-gray-900">{result.display_name.split(',')[0]}</div>
                          <div className="text-xs text-gray-500 truncate">{result.display_name}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {isSearching && (
                    <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      Searching...
                    </div>
                  )}
                </div>

                {/* Location Permission and Sharing Options */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {locationPermissionStatus !== "granted" ? (
                    <Button
                      onClick={requestLocationPermission}
                      variant="outline"
                      size="sm"
                      disabled={locationPermissionStatus === "unavailable"}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      {locationPermissionStatus === "unavailable"
                        ? "Location Unavailable"
                        : "Enable Location Access"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => shareLocationForBooking(selectedBooking)}
                      variant="default"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Share My Current Location
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Could open a map picker here for manual location selection
                      toast.info("Manual location selection coming soon!");
                    }}
                  >
                    Select Location on Map
                  </Button>
                </div>

                {/* Show current location status */}
                {selectedBooking.customer_location_lat && selectedBooking.customer_location_lng && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✅ Your location is already shared for this booking
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Shared on: {new Date(selectedBooking.customer_location_shared_at || '').toLocaleString()}
                    </p>
                  </div>
                )}

                <div className="h-96 rounded-lg overflow-hidden border">
                  <MapView
                    services={[{
                      id: selectedBooking.id,
                      title: selectedBooking.title,
                      provider_id: selectedBooking.provider_id,
                      provider_profiles: selectedBooking.provider_profiles
                    }]}
                    onServiceSelect={() => {}}
                    showCompletionLocations={false}
                    userLocation={userLocation || undefined}
                    onLocationChange={(lat, lng) => {
                      setUserLocation({ lat, lng });
                    }}
                  />
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Blue marker: Provider location
                  </p>
                  {userLocation && (
                    <p>
                      <MapPin className="h-4 w-4 inline mr-1" style={{ color: '#3b82f6' }} />
                      Your current location (if detected)
                    </p>
                  )}
                  <p className="mt-2 text-xs">
                    💡 Sharing your location helps the service provider navigate to you more efficiently.
                    Your location data is only shared with your assigned provider and expires after the service is completed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Main Content Tabs */}
        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-700 p-1 rounded-lg">
            <TabsTrigger value="current" className="data-[state=active]:bg-slate-600 data-[state=active]:shadow-sm text-slate-300">
              <Clock className="h-4 w-4 mr-2" />
              Current Bookings
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-slate-600 data-[state=active]:shadow-sm text-slate-300">
              <Calendar className="h-4 w-4 mr-2" />
              Booking History
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-slate-600 data-[state=active]:shadow-sm text-slate-300">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-slate-600 data-[state=active]:shadow-sm text-slate-300">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
          </TabsList>
          
          {/* Current Bookings Tab */}
          <TabsContent value="current" className="mt-6">
            <Card className="shadow-sm border-slate-700 bg-slate-800">
              <CardHeader className="bg-slate-700 border-b border-slate-600">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Clock className="h-5 w-5 text-blue-400" />
                  Your Current Bookings
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Track your active service requests and appointments
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {/* Show "Coming" bookings prominently at the top */}
                {bookings.filter(b => b.status === 'coming').length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                      Services In Progress
                    </h3>
                    <div className="space-y-4">
                      {bookings
                        .filter(b => b.status === 'coming')
                        .map((booking) => (
                          <div key={booking.id} className="border-2 border-orange-200 rounded-xl p-4 bg-orange-50 shadow-sm">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-bold text-lg text-gray-900">{booking.title}</h4>
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse mr-1"></div>
                                      Provider Coming
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-orange-700 mb-2">
                                  {booking.provider_profiles?.business_name || 'Your provider'} is on the way to your location!
                                </p>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4 text-orange-500" />
                                    {booking.location}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Receipt className="h-4 w-4 text-green-500" />
                                    {formatPrice(booking.final_price || booking.proposed_price)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowProviderTracker(true);
                                  }}
                                  className="bg-orange-600 hover:bg-orange-700 text-white"
                                >
                                  <MapPin className="h-4 w-4 mr-2" />
                                  Track Provider
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowLocationShare(true);
                                  }}
                                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                                >
                                  <MapPin className="h-4 w-4 mr-2" />
                                  Share Location
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowChat(true);
                                  }}
                                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Chat
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleCancelBooking(booking)}
                                  className="transition-all duration-200 hover:scale-105 active:scale-95"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {bookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled' && b.status !== 'coming').length === 0 && bookings.filter(b => b.status === 'coming').length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                      <Calendar className="h-10 w-10 text-blue-600" />
                    </div>
                    <p className="text-muted-foreground mb-6 text-lg">You don't have any current bookings</p>
                    <Button
                      onClick={() => navigate("/")}
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      Browse Services
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {bookings
                      .filter(b => b.status !== 'completed' && b.status !== 'cancelled')
                      .map((booking) => (
                        <div key={booking.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200 bg-white">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <h3 className="font-bold text-xl text-gray-900">{booking.title}</h3>
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(booking.status)}
                                  {booking.status === 'coming' && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                      Provider On The Way
                                    </div>
                                  )}
                                </div>
                              </div>
                              <p className="text-gray-600 mb-4">
                                Provider: <span className="font-semibold">{booking.provider_profiles?.business_name || 'Unknown'}</span>
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Calendar className="h-4 w-4 text-blue-500" />
                                  <span>{formatDate(booking.scheduled_date || booking.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Receipt className="h-4 w-4 text-green-500" />
                                  <span className="font-semibold">{formatPrice(booking.final_price || booking.proposed_price)}</span>
                                  {booking.status === 'completed' && booking.commission_amount && (
                                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                      Commission: {formatPrice(booking.commission_amount)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-purple-500" />
                                  <span className="text-gray-600">{booking.location}</span>
                                </div>
                              </div>

                              {/* Special information for "coming" status */}
                              {booking.status === 'coming' && (
                                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                                      <MapPin className="h-4 w-4 text-orange-600" />
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-orange-800 mb-1">Provider is on the way! 🚗</h4>
                                      <p className="text-sm text-orange-700 mb-2">
                                        {booking.provider_profiles?.business_name || 'Your provider'} is heading to your location.
                                      </p>
                                      <div className="text-xs text-orange-600 space-y-1">
                                        <p>💡 <strong>Tip:</strong> Make sure you're available at the scheduled location</p>
                                        <p>📍 <strong>Share your location</strong> to help the provider find you easily</p>
                                        <p>📞 <strong>Keep your phone nearby</strong> in case the provider needs to contact you</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-3">
                              {(booking.status === 'confirmed' || booking.status === 'accepted' || booking.status === 'coming' || booking.status === 'in_progress') && (
                                <>
                                  {(booking.status === 'confirmed' || booking.status === 'coming') && (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedBooking(booking);
                                        setShowProviderTracker(true);
                                      }}
                                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 transition-all duration-200 hover:scale-105 active:scale-95"
                                    >
                                      <MapPin className="h-4 w-4 mr-2" />
                                      {booking.status === 'coming' ? '🚗 Track Provider' : 'Track Service'}
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedBooking(booking);
                                      setShowLocationShare(true);
                                    }}
                                    className="border-green-200 text-green-700 hover:bg-green-50 transition-all duration-200 hover:scale-105 active:scale-95"
                                  >
                                    <MapPin className="h-4 w-4 mr-2" />
                                    Share Location
                                  </Button>
                                </>
                              )}

                              {(booking.status === 'confirmed' || booking.status === 'accepted' || booking.status === 'pending' || booking.status === 'negotiating' || booking.status === 'in_progress') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowChat(true);
                                  }}
                                  className="border-blue-200 text-blue-700 hover:bg-blue-50 transition-all duration-200 hover:scale-105 active:scale-95"
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Chat
                                </Button>
                              )}

                              {booking.status === 'completed' && !booking.location_confirmed_at && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowLocationTracker(true);
                                  }}
                                  className="border-orange-200 text-orange-700 hover:bg-orange-50 transition-all duration-200 hover:scale-105 active:scale-95"
                                >
                                  <MapPin className="h-4 w-4 mr-2" />
                                  Confirm Location
                                </Button>
                              )}

                              {booking.status === 'completed' && booking.location_confirmed_at && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowLocationTracker(true);
                                  }}
                                  className="border-blue-200 text-blue-700 hover:bg-blue-50 transition-all duration-200 hover:scale-105 active:scale-95"
                                >
                                  <MapPin className="h-4 w-4 mr-2" />
                                  View Location
                                </Button>
                              )}

                              {(booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'accepted' || booking.status === 'coming' || booking.status === 'negotiating') && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleCancelBooking(booking)}
                                  className="transition-all duration-200 hover:scale-105 active:scale-95"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel Booking
                                </Button>
                              )}

                              {booking.status === 'cancelled' && booking.cancellation_reason && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowCancellationModal(true);
                                  }}
                                  className="border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:scale-105 active:scale-95"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  View Reason
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
          </TabsContent>
          
          {/* Booking History Tab */}
          <TabsContent value="history" className="mt-6">
            <Card className="shadow-sm border-slate-700 bg-slate-800">
              <CardHeader className="bg-slate-700 border-b border-slate-600">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Calendar className="h-5 w-5 text-green-400" />
                  Booking History
                </CardTitle>
                <CardDescription className="text-slate-300">
                  View your past bookings and rebook services
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {bookings.filter(b => b.status === 'completed' || b.status === 'cancelled').length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
                      <Calendar className="h-10 w-10 text-green-600" />
                    </div>
                    <p className="text-muted-foreground text-lg">You don't have any booking history yet</p>
                    <p className="text-muted-foreground text-sm mt-2">Complete some services to see your history here</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {bookings
                      .filter(b => b.status === 'completed' || b.status === 'cancelled')
                      .map((booking) => (
                        <div key={booking.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200 bg-white">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <h3 className="font-bold text-xl text-gray-900">{booking.title}</h3>
                                {getStatusBadge(booking.status)}
                              </div>
                              <p className="text-gray-600 mb-4">
                                Provider: <span className="font-semibold">{booking.provider_profiles?.business_name || 'Unknown'}</span>
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Calendar className="h-4 w-4 text-blue-500" />
                                  <span>{formatDate(booking.scheduled_date || booking.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Receipt className="h-4 w-4 text-green-500" />
                                  <span className="font-semibold">{formatPrice(booking.final_price || booking.proposed_price)}</span>
                                  {booking.status === 'completed' && booking.commission_amount && (
                                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                      Commission: {formatPrice(booking.commission_amount)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-purple-500" />
                                  <span className="text-gray-600">{booking.location}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              {(booking.status === 'completed' || booking.status === 'cancelled') && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleRebookService(booking)}
                                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 hover:scale-105 active:scale-95"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Rebook Service
                                  </Button>
                                  {/* Only show rating button if no review exists */}
                                  {!booking.reviews || booking.reviews.length === 0 ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleRateService(booking)}
                                      className="border-yellow-200 text-yellow-700 hover:bg-yellow-50 transition-all duration-200 hover:scale-105 active:scale-95"
                                    >
                                      <Star className="h-4 w-4 mr-2" />
                                      Rate Service
                                    </Button>
                                  ) : (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                                      <Star className="h-4 w-4 text-green-600 fill-green-600" />
                                      <span className="text-sm text-green-700 font-medium">Reviewed</span>
                                    </div>
                                  )}
                                </>
                              )}

                              {booking.status === 'cancelled' && booking.cancellation_reason && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowCancellationModal(true);
                                  }}
                                  className="border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:scale-105 active:scale-95"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  View Reason
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
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-6">
            <NotificationHistory />
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6">
            <Card className="shadow-sm border-slate-700 bg-slate-800">
              <CardHeader className="bg-slate-700 border-b border-slate-600">
                <CardTitle className="flex items-center gap-2 text-white">
                  <User className="h-5 w-5 text-purple-400" />
                  Profile Settings
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Manage your profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center gap-6 mb-8">
                  <Avatar className="h-20 w-20 ring-4 ring-purple-100">
                    {user?.avatar_url ? (
                      <AvatarImage src={user.avatar_url} alt={user.full_name || "User"} />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 text-white text-2xl">
                        {user?.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-2xl text-gray-900">{user?.full_name || "User"}</h3>
                    <p className="text-gray-600 text-lg">{user?.email}</p>
                    <p className="text-sm text-purple-600 font-medium mt-1">Customer Account</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">Full Name</Label>
                    <Input
                      id="fullName"
                      value={user?.full_name || ""}
                      readOnly
                      className="mt-1 bg-gray-50 border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ""}
                      readOnly
                      className="mt-1 bg-gray-50 border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
                    <Input
                      id="phone"
                      value={user?.phone || ""}
                      readOnly
                      className="mt-1 bg-gray-50 border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Account Type</Label>
                    <Input
                      value="Customer"
                      readOnly
                      className="mt-1 bg-purple-50 border-purple-200 text-purple-700 font-medium"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleEditProfile}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/")}
                    className="border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    Browse Services
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editFullName">Full Name</Label>
              <Input
                id="editFullName"
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({...editFormData, full_name: e.target.value})}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label htmlFor="editPhone">Phone</Label>
              <Input
                id="editPhone"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                placeholder="Enter your phone number"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowEditProfile(false)}
                className="transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveProfile}
                disabled={editLoading}
                className="transition-all duration-200 hover:scale-105 active:scale-95"
              >
                {editLoading ? <LoadingSpinner /> : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Modal */}
      {selectedBooking && (
        <ChatModal
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          booking={selectedBooking}
        />
      )}

      {/* Review Modal */}
      {selectedBooking && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          booking={selectedBooking}
          onReviewSubmitted={() => loadUserData()}
        />
      )}

      {/* Cancellation Modal */}
      {selectedBooking && (
        <CancellationModal
          isOpen={showCancellationModal}
          onClose={() => setShowCancellationModal(false)}
          booking={selectedBooking}
          userType="customer"
          onCancellationConfirmed={() => loadUserData()}
        />
      )}

      {/* Phone Verification Modals */}
      <PhoneVerificationModal
        isOpen={showPhoneVerification}
        onClose={() => {
          // Don't allow closing until phone is verified
          if (!user) {
            setShowPhoneVerification(false);
            return;
          }
          // Check if phone is verified before allowing close
          supabase
            .from('profiles')
            .select('phone_verified')
            .eq('user_id', user.id)
            .maybeSingle()
            .then(({ data }) => {
              if (data?.phone_verified) {
                setShowPhoneVerification(false);
              } else {
                toast.error("Phone verification is required to use the dashboard. Please verify your phone number.");
              }
            });
        }}
        onVerificationComplete={handlePhoneVerificationComplete}
        userId={user?.id || ''}
      />

      <OTPVerificationModal
        isOpen={showOTPVerification}
        onClose={() => {
          // Don't allow closing until phone is verified
          if (!user) {
            setShowOTPVerification(false);
            return;
          }
          // Check if phone is verified before allowing close
          supabase
            .from('profiles')
            .select('phone_verified')
            .eq('user_id', user.id)
            .maybeSingle()
            .then(({ data }) => {
              if (data?.phone_verified) {
                setShowOTPVerification(false);
              } else {
                toast.error("Please complete phone verification to continue using the dashboard.");
              }
            });
        }}
        onVerificationSuccess={handleOTPVerificationSuccess}
        phoneNumber={pendingPhoneNumber}
        userId={user?.id || ''}
      />

      {/* Strike Warning Modal */}
      {strikeData && (
        <Dialog open={showStrikeWarning} onOpenChange={setShowStrikeWarning}>
          <DialogContent className="sm:max-w-lg bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                No-Show Warning
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-orange-900/20 border border-orange-600 rounded-lg">
                <div className="flex items-center gap-2 text-orange-400 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-semibold">You have {strikeData.count} no-show strike{strikeData.count !== 1 ? 's' : ''} this week</span>
                </div>
                <p className="text-sm text-gray-300">
                  After 3 strikes, your account will be disabled for 48 hours to protect providers' time.
                </p>
              </div>

              {strikeData.recentStrikes.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-white font-medium">Recent Strikes:</h4>
                  <div className="space-y-2">
                    {strikeData.recentStrikes.map((strike, index) => (
                      <div key={strike.id} className="p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-sm text-gray-300">
                              Strike {index + 1}: {strike.provider_name}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(strike.strike_date).toLocaleDateString()}
                          </span>
                        </div>
                        {strike.reason && (
                          <p className="text-xs text-gray-400 mt-1 ml-4">
                            Reason: {strike.reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <Info className="h-4 w-4" />
                  <span className="font-semibold text-sm">How to avoid strikes:</span>
                </div>
                <div className="text-xs text-gray-300 space-y-1">
                  <p>• Cancel bookings at least 2 hours in advance if you can't make it</p>
                  <p>• Communicate with your provider if you're running late</p>
                  <p>• Only book services you intend to use</p>
                  <p>• Be available at the scheduled time and location</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-300">
                <span>Strikes reset every Monday at 12:00 AM</span>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setShowStrikeWarning(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                I Understand
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* New Strike Popup Modal */}
      {newStrikeData && (
        <Dialog open={showNewStrikePopup} onOpenChange={setShowNewStrikePopup}>
          <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
                New Strike Recorded
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-red-900/20 border border-red-600 rounded-lg">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <XCircle className="h-4 w-4" />
                  <span className="font-semibold">No-Show Strike Added</span>
                </div>
                <p className="text-sm text-gray-300 mb-2">
                  <strong>{newStrikeData.provider_name}</strong> reported that you didn't show up for your scheduled service.
                </p>
                {newStrikeData.reason && (
                  <p className="text-xs text-gray-400">
                    Reason: {newStrikeData.reason}
                  </p>
                )}
              </div>

              <div className="bg-orange-900/20 border border-orange-600 rounded-lg p-3">
                <div className="flex items-center gap-2 text-orange-400 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-semibold text-sm">Strike Consequences:</span>
                </div>
                <div className="text-xs text-gray-300 space-y-1">
                  <p>• Strike {strikeData?.count || 1} of 3 recorded this week</p>
                  <p>• {3 - (strikeData?.count || 0)} strikes remaining until suspension</p>
                  <p>• After 3 strikes: 48-hour account suspension</p>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <Info className="h-4 w-4" />
                  <span className="font-semibold text-sm">How to avoid future strikes:</span>
                </div>
                <div className="text-xs text-gray-300 space-y-1">
                  <p>• Cancel at least 2 hours before if you can't make it</p>
                  <p>• Communicate delays to your provider</p>
                  <p>• Only book services you can attend</p>
                </div>
              </div>

              <div className="text-center text-sm text-gray-400">
                <p>⏰ Strikes reset every Monday at 12:00 AM</p>
                <p className="mt-1">📅 Next reset: {getNextMonday().toLocaleDateString()}</p>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => {
                  setShowNewStrikePopup(false);
                  setNewStrikeData(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                I Understand
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Floating Chat Button - Most Accessible */}
      {bookings.filter(b => b.status === 'pending' || b.status === 'negotiating' || b.status === 'confirmed' || b.status === 'accepted' || b.status === 'in_progress').length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 bg-primary hover:bg-primary/90"
            onClick={() => {
              // Open the most recent active booking's chat
              const activeBooking = bookings
                .filter(b => b.status === 'pending' || b.status === 'negotiating' || b.status === 'confirmed' || b.status === 'accepted' || b.status === 'in_progress')
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
              if (activeBooking) {
                setSelectedBooking(activeBooking);
                setShowChat(true);
              }
            }}
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
          {/* Chat notification indicator */}
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
            {bookings.filter(b => b.status === 'pending' || b.status === 'negotiating' || b.status === 'confirmed' || b.status === 'accepted' || b.status === 'in_progress').length}
          </div>
        </div>
      )}

      </div>
    );
  } catch (error) {
    console.error('UserDashboard: Render error:', error);
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Dashboard Error</h2>
          <p className="text-red-400 mb-6">Something went wrong. Please refresh the page.</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }
};

export default UserDashboard;