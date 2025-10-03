import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from "@/integrations/supabase/client";

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Import the distance calculator utility
import { filterServicesByDistance } from '@/utils/distanceCalculator';

interface Service {
  id: string;
  title: string;
  description?: string;
  provider_id: string;
  base_price?: number;
  provider_profiles?: {
    business_name: string;
    business_address?: string;
    latitude?: number;
    longitude?: number;
  };
  // Add completion location data
  completion_location_lat?: number;
  completion_location_lng?: number;
  location_confirmed_at?: string;
}

interface MapViewProps {
  services: Service[];
  onServiceSelect: (service: Service) => void;
  userLocation?: { lat: number; lng: number };
  onLocationChange?: (lat: number, lng: number) => void;
  showCompletionLocations?: boolean; // New prop to control showing completion locations
}

const MapView: React.FC<MapViewProps> = ({ 
  services, 
  onServiceSelect,
  userLocation,
  onLocationChange,
  showCompletionLocations = false // Default to false
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [liveLocations, setLiveLocations] = useState<Record<string, { lat: number, lng: number }>>({});

  // Initialize map
  useEffect(() => {
    const initializeMap = () => {
      if (!mapRef.current) return;
      
      // Clear previous map instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      
      try {
        // Wait for the container to be properly in the DOM with dimensions
        setTimeout(() => {
          if (!mapRef.current) return;
          
          // Set explicit dimensions to ensure the container has size
          const container = mapRef.current;
          container.style.width = '100%';
          container.style.height = '500px';
          container.style.minHeight = '500px';
          
          // Create the map
          const map = L.map(container, {
            zoomControl: true,
            scrollWheelZoom: true,
            center: [30.3753, 69.3451], // Pakistan center
            zoom: 5
          });
          
          // Add OpenStreetMap tile layer - replace CARTO with a more reliable source
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
          }).addTo(map);
          
          // Remove the space-like background that's making the map dark
          
          // Add a blue border around Pakistan
          fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
            .then(res => res.json())
            .then(data => {
              const pakistan = data.features.find((f: any) => f.properties.ADMIN === 'Pakistan');
              if (pakistan) {
                // Add Pakistan with a lighter fill to contrast with space background
                L.geoJSON(pakistan, {
                  style: {
                    color: '#2563eb',
                    weight: 3,
                    opacity: 0.8,
                    fillOpacity: 0.1,
                    fillColor: '#3b82f6'
                  }
                }).addTo(map);
              }
            })
            .catch(err => {
              console.error("Error loading Pakistan border:", err);
              // Fallback to simple polyline for Pakistan outline
              const pakistanBorder: [number, number][] = [
                [37.0726, 74.5229],
                [35.9535, 77.8374],
                [32.3685, 80.2534],
                [28.2145, 84.2029],
                [27.1224, 88.0463],
                [23.6848, 88.1232],
                [20.7568, 85.6025],
                [21.9507, 82.7588],
                [21.2523, 79.8267],
                [23.4707, 76.3955],
                [22.9039, 73.8712],
                [24.3951, 71.7627],
                [25.6661, 70.3204],
                [26.9931, 69.5938],
                [29.0214, 66.3146],
                [29.9543, 63.1934],
                [31.0232, 61.9043],
                [33.3593, 60.5859],
                [34.8168, 63.7207],
                [36.7565, 67.8564],
                [37.0726, 74.5229]
              ];
              
              L.polyline(pakistanBorder, { 
                color: '#2563eb', 
                weight: 3,
                opacity: 0.8
              }).addTo(map);
              
              // Add a polygon for Pakistan with lighter fill
              L.polygon(pakistanBorder, {
                color: 'transparent',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                weight: 0
              }).addTo(map);
            });
          
          // Store the map instance
          mapInstanceRef.current = map;
          setIsMapLoaded(true);
          
          // Add map click handler
          if (onLocationChange) {
            map.on('click', (e: L.LeafletMouseEvent) => {
              onLocationChange(e.latlng.lat, e.latlng.lng);
            });
          }
          
          // Make sure map renders correctly
          setTimeout(() => {
            map.invalidateSize();
          }, 100);
        }, 300); // Longer delay to ensure DOM is ready
      } catch (error) {
        console.error('Error initializing map:', error);
        setMapError('Failed to load map. Please refresh the page.');
      }
    };

    initializeMap();
    
    // Clean up function
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (error) {
          console.error('Error removing map:', error);
        }
      }
    };
  }, [onLocationChange]);

  // Set up real-time location updates
  useEffect(() => {
    const setupRealTimeUpdates = async () => {
      try {
        // Subscribe to real-time location updates
        const channel = supabase
          .channel('provider-locations')
          .on(
            'postgres_changes',
            {
              event: '*', // Listen for all events (insert, update, delete)
              schema: 'public',
              table: 'provider_profiles'
            },
            (payload: any) => {
              if (payload.new && typeof payload.new === 'object' && 
                  'latitude' in payload.new && 'longitude' in payload.new && 
                  'user_id' in payload.new) {
                setLiveLocations(prev => ({
                  ...prev,
                  [payload.new.user_id]: {
                    lat: payload.new.latitude,
                    lng: payload.new.longitude
                  }
                }));
              }
            }
          )
          .subscribe();
          
        // Initial fetch of active provider locations
        const { data, error } = await supabase
          .from('provider_profiles')
          .select('user_id, latitude, longitude, updated_at')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Active in the last 24h
          
        if (error) {
          console.error('Error fetching provider locations:', error);
        } else if (data) {
          const locations: Record<string, { lat: number, lng: number }> = {};
          data.forEach(item => {
            locations[item.user_id] = {
              lat: item.latitude,
              lng: item.longitude
            };
          });
          setLiveLocations(locations);
        }
        
        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('Error setting up real-time updates:', error);
      }
    };
    
    setupRealTimeUpdates();
  }, []);

  // Ensure we update the map when user location changes
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapLoaded || !userLocation) return;
    
    const map = mapInstanceRef.current;
    
    try {
      // Invalidate size to ensure map renders correctly after any layout changes
      map.invalidateSize();
      
      // Remove existing user marker if it exists
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      
      // Remove existing circles (in case there are any)
      map.eachLayer((layer) => {
        if (layer instanceof L.Circle) {
          map.removeLayer(layer);
        }
        // Also remove any div icons that might be radius labels
        if (layer instanceof L.Marker && layer.getIcon().options.className === 'radius-label') {
          map.removeLayer(layer);
        }
      });
      
      // Custom icon for user marker with animation
      const userIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>
               <div style="background-color: #3b82f6; opacity: 0.2; width: 40px; height: 40px; border-radius: 50%; position: absolute; top: -10px; left: -10px; animation: pulse 2s infinite;"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      
      // Add user marker
      const userMarker = L.marker([userLocation.lat, userLocation.lng], { 
        icon: userIcon,
        title: 'Your Location'
      }).addTo(map);
      
      userMarker.bindPopup('<b>Your Location</b>').openPopup();
      userMarkerRef.current = userMarker;
      
      // Enhanced 10km radius visualization with multiple rings
      const createRadiusRing = (radius: number, color: string, opacity: number, weight: number) => {
        return L.circle([userLocation.lat, userLocation.lng], {
          radius: radius,
          color: color,
          fillColor: color,
          fillOpacity: opacity,
          weight: weight,
          dashArray: weight === 1 ? '5, 5' : undefined,
          interactive: false
        }).addTo(map);
      };

      // Create multiple radius rings for better visualization
      const innerRing = createRadiusRing(3000, '#10b981', 0.15, 2); // 3km - green
      const middleRing = createRadiusRing(6000, '#f59e0b', 0.1, 2); // 6km - amber
      const outerRing = createRadiusRing(10000, '#3b82f6', 0.08, 3); // 10km - blue

      // Add animated pulse effect for the outer ring
      const pulseRing = L.circle([userLocation.lat, userLocation.lng], {
        radius: 10000,
        color: '#3b82f6',
        fillColor: '#60a5fa',
        fillOpacity: 0.05,
        weight: 1,
        dashArray: '10, 10',
        interactive: false,
        className: 'pulse-ring'
      }).addTo(map);

      // Add enhanced radius label with distance markers
      const radiusLabel = L.marker([userLocation.lat, userLocation.lng + 0.12], {
        icon: L.divIcon({
          className: 'radius-label',
          html: `
            <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; box-shadow: 0 4px 12px rgba(59,130,246,0.4); border: 2px solid rgba(255,255,255,0.2);">
              <div style="display: flex; align-items: center; gap: 4px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: pulse 2s infinite;"></div>
                <span>10km Service Radius</span>
              </div>
            </div>
          `,
          iconSize: [160, 30],
          iconAnchor: [80, 15]
        })
      }).addTo(map);

      // Add distance markers at 3km, 6km, and 10km
      const addDistanceMarker = (distance: number, label: string, color: string) => {
        const angle = -45; // Position at bottom-left
        const latOffset = (distance / 10000) * 0.09 * Math.cos(angle * Math.PI / 180);
        const lngOffset = (distance / 10000) * 0.09 * Math.sin(angle * Math.PI / 180);

        return L.marker([userLocation.lat + latOffset, userLocation.lng + lngOffset], {
          icon: L.divIcon({
            className: 'distance-marker',
            html: `
              <div style="background: ${color}; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold; white-space: nowrap;">
                ${label}
              </div>
            `,
            iconSize: [40, 20],
            iconAnchor: [20, 10]
          })
        }).addTo(map);
      };

      addDistanceMarker(3000, '3km', '#10b981');
      addDistanceMarker(6000, '6km', '#f59e0b');
      addDistanceMarker(10000, '10km', '#3b82f6');
      
      // Zoom to show the entire radius circle
      const bounds = outerRing.getBounds();
      map.fitBounds(bounds, { padding: [50, 50] });
      
    } catch (error) {
      console.error('Error updating user location on map:', error);
    }
  }, [userLocation, isMapLoaded]);

  // Update markers when services, user location, or live locations change
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapLoaded || mapError) return;

    const map = mapInstanceRef.current;

    try {
      // Clear existing markers
      markersRef.current.forEach(marker => {
        try {
          map.removeLayer(marker);
        } catch (error) {
          console.warn('Error removing marker:', error);
        }
      });
      markersRef.current = [];

      // Remove user marker if it exists
      if (userMarkerRef.current) {
        try {
          map.removeLayer(userMarkerRef.current);
        } catch (error) {
          console.warn('Error removing user marker:', error);
        }
        userMarkerRef.current = null;
      }

      // Custom icons with modern look
      const userIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>
               <div style="background-color: #3b82f6; opacity: 0.2; width: 40px; height: 40px; border-radius: 50%; position: absolute; top: -10px; left: -10px; animation: pulse 2s infinite;"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const serviceIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #10b981; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      
      // Add animation styles for the pulse effect
      if (!document.getElementById('map-pulse-animation')) {
        const style = document.createElement('style');
        style.id = 'map-pulse-animation';
        style.innerHTML = `
          @keyframes pulse {
            0% { transform: scale(0.5); opacity: 0.8; }
            70% { transform: scale(1.5); opacity: 0; }
            100% { transform: scale(0.5); opacity: 0; }
          }
          @keyframes pulse-ring {
            0% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.2); opacity: 0.2; }
            100% { transform: scale(1); opacity: 0.6; }
          }
          .pulse-ring {
            animation: pulse-ring 3s ease-in-out infinite;
          }
          .leaflet-popup-content-wrapper {
            border-radius: 12px;
            padding: 0;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          }
          .leaflet-popup-content {
            margin: 0;
            padding: 0;
          }
          .service-popup {
            padding: 16px;
            min-width: 220px;
            background: linear-gradient(135deg, #ffffff, #f8fafc);
          }
          .service-popup h3 {
            margin: 0 0 8px 0;
            font-weight: bold;
            color: #1e293b;
            font-size: 16px;
          }
          .service-popup p {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #475569;
            line-height: 1.4;
          }
          .service-popup .price {
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 12px;
            font-size: 16px;
          }
          .service-popup .btn {
            background: linear-gradient(135deg, #2563eb, #1e40af);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
            width: 100%;
            text-align: center;
          }
          .service-popup .btn:hover {
            background: linear-gradient(135deg, #1e40af, #1e3a8a);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(37,99,235,0.3);
          }
          .radius-label {
            animation: pulse 2s ease-in-out infinite;
          }
          .distance-marker {
            animation: fadeInUp 0.5s ease-out;
          }
          .radius-circle {
            pointer-events: none;
            z-index: 400;
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `;
        document.head.appendChild(style);
      }

      // Add user location marker if available
      if (userLocation) {
        const userMarker = L.marker([userLocation.lat, userLocation.lng], { 
          icon: userIcon,
          title: 'Your Location'
        }).addTo(map);
        
        userMarker.bindPopup('<b>Your Location</b>').openPopup();
        userMarkerRef.current = userMarker;

        // Enhanced 10km radius visualization with multiple rings
        const createRadiusRing = (radius: number, color: string, opacity: number, weight: number) => {
          return L.circle([userLocation.lat, userLocation.lng], {
            radius: radius,
            color: color,
            fillColor: color,
            fillOpacity: opacity,
            weight: weight,
            dashArray: weight === 1 ? '5, 5' : undefined,
            interactive: false,
            className: 'radius-circle'
          }).addTo(map);
        };

        // Create multiple radius rings for better visualization
        const innerRing = createRadiusRing(3000, '#10b981', 0.15, 2); // 3km - green
        const middleRing = createRadiusRing(6000, '#f59e0b', 0.1, 2); // 6km - amber
        const outerRing = createRadiusRing(10000, '#3b82f6', 0.08, 3); // 10km - blue

        // Add animated pulse effect for the outer ring
        const pulseRing = L.circle([userLocation.lat, userLocation.lng], {
          radius: 10000,
          color: '#3b82f6',
          fillColor: '#60a5fa',
          fillOpacity: 0.05,
          weight: 1,
          dashArray: '10, 10',
          interactive: false,
          className: 'pulse-ring'
        }).addTo(map);

        // Add enhanced radius label with distance markers
        const radiusLabel = L.marker([userLocation.lat, userLocation.lng + 0.12], {
          icon: L.divIcon({
            className: 'radius-label',
            html: `
              <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; box-shadow: 0 4px 12px rgba(59,130,246,0.4); border: 2px solid rgba(255,255,255,0.2);">
                <div style="display: flex; align-items: center; gap: 4px;">
                  <div style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: pulse 2s infinite;"></div>
                  <span>10km Service Radius</span>
                </div>
              </div>
            `,
            iconSize: [160, 30],
            iconAnchor: [80, 15]
          })
        }).addTo(map);

        // Add distance markers at 3km, 6km, and 10km
        const addDistanceMarker = (distance: number, label: string, color: string) => {
          const angle = -45; // Position at bottom-left
          const latOffset = (distance / 10000) * 0.09 * Math.cos(angle * Math.PI / 180);
          const lngOffset = (distance / 10000) * 0.09 * Math.sin(angle * Math.PI / 180);

          return L.marker([userLocation.lat + latOffset, userLocation.lng + lngOffset], {
            icon: L.divIcon({
              className: 'distance-marker',
              html: `
                <div style="background: ${color}; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold; white-space: nowrap;">
                  ${label}
                </div>
              `,
              iconSize: [40, 20],
              iconAnchor: [20, 10]
            })
          }).addTo(map);
        };

        addDistanceMarker(3000, '3km', '#10b981');
        addDistanceMarker(6000, '6km', '#f59e0b');
        addDistanceMarker(10000, '10km', '#3b82f6');

        // Filter services within 10km
        const nearbyServices = filterServicesByDistance(
          services.filter(s => s.provider_profiles?.latitude && s.provider_profiles?.longitude),
          userLocation.lat,
          userLocation.lng
        );

        // Add markers for nearby services
        nearbyServices.forEach((service: any, index) => {
          if (service.provider_profiles?.latitude && service.provider_profiles?.longitude) {
            // Check if we have real-time location data for this provider
            let lat = service.provider_profiles.latitude;
            let lng = service.provider_profiles.longitude;
            
            if (liveLocations[service.provider_id]) {
              lat = liveLocations[service.provider_id].lat;
              lng = liveLocations[service.provider_id].lng;
            }
            
            const marker = L.marker([lat, lng], { 
              icon: serviceIcon,
              title: service.provider_profiles.business_name
            }).addTo(map);
            
            // Create modern popup content with service details
            const popupContent = `
              <div class="service-popup">
                <h3>${service.provider_profiles.business_name}</h3>
                <p>${service.title}</p>
                ${service.base_price ? `<p class="price">PKR ${service.base_price}</p>` : ''}
                <button onclick="window.selectService('${service.id}')" class="btn">
                  View Details
                </button>
              </div>
            `;
            
            const popup = L.popup({
              closeButton: true,
              autoClose: true,
              className: 'modern-popup'
            }).setContent(popupContent);
            
            marker.bindPopup(popup);
            
            marker.on('click', () => {
              onServiceSelect(service);
            });
            
            markersRef.current.push(marker);
          }
        });

        // Show completion locations if requested
        if (showCompletionLocations) {
          services.forEach((service) => {
            // Show completion location marker if available
            if (service.completion_location_lat && service.completion_location_lng) {
              const completionIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: #8b5cf6; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
              });
              
              const completionMarker = L.marker(
                [service.completion_location_lat, service.completion_location_lng], 
                { 
                  icon: completionIcon,
                  title: `Service Completion Location: ${service.title}`
                }
              ).addTo(map);
              
              // Create popup content for completion location
              const completionPopupContent = `
                <div class="service-popup">
                  <h3>Service Completion Location</h3>
                  <p>${service.title}</p>
                  <p><strong>Completed on:</strong> ${service.location_confirmed_at ? new Date(service.location_confirmed_at).toLocaleDateString() : 'N/A'}</p>
                </div>
              `;
              
              completionMarker.bindPopup(completionPopupContent);
              markersRef.current.push(completionMarker);
            }
          });
        }

        // Fit map to show user location and nearby services
        if (nearbyServices.length > 0) {
          const bounds = L.latLngBounds([
            [userLocation.lat, userLocation.lng],
            ...nearbyServices.map(s => {
              // Use live location if available
              if (liveLocations[s.provider_id]) {
                return [liveLocations[s.provider_id].lat, liveLocations[s.provider_id].lng] as [number, number];
              }
              return [s.provider_profiles!.latitude!, s.provider_profiles!.longitude!] as [number, number];
            })
          ]);
          
          map.fitBounds(bounds, { padding: [50, 50] });
        } else {
          map.setView([userLocation.lat, userLocation.lng], 13);
        }
      } else {
        // If no user location, show all services in Pakistan
        const validServices = services.filter(s => 
          s.provider_profiles?.latitude && s.provider_profiles?.longitude
        );
        
        // Add markers for all services
        validServices.forEach((service, index) => {
          if (service.provider_profiles?.latitude && service.provider_profiles?.longitude) {
            // Check if we have real-time location data for this provider
            let lat = service.provider_profiles.latitude;
            let lng = service.provider_profiles.longitude;
            
            if (liveLocations[service.provider_id]) {
              lat = liveLocations[service.provider_id].lat;
              lng = liveLocations[service.provider_id].lng;
            }
            
            const marker = L.marker([lat, lng], { 
              icon: serviceIcon,
              title: service.provider_profiles.business_name
            }).addTo(map);
            
            // Create modern popup content
            const popupContent = `
              <div class="service-popup">
                <h3>${service.provider_profiles.business_name}</h3>
                <p>${service.title}</p>
                ${service.base_price ? `<p class="price">PKR ${service.base_price}</p>` : ''}
                <button onclick="window.selectService('${service.id}')" class="btn">
                  View Details
                </button>
              </div>
            `;
            
            const popup = L.popup({
              closeButton: true,
              autoClose: true,
              className: 'modern-popup'
            }).setContent(popupContent);
            
            marker.bindPopup(popup);
            
            marker.on('click', () => {
              onServiceSelect(service);
            });
            
            markersRef.current.push(marker);
          }
        });

        // Show completion locations if requested
        if (showCompletionLocations) {
          services.forEach((service) => {
            // Show completion location marker if available
            if (service.completion_location_lat && service.completion_location_lng) {
              const completionIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: #8b5cf6; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
              });
              
              const completionMarker = L.marker(
                [service.completion_location_lat, service.completion_location_lng], 
                { 
                  icon: completionIcon,
                  title: `Service Completion Location: ${service.title}`
                }
              ).addTo(map);
              
              // Create popup content for completion location
              const completionPopupContent = `
                <div class="service-popup">
                  <h3>Service Completion Location</h3>
                  <p>${service.title}</p>
                  <p><strong>Completed on:</strong> ${service.location_confirmed_at ? new Date(service.location_confirmed_at).toLocaleDateString() : 'N/A'}</p>
                </div>
              `;
              
              completionMarker.bindPopup(completionPopupContent);
              markersRef.current.push(completionMarker);
            }
          });
        }
        
        // Center map on Pakistan
        map.setView([30.3753, 69.3451], 5);
      }
      
      // Make sure map renders correctly
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
      
    } catch (error) {
      console.error('Error updating map markers:', error);
      setMapError('Failed to load map data. Please refresh the page.');
    }
  }, [services, userLocation, liveLocations, onServiceSelect, isMapLoaded, mapError, showCompletionLocations]);

  // Make selectService available globally for popup buttons
  useEffect(() => {
    (window as any).selectService = (serviceId: string) => {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        onServiceSelect(service);
      }
    };

    return () => {
      delete (window as any).selectService;
    };
  }, [services, onServiceSelect]);

  if (mapError) {
    return (
      <div className="w-full h-[500px] rounded-lg overflow-hidden border shadow-lg flex items-center justify-center bg-gray-50">
        <div className="text-center p-4">
          <p className="text-red-500 font-medium mb-4">{mapError}</p>
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border shadow-lg relative">
      <div ref={mapRef} className="w-full h-full" />
      {/* Loading overlay - shows only while map is initializing */}
      {!isMapLoaded && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-blue-500 font-medium">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;