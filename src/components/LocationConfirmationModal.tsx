import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, CheckCircle } from "lucide-react";
import MapView from "@/components/MapView";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LocationConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  customerId: string;
  providerId: string;
  serviceName: string;
}

const LocationConfirmationModal: React.FC<LocationConfirmationModalProps> = ({ 
  isOpen, 
  onClose,
  bookingId,
  customerId,
  providerId,
  serviceName
}) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationSaved, setIsLocationSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setIsLocationSaved(false);
      setUserLocation(null);
      setUseCurrentLocation(true);
      
      // Try to get user's current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            console.error("Error getting location:", error);
            toast.error("Could not get your current location. Please click on the map to select your location.");
            setUseCurrentLocation(false);
          }
        );
      }
    }
  }, [isOpen]);

  const handleLocationChange = (lat: number, lng: number) => {
    setUserLocation({ lat, lng });
    setUseCurrentLocation(false);
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setUseCurrentLocation(true);
          setIsLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Could not get your current location. Please click on the map to select your location.");
          setIsLoading(false);
        }
      );
    }
  };

  const handleConfirmLocation = async () => {
    if (!userLocation) {
      toast.error("Please select a location on the map");
      return;
    }

    setIsLoading(true);
    
    try {
      // Save the location to the booking
      const { error } = await supabase
        .from('bookings')
        .update({ 
          completion_location_lat: userLocation.lat,
          completion_location_lng: userLocation.lng,
          location_confirmed_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      // Also update the user's profile with this location as their default
      await supabase
        .from('profiles')
        .update({ 
          last_known_lat: userLocation.lat,
          last_known_lng: userLocation.lng,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', customerId);

      // Create notification for provider
      await supabase
        .from('notifications')
        .insert({
          user_id: providerId,
          title: "Location Confirmed",
          content: `Customer has confirmed their location for the completed service: ${serviceName}`,
          type: "location_confirmed",
          booking_id: bookingId
        });

      setIsLocationSaved(true);
      toast.success("Location confirmed successfully!");
      
      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error saving location:", error);
      toast.error("Failed to save location. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-500" />
            Confirm Your Location
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <p className="text-muted-foreground">
            Please confirm your current location so the service provider can easily find you. 
            You can either use your current location or select a location on the map.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={handleUseCurrentLocation}
              disabled={isLoading}
              variant={useCurrentLocation ? "default" : "outline"}
              className="flex-1"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Getting Location...
                </div>
              ) : (
                "Use Current Location"
              )}
            </Button>
          </div>
          
          <div className="h-96 rounded-lg overflow-hidden border">
            <MapView 
              services={[]}
              onServiceSelect={() => {}}
              userLocation={userLocation || undefined}
              onLocationChange={handleLocationChange}
            />
          </div>
          
          {isLocationSaved ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Location Confirmed!</h3>
              <p className="text-muted-foreground">
                Your location has been saved successfully. The service provider will be notified.
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleConfirmLocation}
                disabled={isLoading || !userLocation}
                className="flex-1"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Confirm Location
                  </div>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={onClose}
                disabled={isLoading}
              >
                Skip for Now
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocationConfirmationModal;