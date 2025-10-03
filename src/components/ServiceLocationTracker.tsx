import React from 'react';
import { Button } from "@/components/ui/button";
import { MapPin, Navigation } from "lucide-react";
import MapView from "@/components/MapView";

interface ServiceLocationTrackerProps {
  booking: {
    id: string;
    title: string;
    completion_location_lat?: number;
    completion_location_lng?: number;
    location_confirmed_at?: string;
    customer?: {
      full_name: string;
    };
  };
  onNavigateToLocation: () => void;
}

const ServiceLocationTracker: React.FC<ServiceLocationTrackerProps> = ({ 
  booking,
  onNavigateToLocation
}) => {
  // Check if location is available
  const hasLocation = booking.completion_location_lat && booking.completion_location_lng;

  if (!hasLocation) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-5 w-5 text-yellow-600" />
          <h3 className="font-medium text-yellow-800">Location Not Confirmed</h3>
        </div>
        <p className="text-sm text-yellow-700 mb-3">
          The customer has not yet confirmed their location for this service. 
          Please wait for them to confirm or contact them directly.
        </p>
      </div>
    );
  }

  // Create a service object for the MapView
  const serviceForMap = {
    id: booking.id,
    title: booking.title,
    provider_id: "", // Not needed for this view
    completion_location_lat: booking.completion_location_lat,
    completion_location_lng: booking.completion_location_lng,
    location_confirmed_at: booking.location_confirmed_at
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium text-blue-800">Customer Location Confirmed</h3>
          </div>
          <Button 
            onClick={onNavigateToLocation}
            size="sm"
            className="flex items-center gap-1"
          >
            <Navigation className="h-4 w-4" />
            Navigate
          </Button>
        </div>
        
        <div className="text-sm text-blue-700 mb-3">
          <p><strong>Customer:</strong> {booking.customer?.full_name || 'N/A'}</p>
          <p><strong>Service:</strong> {booking.title}</p>
          <p><strong>Confirmed on:</strong> {booking.location_confirmed_at 
            ? new Date(booking.location_confirmed_at).toLocaleString() 
            : 'N/A'}</p>
        </div>
      </div>
      
      <div className="h-64 rounded-lg overflow-hidden border">
        <MapView 
          services={[serviceForMap]}
          onServiceSelect={() => {}}
          showCompletionLocations={true}
        />
      </div>
      
      <div className="text-xs text-muted-foreground">
        <MapPin className="h-3 w-3 inline mr-1" style={{ color: '#8b5cf6' }} />
        Purple marker shows where the customer confirmed their location
      </div>
    </div>
  );
};

export default ServiceLocationTracker;