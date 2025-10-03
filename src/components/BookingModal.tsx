import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin, Clock, Receipt, AlertCircle, Locate } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MapSearch } from "@/components/MapSearch";

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  base_price: number;
  price_negotiable: boolean;
  provider_id: string;
}

interface BookingModalProps {
  service: Service | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BookingModal = ({ service, isOpen, onClose }: BookingModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    location: "",
    proposed_price: service?.base_price || 0,
    scheduled_date: undefined as Date | undefined,
  });
  const [shareLocation, setShareLocation] = useState(false);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<"prompt" | "granted" | "denied" | "unavailable">("prompt");
  const [locationCoordinates, setLocationCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [showMapSearch, setShowMapSearch] = useState(false);
  const [selectedMapLocation, setSelectedMapLocation] = useState<{address: string; lat: number; lng: number} | null>(null);

  // Check if geolocation is available
  useState(() => {
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
      });
    }
  });

  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocationCoordinates({ lat: latitude, lng: longitude });
        setLocationPermissionStatus("granted");
        setShareLocation(true);
        setLocationLoading(false);
        toast.success("Location access granted");
      },
      (error) => {
        console.error("Error getting location:", error);
        setLocationPermissionStatus("denied");
        setShareLocation(false);
        setLocationLoading(false);
        toast.error("Location access denied. Please enable location services to allow the service provider to locate you.");
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const getCurrentLocationAddress = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);
    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // Use reverse geocoding to get address
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();

            if (data.display_name) {
              setFormData(prev => ({ ...prev, location: data.display_name }));
              toast.success("Location automatically filled");
            } else {
              toast.error("Could not retrieve address for your location");
            }
          } catch (error) {
            console.error("Error getting address:", error);
            toast.error("Failed to get address for your location");
          }

          setLocationLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Failed to get your location. Please try again.");
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    } catch (error) {
      console.error("Error requesting location:", error);
      toast.error("Failed to get your location");
      setLocationLoading(false);
    }
  };

  const handleLocationSelect = (location: { address: string; lat: number; lng: number }) => {
    setFormData(prev => ({ ...prev, location: location.address }));
    setSelectedMapLocation(location);
    setLocationCoordinates({ lat: location.lat, lng: location.lng });
    setShareLocation(true);
    toast.success("Location selected successfully");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !service) return;

    // Check if user has verified their phone number
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('phone_verified, phone')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking phone verification:', error);
        toast.error("Failed to verify account status. Please try again.");
        return;
      }

      if (!profile?.phone_verified) {
        toast.error("Please verify your phone number before booking services. Go to your profile settings to complete verification.");
        return;
      }
    } catch (error) {
      console.error('Error checking phone verification:', error);
      toast.error("Failed to verify account status. Please try again.");
      return;
    }

    // If user wants to share location but we don't have coordinates, request permission
    if (shareLocation && !locationCoordinates && locationPermissionStatus !== "unavailable") {
      toast.error("Please grant location permission to share your location with the provider.");
      requestLocationPermission();
      return;
    }

    setLoading(true);
    try {
      const bookingData: any = {
        customer_id: user.id,
        provider_id: service.provider_id,
        service_id: service.id,
        title: service.title,
        description: formData.description,
        location: formData.location,
        proposed_price: formData.proposed_price,
        scheduled_date: formData.scheduled_date?.toISOString(),
        status: service.price_negotiable ? 'negotiating' : 'pending' // Set initial status based on price negotiation
      };

      // Add location data if shared and we have coordinates
      if (shareLocation && locationCoordinates) {
        const now = new Date().toISOString();
        bookingData.customer_location_lat = locationCoordinates.lat;
        bookingData.customer_location_lng = locationCoordinates.lng;
        bookingData.customer_location_shared_at = now;
        bookingData.location_access_active = true;

        console.log('Saving location data:', {
          lat: locationCoordinates.lat,
          lng: locationCoordinates.lng,
          shared_at: now
        });
      }

      const { data, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select(`
          *,
          customer_location_lat,
          customer_location_lng,
          customer_location_shared_at,
          location_access_active
        `)
        .single();

      if (error) throw error;

      console.log('Booking created successfully with location data:', {
        bookingId: data.id,
        hasLocationLat: !!data.customer_location_lat,
        hasLocationLng: !!data.customer_location_lng,
        locationSharedAt: data.customer_location_shared_at,
        locationAccessActive: data.location_access_active,
        fullData: data
      });

      toast.success("Booking request sent successfully!");
      onClose();
    } catch (error: any) {
      console.error('Booking creation error:', error);
      toast.error("Failed to send booking request: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Book Service</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Service</Label>
            <div className="p-3 bg-muted rounded-md">
              <h4 className="font-medium">{service.title}</h4>
              <p className="text-sm text-muted-foreground">{service.description}</p>
              <p className="text-sm font-medium mt-1">Base Price: PKR {service.base_price}</p>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Additional Details</Label>
            <Textarea
              id="description"
              placeholder="Describe your requirements..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="location">Service Address</Label>
            <div className="flex gap-2">
              <Input
                id="location"
                placeholder="Enter service location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                required
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={getCurrentLocationAddress}
                disabled={locationLoading}
                title="Use current location"
              >
                {locationLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Locate className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowMapSearch(true)}
                title="Search on map"
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Location sharing section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="location-sharing" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Share my location
              </Label>

              {locationPermissionStatus === "granted" ? (
                <Switch
                  id="location-sharing"
                  checked={shareLocation}
                  onCheckedChange={(checked) => {
                    setShareLocation(checked);
                    // If user is turning off location sharing, clear coordinates
                    if (!checked) {
                      setLocationCoordinates(null);
                    } else if (checked && !locationCoordinates) {
                      // If user is turning on location sharing but we don't have coordinates, get current location
                      requestLocationPermission();
                    }
                  }}
                />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={requestLocationPermission}
                  disabled={locationPermissionStatus === "unavailable" || locationLoading}
                >
                  {locationLoading ? "Requesting..." : "Allow Location"}
                </Button>
              )}
            </div>
            
            {locationPermissionStatus === "unavailable" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Location services are not supported by your browser.
                </AlertDescription>
              </Alert>
            )}
            
            {locationPermissionStatus !== "unavailable" && (
              <Alert>
                <MapPin className="h-4 w-4" />
                <AlertTitle>Location Sharing</AlertTitle>
                <AlertDescription>
                  {shareLocation ? 
                    "Your current location will be shared with the service provider to help them navigate to you. Location access expires 2 hours after booking or when service is completed." : 
                    "Share your location to help the service provider find you easily. Your privacy is important to us - location data is only shared with your assigned provider."}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div>
            <Label htmlFor="price">Your Proposed Price (PKR)</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={formData.proposed_price}
              onChange={(e) => setFormData(prev => ({ ...prev, proposed_price: parseFloat(e.target.value) }))}
              required
            />
            {service.price_negotiable && (
              <p className="text-xs text-muted-foreground mt-1">
                This service allows price negotiation
              </p>
            )}
          </div>

          <div>
            <Label>Preferred Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.scheduled_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.scheduled_date ? format(formData.scheduled_date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.scheduled_date}
                  onSelect={(date) => setFormData(prev => ({ ...prev, scheduled_date: date }))}
                  initialFocus
                  disabled={(date) => {
                    // Allow today and future dates, but disable dates before today
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </form>

        {/* Map Search Modal */}
        <MapSearch
          isOpen={showMapSearch}
          onClose={() => setShowMapSearch(false)}
          onLocationSelect={handleLocationSelect}
          initialLocation={selectedMapLocation}
        />
      </DialogContent>
    </Dialog>
  );
};