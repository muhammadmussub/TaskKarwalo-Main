import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, User, Phone, Clock } from "lucide-react";
import MapView from "@/components/MapView";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LocationTrackerProps {
  booking: {
    id: string;
    title: string;
    customer_id: string;
    customer?: {
      full_name: string;
      phone?: string;
    };
    customer_location_lat?: number;
    customer_location_lng?: number;
    customer_location_shared_at?: string;
    location_access_expires_at?: string;
    status: string;
  };
  providerId: string;
}

const LocationTracker: React.FC<LocationTrackerProps> = ({ 
  booking,
  providerId
}) => {
  const [customerProfile, setCustomerProfile] = useState<{
    full_name: string;
    phone?: string;
    avatar_url?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch customer profile details
  useEffect(() => {
    const fetchCustomerProfile = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, phone, avatar_url')
          .eq('user_id', booking.customer_id)
          .single();

        if (error) throw error;
        setCustomerProfile(data);
      } catch (err) {
        console.error('Error fetching customer profile:', err);
        setError('Failed to load customer information');
        toast.error('Failed to load customer information');
      } finally {
        setLoading(false);
      }
    };

    if (booking.customer_id) {
      fetchCustomerProfile();
    }
  }, [booking.customer_id]);

  // Check if location is available and valid
  const isLocationAvailable = () => {
    return booking.customer_location_lat &&
           booking.customer_location_lng &&
           booking.customer_location_shared_at &&
           booking.location_access_expires_at &&
           new Date(booking.location_access_expires_at) > new Date();
  };

  // Check if navigation should be available (confirmed or in_progress status)
  const isNavigationAvailable = () => {
    return (booking.status === 'confirmed' || booking.status === 'in_progress') &&
           booking.customer_location_lat &&
           booking.customer_location_lng;
  };

  // Handle navigation to customer location
  const handleNavigateToCustomer = () => {
    if (booking.customer_location_lat && booking.customer_location_lng) {
      // Open in Google Maps or default maps app
      const url = `https://www.google.com/maps/dir/?api=1&destination=${booking.customer_location_lat},${booking.customer_location_lng}`;
      window.open(url, '_blank');
      toast.success(`Navigating to ${customerProfile?.full_name || booking.customer?.full_name || 'Customer'}'s location`);
    }
  };

  // Handle call customer
  const handleCallCustomer = () => {
    if (customerProfile?.phone) {
      window.open(`tel:${customerProfile.phone}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
          <span className="text-blue-700">Loading customer information...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-red-600" />
          <h3 className="font-medium text-red-800">Error Loading Location</h3>
        </div>
        <p className="text-sm text-red-700 mt-2">{error}</p>
      </div>
    );
  }

  if (!isLocationAvailable()) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-5 w-5 text-yellow-600" />
          <h3 className="font-medium text-yellow-800">Location Not Available</h3>
        </div>
        <p className="text-sm text-yellow-700">
          {booking.customer_location_lat && booking.customer_location_lng 
            ? "The location access has expired or the customer has not shared their location for this booking."
            : "The customer has not shared their location for this booking."}
        </p>
      </div>
    );
  }

  // Create a service object for the MapView with customer location
  const serviceForMap = {
    id: booking.id,
    title: booking.title,
    provider_id: providerId,
    completion_location_lat: booking.customer_location_lat,
    completion_location_lng: booking.customer_location_lng,
    location_confirmed_at: booking.customer_location_shared_at
  };

  const locationSharedTime = booking.customer_location_shared_at 
    ? new Date(booking.customer_location_shared_at).toLocaleString() 
    : 'N/A';

  const locationExpiryTime = booking.location_access_expires_at
    ? new Date(booking.location_access_expires_at).toLocaleString()
    : 'N/A';

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900">Customer Information</h3>
              <p className="text-sm text-blue-700">{customerProfile?.full_name || booking.customer?.full_name || 'N/A'}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {customerProfile?.phone && (
              <Button
                onClick={handleCallCustomer}
                size="sm"
                className="flex items-center gap-1 bg-green-500 hover:bg-green-600"
              >
                <Phone className="h-4 w-4" />
                Call
              </Button>
            )}
            {isNavigationAvailable() && (
              <Button
                onClick={handleNavigateToCustomer}
                size="sm"
                className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600"
              >
                <Navigation className="h-4 w-4" />
                Navigate
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-500" />
            <span className="text-blue-800">
              <strong>Location Shared:</strong> {locationSharedTime}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-blue-800">
              <strong>Expires:</strong> {locationExpiryTime}
            </span>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              <span className="text-blue-800">
                <strong>Service:</strong> {booking.title}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="h-80 rounded-lg overflow-hidden border">
        <MapView 
          services={[serviceForMap]}
          onServiceSelect={() => {}}
          showCompletionLocations={true}
        />
      </div>
      
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="h-3 w-3" style={{ color: '#8b5cf6' }} />
        Purple marker shows the customer's shared location
      </div>
    </div>
  );
};

export default LocationTracker;