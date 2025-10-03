import React, { useEffect, useState } from 'react';
import { filterServicesByDistance } from '@/utils/distanceCalculator';
import { aiSearchEngine, type AISearchResult } from '@/utils/aiSearch';
import { LocationService, locationService, type LocationSuggestion } from '@/utils/locationService';
import { Users, MapPin, ChevronDown, Search, Activity, TrendingUp, Sparkles } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MapView from "@/components/MapView";
import ActiveUsersStats from "@/components/ActiveUsersStats";
import { FloatingMessages } from "@/components/FloatingMessages";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";

// Service Text Animation Component
const ServiceTextAnimation = () => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const serviceTexts = [
    "Grocery le aao ghar pe",
    "AC service chahiye is week",
    "Kapray press karwa do please",
    "Bartan dhulwane hain ghar pe",
    "Tailor se kapray uthwa do",
    "Curtains lagwaane hain urgently",
    "Fridge ki safai karwao",
    "Mehndi lagwani hai shaadi pe",
    "Makeup artist chahiye ghar pe",
    "Hair cut chahiye is weekend",
    "Facial chahiye trusted expert se",
    "Massage chahiye ghar pe aaj",
    "School tuition chahiye daily basis",
    "Assignment likhwa do kal tak",
    "Presentation banwani hai jaldi please",
    "Notes banwane hain exam ke",
    "Car wash chahiye ghar pe",
    "Driver chahiye school run ke",
    "Rickshaw book karwa do abhi",
    "Online form fill karwana hai",
    "Pick up groceries from store",
    "Schedule AC service this week",
    "Iron clothes for tomorrow morning",
    "Wash dishes at home today",
    "Collect clothes from the tailor",
    "Install curtains in living room",
    "Clean fridge before guests arrive",
    "Apply mehndi for wedding event",
    "Hire makeup artist for party",
    "Get haircut this weekend please",
    "Book facial at home today",
    "Schedule massage session at home",
    "Hire tutor for school subjects",
    "Write assignment before tomorrow night",
    "Make presentation for class project",
    "Create notes for upcoming exam",
    "Wash car in driveway today",
    "Book driver for school pickup",
    "Reserve rickshaw for market trip",
    "Fill online form for application"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);

      setTimeout(() => {
        setCurrentTextIndex((prevIndex) =>
          prevIndex === serviceTexts.length - 1 ? 0 : prevIndex + 1
        );
        setIsVisible(true);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [serviceTexts.length]);

  // Add CSS animation styles
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes gradientShift {
        0%, 100% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
      }

      .service-text-gradient {
        background: linear-gradient(45deg, #3b82f6, #8b5cf6, #06b6d4, #10b981);
        background-size: 300% 300%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: gradientShift 3s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
      <div
        className={`text-base md:text-lg lg:text-xl font-medium text-center transition-all duration-700 ${
          isVisible
            ? 'opacity-100 transform translate-y-0 scale-100'
            : 'opacity-0 transform translate-y-2 scale-95'
        } service-text-gradient px-6 py-3 rounded-2xl bg-black/10 backdrop-blur-md border border-white/10 shadow-xl`}
      >
        {serviceTexts[currentTextIndex]}
      </div>
    </div>
  );
};

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
  completion_location_lat?: number;
  completion_location_lng?: number;
  location_confirmed_at?: string;
}

interface PointData {
  lat: number;
  lng: number;
  size: number;
  color: string;
  service?: Service;
  isUser?: boolean;
  isFlight?: boolean;
  flightNumber?: string;
}

interface GlobeViewProps {
  services: Service[];
  onServiceSelect: (service: Service) => void;
  userLocation?: { lat: number; lng: number };
  onLocationChange?: (lat: number, lng: number) => void;
  onSearch?: (query: string, location: string) => void; // Add this prop
  activeUsers?: number;
  monthlyDelivered?: number;
  yearlyDelivered?: number;
}

const GlobeView: React.FC<GlobeViewProps> = ({
  services,
  onServiceSelect,
  userLocation,
  onLocationChange,
  onSearch,
  activeUsers = 845,
  monthlyDelivered = 1021,
  yearlyDelivered = 4603,
}) => {
  const { theme } = useTheme();
  const [showBoundaryRing, setShowBoundaryRing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("Select Location");
  const [showMap, setShowMap] = useState(true);
  const [nearMeClicked, setNearMeClicked] = useState(false);
  const [componentError, setComponentError] = useState<string | null>(null);
  const [realTimeStats, setRealTimeStats] = useState({
    activeUsers: activeUsers,
    monthlyDelivered: monthlyDelivered,
    yearlyDelivered: yearlyDelivered,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]); // Enhanced location suggestions with type info
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false); // Control suggestion visibility
  const [aiSearchResult, setAiSearchResult] = useState<AISearchResult | null>(null); // AI search result
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]); // AI search suggestions
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false); // Control search suggestions visibility

  // Pakistan coordinates for initial view
  const PAKISTAN_COORDINATES = { lat: 30.3753, lng: 69.3451 };
  const BOUNDARY_RADIUS_KM = 10; // 10km boundary radius

  // Set up real-time statistics updates
  useEffect(() => {
    const fetchRealTimeStats = async () => {
      try {
        setIsLoading(true);
        // Get active users
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const [usersResult, ordersMonthResult, ordersYearResult] = await Promise.all([
          // Active users query
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('updated_at', fiveMinutesAgo),
          
          // Monthly delivered services
          supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed')
            .gte('completed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
          
          // Yearly delivered services
          supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed')
            .gte('completed_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        ]);
        
        setRealTimeStats({
          activeUsers: usersResult.count || activeUsers,
          monthlyDelivered: ordersMonthResult.count || monthlyDelivered,
          yearlyDelivered: ordersYearResult.count || yearlyDelivered
        });
      } catch (error) {
        console.error('Error fetching real-time stats:', error);
        // Keep the default values on error
      } finally {
        setIsLoading(false);
      }
    };
    
    // Initial fetch
    fetchRealTimeStats();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: 'status=eq.completed'
        },
        () => {
          // When a booking is completed, refetch stats
          fetchRealTimeStats();
        }
      )
      .subscribe();
    
    // Refresh every 2 minutes
    const interval = setInterval(fetchRealTimeStats, 120000);
    
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [activeUsers, monthlyDelivered, yearlyDelivered]);

  // Reset search state
  const resetLocationSearch = () => {
    setLocationSearch("");
    setSelectedLocation("Select Location");
  };

  useEffect(() => {
    try {
      // When user location changes, show the map and update boundary
      if (userLocation && nearMeClicked) {
        setShowBoundaryRing(true);
        setShowMap(true);
      }
    } catch (error) {
      console.error('Error in GlobeView useEffect:', error);
      setComponentError('An error occurred while updating the view.');
    }
  }, [userLocation, nearMeClicked]);

  // Generate boundary ring coordinates
  const generateBoundaryRing = () => {
    try {
      if (!userLocation) return [];
      
      const segments = 64;
      const earthRadius = 6371; // Earth radius in km
      
      // Calculate the radius in degrees (approximate)
      const latRadius = BOUNDARY_RADIUS_KM / earthRadius * (180 / Math.PI);
      const lngRadius = latRadius / Math.cos(userLocation.lat * Math.PI / 180);
      
      const ring = [];
      
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        const lat = userLocation.lat + latRadius * Math.sin(angle);
        const lng = userLocation.lng + lngRadius * Math.cos(angle);
        ring.push({ lat, lng });
      }
      
      return ring;
    } catch (error) {
      console.error('Error generating boundary ring:', error);
      return [];
    }
  };

  // Handle search functionality with AI
  const handleSearch = () => {
    try {
      console.log("AI Searching for:", searchQuery, "in", selectedLocation);

      // Use AI search engine to analyze the query
      if (searchQuery.trim()) {
        const aiResult = aiSearchEngine.parseQuery(searchQuery);
        setAiSearchResult(aiResult);

        console.log("AI Search Result:", aiResult);

        // Show AI-powered toast message
        const categoryName = aiResult.detectedCategory === 'general' ? 'services' :
          aiResult.detectedCategory.charAt(0).toUpperCase() + aiResult.detectedCategory.slice(1);

        let toastMessage = `Found ${categoryName}`;
        if (aiResult.specificServices.length > 0) {
          toastMessage += ` with ${aiResult.specificServices.join(', ')}`;
        }

        // Call the onSearch prop if provided
        if (onSearch) {
          onSearch(searchQuery, selectedLocation);
        } else {
          console.log(`AI Search triggered for: ${searchQuery}`, aiResult);
        }
      }
    } catch (error) {
      console.error('Error handling AI search:', error);
    }
  };

  // Handle "Near Me" button click
  const handleNearMe = () => {
    try {
      console.log("Near Me button clicked");
      // Set the Near Me clicked flag to true
      setNearMeClicked(true);
      // Always show the map
      setShowMap(true);
      
      // Get user's geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          // Success callback
          (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            console.log("User location:", userLat, userLng);
            
            if (onLocationChange) {
              // Use actual user coordinates
              onLocationChange(userLat, userLng);
            }
            setIsLoading(false);
          },
          // Error callback
          (error) => {
            console.error("Geolocation error:", error);
            // Fallback to Pakistan coordinates if geolocation fails
            if (onLocationChange) {
              onLocationChange(PAKISTAN_COORDINATES.lat, PAKISTAN_COORDINATES.lng);
            }
            setIsLoading(false);
            // Show a message that geolocation failed
            alert("Could not get your location. Using default location instead.");
          },
          // Options
          { 
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
        );
      } else {
        console.error("Geolocation not supported");
        // Fallback to Pakistan coordinates if geolocation not supported
        if (onLocationChange) {
          onLocationChange(PAKISTAN_COORDINATES.lat, PAKISTAN_COORDINATES.lng);
        }
        setIsLoading(false);
        // Show a message that geolocation is not supported
        alert("Your browser does not support geolocation. Using default location instead.");
      }
    } catch (error) {
      console.error('Error handling Near Me click:', error);
      setComponentError('An error occurred while processing your request.');
      setIsLoading(false);
    }
  };

  // Handle "Explore Services" button click
  const handleExploreServices = () => {
    try {
      console.log("Explore Services button clicked");
      const servicesElement = document.getElementById('services');
      if (servicesElement) {
        servicesElement.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error handling Explore Services click:', error);
    }
  };

  if (componentError) {
    return (
      <div className="w-full rounded-lg overflow-hidden shadow-lg relative bg-[#f8faff] p-8 text-center">
        <h2 className="text-xl font-bold text-red-500 mb-4">Error Loading Content</h2>
        <p className="text-gray-700 mb-4">{componentError}</p>
        <Button onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </div>
    );
  }

  // Format number to be more compact (e.g., 1.2K instead of 1,200)
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Add CSS for gradient text animation and animated background
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .stretched-search {
        width: 100%;
        max-width: 900px;
      }
      
      .scroll-fade-in {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease-out, transform 0.6s ease-out;
      }
      
      .scroll-fade-in.visible {
        opacity: 1;
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Function to generate static background elements
  const generateBackgroundElements = () => {
    return null; // No animated elements for a clean, static background
  };

  // Close location dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('location-dropdown');
      const trigger = document.getElementById('location-trigger');
      
      if (dropdown && !dropdown.classList.contains('hidden') && 
          dropdown.contains(event.target as Node)) {
        // Click is inside the dropdown, do nothing
        return;
      }
      
      if (trigger && trigger.contains(event.target as Node)) {
        // Click is on the trigger, toggle the dropdown
        return;
      }
      
      // Click is outside, hide the dropdown
      if (dropdown) {
        dropdown.classList.add('hidden');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add scroll animation effect
  useEffect(() => {
    const handleScroll = () => {
      const elements = document.querySelectorAll('.scroll-fade-in');
      elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < window.innerHeight - elementVisible) {
          element.classList.add('visible');
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Trigger on initial load
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="w-full rounded-lg overflow-hidden shadow-lg relative bg-background theme-transition">
      {/* Hero section with theme-aware background */}
      <div className="w-full py-20 px-4 flex flex-col items-center justify-center bg-background relative overflow-hidden" style={{ minHeight: '600px' }}>
        {/* Theme-aware background */}
        <div className={`absolute inset-0 z-0 bg-gradient-to-br ${theme === 'dark' ? 'from-[hsl(220,35%,4%)] to-[hsl(220,30%,7%)]' : 'from-[hsl(210,50%,98%)] to-[hsl(210,40%,95%)]'}`}></div>

        {/* Content text */}
        <div className="relative z-10 text-center max-w-5xl mx-auto px-4 scroll-fade-in">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 text-center leading-tight">
            <span className="text-black dark:text-white block mb-2">Koi bhi kaam—chhota ho ya bara,</span>
            <span className="text-[hsl(210,100%,65%)] text-glow bg-gradient-to-r from-[hsl(210,100%,65%)] to-[hsl(200,100%,70%)] bg-clip-text text-transparent animate-pulse">
              idhar se easily Task Karwalo.
            </span>
          </h1>

          {/* Visual separator */}
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[hsl(210,100%,65%)] to-transparent mx-auto mb-8"></div>
          
          
          {/* Search Bar - Enhanced with better design */}
          <div className="w-full stretched-search mx-auto mb-10 scroll-fade-in">
            <div className="flex flex-col sm:flex-row rounded-2xl overflow-hidden shadow-2xl border-2 border-[hsl(210,100%,65%)]/20 bg-card backdrop-blur-sm hover:border-[hsl(210,100%,65%)]/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              <div className="flex-1 relative group">
                <input
                  type="text"
                  placeholder="What service do you need?"
                  className="w-full border-0 text-lg h-16 pl-6 pr-12 focus:ring-0 focus:outline-none bg-transparent text-foreground placeholder-muted-foreground transition-all duration-200 group-hover:placeholder-[hsl(210,100%,75%)]"
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchQuery(value);

                    // Generate AI suggestions
                    if (value.length > 1) {
                      const suggestions = aiSearchEngine.getSuggestions(value);
                      setSearchSuggestions(suggestions);
                      setShowSearchSuggestions(true);
                    } else {
                      setShowSearchSuggestions(false);
                    }
                  }}
                  onFocus={() => {
                    if (searchQuery.length > 1) {
                      const suggestions = aiSearchEngine.getSuggestions(searchQuery);
                      setSearchSuggestions(suggestions);
                      setShowSearchSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding suggestions to allow clicking
                    setTimeout(() => {
                      setShowSearchSuggestions(false);
                    }, 200);
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <Search className="h-6 w-6 text-[hsl(210,100%,65%)] transition-transform duration-200 group-hover:scale-110" />
                </div>

                {/* AI Search Suggestions Dropdown */}
                {showSearchSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-xl top-full">
                    <div className="px-3 py-2 border-b border-border bg-muted/50">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Sparkles className="h-3 w-3 text-[hsl(210,100%,65%)]" />
                        <span>AI Suggestions</span>
                      </div>
                    </div>
                    <ul className="py-1 max-h-60 overflow-auto">
                      {searchSuggestions.map((suggestion, index) => (
                        <li
                          key={index}
                          className="px-4 py-2 hover:bg-accent cursor-pointer text-foreground flex items-center gap-2 group"
                          onMouseDown={() => {
                            setSearchQuery(suggestion);
                            setShowSearchSuggestions(false);
                            setTimeout(() => handleSearch(), 100);
                          }}
                        >
                          <Sparkles className="h-4 w-4 text-[hsl(210,100%,65%)] group-hover:scale-110 transition-transform" />
                          <span className="flex-1">{suggestion}</span>
                          <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            Press Enter
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="sm:w-52 relative group">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Select Location"
                    className="w-full h-16 text-lg border-0 border-l-2 border-[hsl(210,100%,65%)]/30 px-4 pr-12 bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-0 transition-all duration-200 group-hover:border-[hsl(210,100%,65%)]/50"
                    value={locationSearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      setLocationSearch(value);

                      // If user types, reset any previously selected location
                      if (selectedLocation !== "Select Location") {
                        setSelectedLocation("Select Location");
                      }

                      setShowLocationSuggestions(true);

                      // Use location service for intelligent suggestions
                      if (value.length > 0) {
                        LocationService.searchLocations(value, userLocation).then(searchResult => {
                          console.log('Location search results for "' + value + '":', searchResult.suggestions);
                          setLocationSuggestions(searchResult.suggestions);
                        }).catch(error => {
                          console.error('Error searching locations:', error);
                          setLocationSuggestions([]);
                        });
                      } else {
                        setLocationSuggestions([]);
                      }
                    }}
                    onFocus={() => {
                      setShowLocationSuggestions(true);
                      // Show popular locations when focused with empty input
                      if (!locationSearch) {
                        const popularLocations = LocationService.getPopularLocations();
                        setLocationSuggestions(popularLocations);
                      }
                    }}
                    onBlur={() => {
                      // Longer delay to allow clicking on suggestions
                      setTimeout(() => {
                        if (document.activeElement !== document.querySelector('input[placeholder="Select Location"]')) {
                          setShowLocationSuggestions(false);
                        }
                      }, 300);
                    }}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none flex items-center gap-2">
                    {selectedLocation !== "Select Location" && (
                      <span className="text-xs px-2 py-1 rounded-full bg-[hsl(210,100%,65%)]/20 text-[hsl(210,100%,65%)] mr-1 animate-pulse">
                        {selectedLocation}
                      </span>
                    )}
                    <MapPin className="h-5 w-5 text-[hsl(210,100%,65%)] transition-transform duration-200 group-hover:scale-110" />
                  </div>
                  
                  {/* Location suggestions dropdown */}
                  {showLocationSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute z-[100] w-full mt-1 bg-popover border border-border rounded-md shadow-xl">
                      <ul className="py-1 max-h-60 overflow-auto">
                        {locationSuggestions.map((location, index) => (
                          <li
                            key={index}
                            className="px-4 py-2 hover:bg-accent cursor-pointer text-foreground"
                            onMouseDown={() => { // Using onMouseDown instead of onClick to prevent blur
                              setSelectedLocation(location.fullName);
                              setLocationSearch("");
                              // Don't hide the suggestions yet to make it visible to user
                              // Update location if we have coordinates for the selected location
                              if (onLocationChange) {
                                onLocationChange(location.lat, location.lng);
                                setNearMeClicked(true);
                                setShowMap(true);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{location.name}</div>
                                <div className="text-xs text-muted-foreground">{location.fullName}</div>
                              </div>
                              <div className="text-xs text-muted-foreground capitalize">
                                {location.type}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <Button
                className="h-16 px-8 bg-gradient-to-r from-[hsl(210,100%,65%)] to-[hsl(200,100%,70%)] hover:from-[hsl(210,100%,70%)] hover:to-[hsl(200,100%,75%)] text-white font-bold flex items-center justify-center transition-all duration-300 shadow-2xl hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] transform hover:scale-105 active:scale-95 rounded-l-none border-l-2 border-[hsl(210,100%,65%)]/30"
                onClick={handleSearch}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    <span className="text-lg">AI Search</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Action Buttons - Enhanced Design */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 scroll-fade-in">
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border-2 border-[hsl(210,100%,65%)]/30 hover:border-[hsl(210,100%,65%)]/60 hover:bg-[hsl(210,100%,65%)]/10 text-foreground rounded-2xl px-8 py-4 transition-all shadow-xl hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] w-full sm:w-auto transform hover:scale-105 active:scale-95"
              onClick={handleNearMe}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-[hsl(210,100%,65%)] border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <MapPin className="h-5 w-5 text-[hsl(210,100%,65%)]" />
              )}
              <span className="font-semibold">Near Me</span>
            </Button>

            <Button
              variant="outline"
              className="flex items-center gap-2 bg-gradient-to-r from-[hsl(200,100%,60%)]/20 to-[hsl(190,100%,65%)]/20 backdrop-blur-sm border-2 border-[hsl(200,100%,60%)]/40 hover:border-[hsl(200,100%,60%)]/70 hover:from-[hsl(200,100%,60%)]/30 hover:to-[hsl(190,100%,65%)]/30 text-foreground transition-all px-8 py-4 w-full sm:w-auto rounded-2xl shadow-xl hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transform hover:scale-105 active:scale-95"
              onClick={handleExploreServices}
            >
              <TrendingUp className="h-5 w-5 text-[hsl(200,100%,60%)]" />
              <span className="font-semibold">Explore Services</span>
            </Button>
          </div>

          {/* Service Text Animation - Now at the bottom */}
          <ServiceTextAnimation />
        </div>
      </div>
      
      {/* Map View showing Pakistan or 10km radius - Theme-aware UI */}
      {showMap && (
        <div className="mt-8 mb-8 container mx-auto scroll-fade-in">
          <div className="bg-card p-6 rounded-lg shadow-xl border border-border">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                {nearMeClicked ? (
                  <span>Service Providers Near You <span className="text-primary">(10km Radius)</span></span>
                ) : (
                  <span>Service Providers in Pakistan</span>
                )}
              </h2>
              
              {/* Live tracking badge with theme-aware design */}
              <div className="flex items-center gap-3 flex-wrap justify-end">
                <Badge className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full shadow-lg">
                  <div className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse"></div>
                  LIVE TRACKING
                </Badge>
                
                <div className="flex items-center bg-primary/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-primary/30">
                  <div className="w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center mr-2">
                    <Users className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <span className="text-foreground font-semibold">{formatNumber(realTimeStats.activeUsers)}</span>
                </div>
              </div>
            </div>
            
            {/* Map with loading state */}
            <div className="rounded-lg overflow-hidden">
              <MapView 
                services={services}
                onServiceSelect={onServiceSelect}
                userLocation={nearMeClicked ? userLocation : undefined}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobeView;