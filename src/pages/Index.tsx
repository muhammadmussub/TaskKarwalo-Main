import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import ServiceCategories from "@/components/ServiceCategories";
import { ProviderCards } from "@/components/ProviderCards";
import AboutSection from "@/components/AboutSection";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import NearMeButton from "@/components/NearMeButton";
import { toast } from "sonner";
import GlobeView from "@/components/GlobeView";
import { serviceCategories } from "@/data/serviceCategories";
// ActiveUsersStats is now included in GlobeView

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  base_price: number;
  price_negotiable: boolean;
  provider_id: string;
  provider_profiles?: {
    business_name: string;
    business_address: string;
    rating: number;
    verified: boolean;
    verified_pro: boolean;
    total_jobs: number;
    total_commission: number;
    latitude?: number;
    longitude?: number;
  };
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isNearMeActive, setIsNearMeActive] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const { toast: showToast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [pageError, setPageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiSearchResult, setAiSearchResult] = useState<any>(null); // AI search result state

  // Load all services for the map
  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      // Fetch all active and approved services
      const { data: servicesData, error: servicesError } = await supabase
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

      if (servicesError) {
        console.error('Error loading services:', servicesError);
        throw servicesError;
      }

      if (!servicesData || servicesData.length === 0) {
        setServices([]);
        setLoading(false);
        return;
      }

      // Get unique provider IDs
      const providerIds = [...new Set(servicesData.map(service => service.provider_id))];
      
      // Fetch provider profiles and user profiles separately
      const [{ data: providerProfilesData, error: providerProfilesError }, { data: profilesData, error: profilesError }] = await Promise.all([
        supabase
          .from('provider_profiles')
          .select('user_id, business_name, business_address, rating, verified, verified_pro, total_jobs, total_commission, latitude, longitude')
          .in('user_id', providerIds),
        supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', providerIds)
      ]);

      if (providerProfilesError) {
        console.error('Error loading provider profiles:', providerProfilesError);
        throw providerProfilesError;
      }

      if (profilesError) {
        console.error('Error loading user profiles:', profilesError);
        throw profilesError;
      }

      // Create maps for easy lookup
      const providerProfilesMap = (providerProfilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Combine data
      const servicesWithProfiles = servicesData
        .filter(service => providerProfilesMap[service.provider_id] && profilesMap[service.provider_id])
        .map(service => ({
          ...service,
          provider_profiles: providerProfilesMap[service.provider_id],
          profiles: profilesMap[service.provider_id]
        }))
        .sort((a, b) => {
          // Prioritize pro providers (verified_pro = true)
          const aIsPro = a.provider_profiles?.verified_pro ? 1 : 0;
          const bIsPro = b.provider_profiles?.verified_pro ? 1 : 0;

          // If both are pro or both are not pro, sort by rating
          if (aIsPro === bIsPro) {
            return (b.provider_profiles?.rating || 0) - (a.provider_profiles?.rating || 0);
          }

          // Pro providers come first
          return bIsPro - aIsPro;
        }) as Service[];

      setServices(servicesWithProfiles);
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading services:', error);
      setPageError("Failed to load services. Please refresh the page.");
      setLoading(false);
      toast.error("Failed to load services");
    }
  };

  const handleSearch = (query: string, location: string, aiResult?: any) => {
    try {
      setSearchQuery(query);
      setSelectedCategory(""); // Reset category when searching
      setAiSearchResult(aiResult || null); // Store AI search result

      // Scroll to results
      setTimeout(() => {
        const resultsElement = document.querySelector('[data-results="true"]');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

      // Enhanced toast message with AI info
      let toastDescription = `Looking for "${query}" in ${location || "your area"}`;
      if (aiResult) {
        const categoryName = aiResult.detectedCategory === 'general' ? 'services' :
          aiResult.detectedCategory.charAt(0).toUpperCase() + aiResult.detectedCategory.slice(1);
        toastDescription = `AI found ${categoryName}`;
        if (aiResult.specificServices.length > 0) {
          toastDescription += ` with ${aiResult.specificServices.join(', ')}`;
        }
      }

      showToast({
        title: aiResult ? "AI Search Results" : "Searching providers...",
        description: toastDescription,
      });
    } catch (error) {
      console.error('Error handling search:', error);
    }
  };

  const handleCategorySelect = (category: string) => {
    try {
      setSelectedCategory(category);
      setSearchQuery(""); // Reset search when selecting category
      
      // Scroll to results  
      setTimeout(() => {
        const resultsElement = document.querySelector('[data-results="true"]');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      
      // Show toast message
      const categoryName = serviceCategories.find(c => c.id === category)?.name || category;
      showToast({
        title: "Category selected",
        description: `Showing all providers for ${categoryName}`,
      });
    } catch (error) {
      console.error('Error handling category select:', error);
    }
  };

  const handleProviderSelect = (service: Service) => {
    try {
      if (!isAuthenticated) {
        setIsAuthModalOpen(true);
        showToast({
          title: "Login Required",
          description: "Please login to view provider details and book services",
        });
      } else if (user && user.user_type === 'customer') {
        showToast({
          title: "Booking Started",
          description: `Redirecting to chat with ${service.provider_profiles?.business_name}`,
        });
        // In a real app, this would open chat or booking flow
      } else {
        showToast({
          title: "Provider View", 
          description: "You're viewing as a provider. Switch to user account to book services.",
        });
      }
    } catch (error) {
      console.error('Error handling provider select:', error);
    }
  };

  const handleAuthClose = () => {
    try {
      setIsAuthModalOpen(false);
    } catch (error) {
      console.error('Error closing auth modal:', error);
    }
  };

  const handleLocationFound = (lat: number, lng: number) => {
    try {
      setUserLocation({ lat, lng });
      setIsNearMeActive(true);
      
      // Scroll to results
      setTimeout(() => {
        const resultsElement = document.querySelector('[data-results="true"]');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error) {
      console.error('Error handling location found:', error);
    }
  };

  const handleLocationCleared = () => {
    try {
      setUserLocation(null);
      setIsNearMeActive(false);
    } catch (error) {
      console.error('Error clearing location:', error);
    }
  };

  const handleLocationChange = (lat: number, lng: number) => {
    try {
      setUserLocation({ lat, lng });
      setIsNearMeActive(true);
    } catch (error) {
      console.error('Error handling location change:', error);
    }
  };

  if (pageError) {
    return (
      <div className="min-h-screen bg-[hsl(220,20%,10%)] flex items-center justify-center">
        <div className="text-center p-8 bg-[hsl(220,20%,12%)] rounded-lg shadow-lg border border-[hsl(220,20%,18%)]">
          <h2 className="text-2xl font-bold text-[hsl(210,100%,65%)] mb-4">Error Loading Page</h2>
          <p className="text-[hsl(210,100%,75%)] mb-6">{pageError}</p>
          <button 
            className="px-6 py-3 bg-[hsl(210,100%,65%)] text-white rounded-lg hover:bg-[hsl(210,100%,70%)] glow-effect"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(220,20%,10%)]">
      {/* Navigation */}
      <Navigation onOpenAuth={() => setIsAuthModalOpen(true)} />

      {/* Globe View Section - This replaces the HeroSection */}
      <GlobeView 
        services={services}
        onServiceSelect={handleProviderSelect}
        userLocation={userLocation || undefined}
        onLocationChange={handleLocationChange}
        onSearch={handleSearch}
        monthlyDelivered={1021}
        yearlyDelivered={4603}
        activeUsers={845}
      />

      {/* Service Categories */}
      <ServiceCategories onCategorySelect={handleCategorySelect} />

      {/* Provider Results */}
      <div data-results="true">
        <div className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-[hsl(0,0%,95%)] mb-6">
              {searchQuery ? 
                `Search Results for "${searchQuery}"` : 
                selectedCategory ? 
                  `${serviceCategories.find(c => c.id === selectedCategory)?.name || selectedCategory}` : 
                  "Available Services"}
            </h2>
            
            <ProviderCards
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              onProviderSelect={handleProviderSelect}
              userLocation={userLocation} // Add this prop
              isNearMeActive={isNearMeActive} // Add this prop
              aiSearchResult={aiSearchResult} // Add AI search result prop
            />
          </div>
        </div>
      </div>

      {/* About Section */}
      <AboutSection />

      {/* Footer */}
      <Footer />

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={handleAuthClose}
      />
    </div>
  );
};

export default Index;