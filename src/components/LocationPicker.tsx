import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Search } from "lucide-react";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet-control-geocoder';
import LocationSearch from "@/components/LocationSearch";

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationPickerProps {
  onLocationChange: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ 
  onLocationChange, 
  initialLat, 
  initialLng, 
  initialAddress 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialAddress || '');
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([
      initialLat || 33.6844, // Default to Islamabad, Pakistan
      initialLng || 73.0479
    ], 10);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add initial marker if coordinates provided
    if (initialLat && initialLng) {
      const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
      markerRef.current = marker;
      
      // Handle marker drag
      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        const address = await reverseGeocode(pos.lat, pos.lng);
        setSearchQuery(address);
        onLocationChange(pos.lat, pos.lng, address);
      });
    }

    // Handle map click
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      
      // Remove existing marker
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }
      
      // Add new marker
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current = marker;
      
      // Handle marker drag
      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        const address = await reverseGeocode(pos.lat, pos.lng);
        setSearchQuery(address);
        onLocationChange(pos.lat, pos.lng, address);
      });
      
      // Get address for clicked location
      const address = await reverseGeocode(lat, lng);
      setSearchQuery(address);
      onLocationChange(lat, lng, address);
    });

    mapInstanceRef.current = map;
    setIsMapLoaded(true);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await response.json();
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const handleLocationSelect = async (lat: number, lng: number, address: string) => {
    if (!mapInstanceRef.current) return;

    // Update map view
    mapInstanceRef.current.setView([lat, lng], 15);
    
    // Remove existing marker
    if (markerRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
    }
    
    // Add new marker
    const marker = L.marker([lat, lng], { draggable: true }).addTo(mapInstanceRef.current);
    markerRef.current = marker;
    
    // Handle marker drag
    marker.on('dragend', async () => {
      const pos = marker.getLatLng();
      const address = await reverseGeocode(pos.lat, pos.lng);
      setSearchQuery(address);
      onLocationChange(pos.lat, pos.lng, address);
    });
    
    setSearchQuery(address);
    onLocationChange(lat, lng, address);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <Label htmlFor="location-search">Search Location</Label>
          <div className="flex gap-2 mt-2">
            <LocationSearch 
              onLocationSelect={handleLocationSelect}
              placeholder="Enter address or place name..."
              initialValue={searchQuery}
            />
          </div>
        </div>
        
        <div>
          <Label>Select Location on Map</Label>
          <div 
            ref={mapRef} 
            className="w-full h-64 border rounded-md mt-2"
            style={{ minHeight: '256px' }}
          />
          {!isMapLoaded && (
            <div className="flex items-center justify-center h-64 border rounded-md bg-muted">
              <div className="text-center">
                <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 inline mr-1" />
          Click on the map or drag the marker to set your business location
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationPicker;