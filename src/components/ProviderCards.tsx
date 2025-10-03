import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, CheckCircle, Clock, Receipt, Shield, Sparkles, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BookingModal } from "./BookingModal";
import { toast } from "sonner";
import { filterServicesByDistance, formatDistance } from "@/utils/distanceCalculator";
import { aiSearchEngine, type AISearchResult, type ServiceMatch } from "@/utils/aiSearch";

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  base_price: number;
  price_negotiable: boolean;
  provider_id: string;
  distance?: number; // Added for Near Me functionality
  provider_profiles?: {
    business_name: string;
    business_address: string;
    rating: number;
    verified: boolean;
    total_jobs: number;
    total_commission: number;
    verified_pro?: boolean;
    latitude?: number;
    longitude?: number;
    shop_photos?: string[]; // Added to display shop photos
  };
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface ProviderCardsProps {
  searchQuery: string;
  selectedCategory: string;
  onProviderSelect: (service: Service) => void;
  userLocation?: { lat: number; lng: number }; // Add this prop
  isNearMeActive?: boolean; // Add this prop
  aiSearchResult?: AISearchResult; // Add AI search result prop
}

export const ProviderCards = ({
  searchQuery,
  selectedCategory,
  onProviderSelect,
  userLocation, // Add this prop
  isNearMeActive = false, // Add this prop
  aiSearchResult // Add AI search result prop
}: ProviderCardsProps) => {
  const { user, isAuthenticated } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .provider-fade-in {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease-out, transform 0.6s ease-out;
      }
      
      .provider-fade-in.visible {
        opacity: 1;
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
    
    const handleScroll = () => {
      const elements = document.querySelectorAll('.provider-fade-in');
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
      document.head.removeChild(style);
    };
  }, []);

  const loadServices = async () => {
    try {
      let query = supabase
        .from('services')
        .select(`
          id,
          title,
          description,
          category,
          base_price,
          price_negotiable,
          provider_id
        `)
        .eq('is_active', true)
        .eq('admin_approved', true);

      // Apply category filter if selected
      if (selectedCategory && selectedCategory !== "All") {
        query = query.eq('category', selectedCategory);
      }

      // Apply AI search filter if AI search result is available
      if (aiSearchResult && searchQuery.trim()) {
        // Use AI search to get relevant services
        const { data: allServicesData, error: allServicesError } = await supabase
          .from('services')
          .select(`
            id,
            title,
            description,
            category,
            base_price,
            price_negotiable,
            provider_id
          `)
          .eq('is_active', true)
          .eq('admin_approved', true);

        if (allServicesError) {
          console.error('Error loading all services for AI search:', allServicesError);
          throw allServicesError;
        }

        if (allServicesData) {
          // Use AI search engine to rank services
          const aiMatches = aiSearchEngine.searchServices(allServicesData, searchQuery);

          // Get top services based on AI relevance
          const topServiceIds = aiMatches.slice(0, 50).map(match => match.service.id);
          query = query.in('id', topServiceIds);
        }
      } else if (searchQuery.trim()) {
        // Fallback to regular search
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data: servicesData, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading services:', error);
        throw error;
      }

      if (!servicesData || servicesData.length === 0) {
        setServices([]);
        return;
      }

      // Get unique provider IDs
      const providerIds = [...new Set(servicesData.map(service => service.provider_id))];
      
      // Fetch provider profiles and user profiles separately
      const [{ data: providerProfilesData }, { data: profilesData }] = await Promise.all([
        supabase
          .from('provider_profiles')
          .select('user_id, business_name, business_address, rating, verified, total_jobs, total_commission, verified_pro, latitude, longitude, shop_photos')
          .in('user_id', providerIds),
        supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', providerIds)
      ]);

      // Create maps for easy lookup
      const providerProfilesMap = (providerProfilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Combine data and add AI relevance scores if AI search is active
      const servicesWithProfiles = servicesData
        .filter(service => providerProfilesMap[service.provider_id] && profilesMap[service.provider_id])
        .map(service => {
          let enhancedService = {
            ...service,
            provider_profiles: providerProfilesMap[service.provider_id],
            profiles: profilesMap[service.provider_id]
          };

          // Add AI relevance score if AI search is active
          if (aiSearchResult && searchQuery) {
            const aiMatch = aiSearchEngine.calculateRelevanceScore(enhancedService, aiSearchResult);
            (enhancedService as any).aiRelevanceScore = aiMatch.relevanceScore;
          }

          return enhancedService;
        }) as Service[];

      // Smart sorting with AI relevance
      let sortedServices = servicesWithProfiles.sort((a, b) => {
        // If AI search is active, prioritize by AI relevance score
        if (aiSearchResult && searchQuery) {
          const aAIScore = (a as any).aiRelevanceScore || 0;
          const bAIScore = (b as any).aiRelevanceScore || 0;

          if (aAIScore !== bAIScore) {
            return bAIScore - aAIScore;
          }
        }

        // First priority: verified_pro status
        const aVerifiedPro = a.provider_profiles?.verified_pro || false;
        const bVerifiedPro = b.provider_profiles?.verified_pro || false;

        if (aVerifiedPro && !bVerifiedPro) return -1;
        if (!aVerifiedPro && bVerifiedPro) return 1;

        // Second priority: rating
        const aRating = a.provider_profiles?.rating || 0;
        const bRating = b.provider_profiles?.rating || 0;

        if (aRating !== bRating) return bRating - aRating;

        // Third priority: total jobs
        const aTotalJobs = a.provider_profiles?.total_jobs || 0;
        const bTotalJobs = b.provider_profiles?.total_jobs || 0;

        return bTotalJobs - aTotalJobs;
      });

      // Apply location filter if Near Me is active and we have user location
      if (isNearMeActive && userLocation) {
        const nearbyServices = filterServicesByDistance(
          sortedServices,
          userLocation.lat,
          userLocation.lng
        ) as unknown as Service[];
        setServices(nearbyServices);
      } else {
        setServices(sortedServices);
      }
    } catch (error) {
      console.error('Error loading services:', error);
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  // Load services when filters change
  useEffect(() => {
    loadServices();
  }, [searchQuery, selectedCategory, isNearMeActive, userLocation, aiSearchResult]);

  const handleViewDetails = (service: Service) => {
    if (!isAuthenticated) {
      toast.error("Please login to book services");
      return;
    }
    
    if (user?.user_type !== 'customer') {
      toast.error("Only customers can book services");
      return;
    }
    
    setSelectedService(service);
    setShowBookingModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="text-lg text-hero-subtle">
            {services.length} service{services.length !== 1 ? 's' : ''} found
          </div>
          {aiSearchResult && searchQuery && (
            <div className="flex items-center gap-2">
              <Badge className="flex items-center gap-1 bg-gradient-to-r from-[hsl(210,100%,65%)] to-[hsl(200,100%,70%)] text-white">
                <Sparkles className="h-3 w-3" />
                AI Search
              </Badge>
              <Badge variant="outline" className="text-xs">
                {aiSearchResult.detectedCategory.charAt(0).toUpperCase() + aiSearchResult.detectedCategory.slice(1)}
              </Badge>
              {aiSearchResult.specificServices.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {aiSearchResult.specificServices[0]}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.length > 0 ? (
          services.map((service, index) => (
            <Card 
              key={service.id} 
              className="provider-fade-in hover:shadow-lg transition-all duration-300 overflow-hidden"
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-hero-text line-clamp-1">
                      {service.title}
                    </h3>
                    <p className="text-sm text-hero-subtle line-clamp-2">
                      {service.description}
                    </p>
                    {/* AI Search relevance indicator */}
                    {aiSearchResult && searchQuery && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3 text-[hsl(210,100%,65%)]" />
                          <span className="text-xs text-[hsl(210,100%,65%)] font-medium">
                            AI Match
                          </span>
                        </div>
                        {aiSearchResult.specificServices.length > 0 && (
                          <Badge variant="outline" className="text-xs px-2 py-0">
                            {aiSearchResult.specificServices[0]}
                          </Badge>
                        )}
                        {/* Smart ranking indicator */}
                        <div className="flex items-center gap-1 ml-auto">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <div
                                key={star}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  star <= Math.ceil((service as any).aiRelevanceScore / 40)
                                    ? 'bg-[hsl(210,100%,65%)]'
                                    : 'bg-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground ml-1">
                            {Math.round((service as any).aiRelevanceScore || 0)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  {service.provider_profiles?.verified_pro && (
                    <Badge variant="default" className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white border-purple-500 shadow-lg">
                      <Shield className="h-3 w-3" />
                      Pro
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium ml-1">
                      {service.provider_profiles?.rating?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ({service.provider_profiles?.total_jobs || 0} jobs)
                  </div>
                </div>

                <div className="flex items-center gap-1 text-muted-foreground text-sm mb-4">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">
                    {service.provider_profiles?.business_address}
                    {service.distance && (
                      <span className="text-primary font-medium ml-2">
                        ({formatDistance(service.distance)})
                      </span>
                    )}
                  </span>
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <span className="font-semibold text-primary">PKR {service.base_price}</span>
                    {service.price_negotiable && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Negotiable
                      </Badge>
                    )}
                  </div>
                  <Badge variant="default">
                    <Clock className="h-3 w-3 mr-1" />
                    {service.provider_profiles?.total_jobs || 0} jobs
                  </Badge>
                </div>
                
                <Button 
                  className="w-full mt-3"
                  onClick={() => handleViewDetails(service)}
                >
                  Book Now
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12 provider-fade-in">
            <p className="text-muted-foreground">
              {isNearMeActive 
                ? "No services found within 10km of your location." 
                : "No services found matching your criteria."}
            </p>
          </div>
        )}
      </div>

      <BookingModal
        service={selectedService}
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
      />
    </>
  );
};