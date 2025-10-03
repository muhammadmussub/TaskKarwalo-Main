import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, MapPin, X } from "lucide-react";
import { toast } from "sonner";

interface MapSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (location: { address: string; lat: number; lng: number }) => void;
  initialLocation?: { address: string; lat: number; lng: number };
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
}

export const MapSearch = ({ isOpen, onClose, onLocationSelect, initialLocation }: MapSearchProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ address: string; lat: number; lng: number } | null>(
    initialLocation || null
  );

  // Initialize map
  useEffect(() => {
    if (!isOpen || !mapRef.current) return;

    const initializeMap = async () => {
      try {
        // Dynamically import Leaflet to avoid SSR issues
        const L = await import('leaflet');
        
        // Fix for default markers in Leaflet with Vite
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        const mapInstance = L.map(mapRef.current!).setView(
          initialLocation ? [initialLocation.lat, initialLocation.lng] : [33.6846, 73.0479], // Default to Islamabad
          13
        );

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstance);

        // Add marker if initial location exists
        if (initialLocation) {
          const markerInstance = L.marker([initialLocation.lat, initialLocation.lng])
            .addTo(mapInstance)
            .bindPopup(initialLocation.address);
          setMarker(markerInstance);
        }

        // Handle map click
        mapInstance.on('click', async (e: any) => {
          const { lat, lng } = e.latlng;
          
          // Remove existing marker
          if (marker) {
            mapInstance.removeLayer(marker);
          }

          // Add new marker
          const newMarker = L.marker([lat, lng]).addTo(mapInstance);
          setMarker(newMarker);

          // Get address for clicked location
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();
            
            if (data.display_name) {
              const location = { address: data.display_name, lat, lng };
              setSelectedLocation(location);
              newMarker.bindPopup(data.display_name);
            }
          } catch (error) {
            console.error('Error getting address:', error);
            toast.error('Failed to get address for selected location');
          }
        });

        setMap(mapInstance);
      } catch (error) {
        console.error('Error initializing map:', error);
        toast.error('Failed to load map. Please try again.');
      }
    };

    initializeMap();

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [isOpen, initialLocation]);

  // Search for locations
  const searchLocations = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&bounded=1&viewbox=60,40,80,20` // Focus on Pakistan region
      );
      const results: SearchResult[] = await response.json();
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching locations:', error);
      toast.error('Failed to search locations');
    } finally {
      setSearching(false);
    }
  };

  // Handle search result selection
  const selectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (map && marker) {
      map.removeLayer(marker);
    }

    if (map) {
      map.setView([lat, lng], 15);
      const newMarker = (window as any).L.marker([lat, lng])
        .addTo(map)
        .bindPopup(result.display_name);
      setMarker(newMarker);
    }

    const location = { address: result.display_name, lat, lng };
    setSelectedLocation(location);
    setSearchResults([]);
    setSearchQuery("");
  };

  // Confirm location selection
  const confirmLocation = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose();
    } else {
      toast.error('Please select a location on the map first');
    }
  };

  // Handle Enter key in search
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchLocations();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Select Location on Map
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Section */}
          <div className="space-y-2">
            <Label>Search for a location</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter address, city, or landmark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
              />
              <Button 
                type="button" 
                onClick={searchLocations}
                disabled={searching}
                className="px-3"
              >
                {searching ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-md max-h-32 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    className="w-full p-2 text-left hover:bg-muted transition-colors border-b last:border-b-0"
                    onClick={() => selectSearchResult(result)}
                  >
                    <div className="font-medium text-sm">{result.display_name.split(',')[0]}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {result.display_name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map Section */}
          <div className="relative">
            <div 
              ref={mapRef} 
              className="h-96 w-full rounded-md border"
              style={{ zIndex: 1 }}
            />
            
            {/* Instructions */}
            <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm rounded-md p-2 text-sm">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Click on the map to select your exact location
              </div>
            </div>
          </div>

          {/* Selected Location */}
          {selectedLocation && (
            <div className="p-3 bg-muted rounded-md">
              <Label className="text-sm font-medium">Selected Location:</Label>
              <p className="text-sm mt-1">{selectedLocation.address}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmLocation}
              disabled={!selectedLocation}
              className="flex-1"
            >
              Confirm Location
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};