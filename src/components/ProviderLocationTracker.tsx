import React from 'react';
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Phone } from "lucide-react";
import { toast } from "sonner";
import MapView from "@/components/MapView";

interface ProviderLocationTrackerProps {
  booking: {
    id: string;
    title: string;
    customer_location_lat?: number;
    customer_location_lng?: number;
    customer_location_shared_at?: string;
    location_access_active?: boolean;
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
    customer?: {
      full_name: string;
      phone?: string;
    };
  };
  onCallProvider: () => void;
}

const ProviderLocationTracker: React.FC<ProviderLocationTrackerProps> = ({
  booking,
  onCallProvider
}) => {
  // Check if provider location is available for display on map
  const hasProviderLocation = booking.provider_profiles?.latitude && booking.provider_profiles?.longitude;
  const providerInfo = booking.provider_profiles;
  const hasProviderInfo = providerInfo?.business_name || providerInfo?.phone || providerInfo?.business_address;

  // Create a service object for the MapView
  const serviceForMap = {
    id: booking.id,
    title: booking.title,
    provider_id: "", // Not needed for this view
    provider_profiles: booking.provider_profiles
  };


  return (
    <div className="space-y-4">
      {/* Provider Information - Always Show */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <MapPin className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-blue-800">Service Provider Details</h3>
            <p className="text-xs text-blue-600">Contact information for your service</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-700 font-medium">Business Name:</span>
            <span className="text-blue-800">{providerInfo?.business_name || 'Not provided'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-700 font-medium">Email:</span>
            <span className="text-blue-800 text-xs">{booking.profiles?.email || 'Not provided'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-700 font-medium">Phone:</span>
            <span className="text-blue-800">{providerInfo?.phone || 'Not provided'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-700 font-medium">Service:</span>
            <span className="text-blue-800">{booking.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-700 font-medium">Business Address:</span>
            <span className="text-blue-800 text-xs">{providerInfo?.business_address || 'Not provided'}</span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Button
            onClick={onCallProvider}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Phone className="h-4 w-4 mr-2" />
            Call Provider
          </Button>

        </div>
      </div>

      {/* Live Location Tracking - Only Show If Available */}
      {hasProviderLocation ? (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h4 className="font-medium text-green-800">Live Location Tracking</h4>
            </div>
            <p className="text-xs text-green-700">
              Provider's current location is being shared. You can track their movement in real-time.
            </p>
          </div>

          <div className="h-64 rounded-lg overflow-hidden border">
            <MapView
              services={[serviceForMap]}
              onServiceSelect={() => {}}
            />
          </div>

          <div className="text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 inline mr-1" />
            Blue marker shows the provider's current location. Green marker shows your location.
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-yellow-600" />
            <h4 className="font-medium text-yellow-800">Live Tracking Unavailable</h4>
          </div>
          <p className="text-xs text-yellow-700">
            Provider has not enabled live location sharing. Use the contact information above to coordinate directly.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProviderLocationTracker;