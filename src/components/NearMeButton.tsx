import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface NearMeButtonProps {
  onLocationFound: (lat: number, lng: number) => void;
  onLocationCleared: () => void;
  isActive: boolean;
}

const NearMeButton: React.FC<NearMeButtonProps> = ({ 
  onLocationFound, 
  onLocationCleared,
  isActive 
}) => {
  const [loading, setLoading] = useState(false);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      return;
    }

    setLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onLocationFound(latitude, longitude);
        toast.success("Location found! Showing nearby services.");
        setLoading(false);
      },
      (error) => {
        let errorMessage = "Failed to get your location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location permissions.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        
        toast.error(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // Cache location for 1 minute
      }
    );
  };

  const handleToggle = () => {
    if (isActive) {
      onLocationCleared();
      toast.info("Location filter cleared");
    } else {
      getCurrentLocation();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isActive ? "default" : "outline"}
        onClick={handleToggle}
        disabled={loading}
        className="flex items-center gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MapPin className="h-4 w-4" />
        )}
        {loading ? "Finding..." : "Near Me"}
      </Button>
      
      {isActive && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Within 10km
        </Badge>
      )}
    </div>
  );
};

export default NearMeButton;