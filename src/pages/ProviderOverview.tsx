import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Users, 
  Star, 
  MapPin, 
  ArrowLeft,
  Phone,
  Mail,
  Receipt
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Provider {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  business_address: string;
  rating?: number;
  total_jobs?: number;
  total_earnings?: number;
  phone?: string;
  profiles?: {
    full_name: string;
    email: string;
    phone?: string;
  };
}

const ProviderOverview = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      // Fetch all approved providers with their profiles
      const { data, error } = await supabase
        .from('provider_profiles')
        .select(`
          *,
          profiles (
            full_name,
            email,
            phone
          )
        `)
        .eq('admin_approved', true)
        .order('business_name', { ascending: true });

      if (error) {
        console.error('Supabase query error for providers:', error);
        // Only show error if it's not just a missing table issue
        if (!error.message.includes('does not exist')) {
          throw error;
        }
        // If table doesn't exist, just set empty array
        setProviders([]);
        return;
      }

      // Transform the data to match our interface
      const transformedData = data.map((provider: any) => ({
        id: provider.id,
        user_id: provider.user_id,
        business_name: provider.business_name,
        business_type: provider.business_type,
        business_address: provider.business_address,
        rating: provider.rating,
        total_jobs: provider.total_jobs,
        total_earnings: provider.total_earnings,
        phone: provider.phone,
        profiles: provider.profiles ? {
          full_name: provider.profiles[0]?.full_name || '',
          email: provider.profiles[0]?.email || '',
          phone: provider.profiles[0]?.phone || ''
        } : undefined,
      }));

      setProviders(transformedData || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  // Filter providers based on search term
  const filteredProviders = useMemo(() => {
    if (!searchTerm) return providers;
    
    const term = searchTerm.toLowerCase();
    return providers.filter(provider => 
      (provider.business_name && provider.business_name.toLowerCase().includes(term)) ||
      (provider.profiles?.full_name && provider.profiles.full_name.toLowerCase().includes(term)) ||
      (provider.business_type && provider.business_type.toLowerCase().includes(term)) ||
      (provider.business_address && provider.business_address.toLowerCase().includes(term)) ||
      (provider.profiles?.email && provider.profiles.email.toLowerCase().includes(term))
    );
  }, [providers, searchTerm]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[hsl(220,20%,10%)]">
      {/* Header */}
      <header className="border-b border-[hsl(220,20%,18%)]">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/provider-dashboard")}
              className="transition-all duration-200 hover:scale-105 active:scale-95 hover:bg-[hsl(220,20%,15%)]"
            >
              <ArrowLeft className="h-5 w-5 text-[hsl(0,0%,95%)]" />
            </Button>
            <h1 className="text-xl font-bold text-[hsl(0,0%,95%)]">Provider Overview</h1>
          </div>
        </div>
      </header>

      <div className="container py-6">
        {/* Search Section */}
        <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)] mb-6">
          <CardHeader>
            <CardTitle className="text-[hsl(0,0%,95%)]">All Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(210,100%,75%)]" />
              <Input
                placeholder="Search providers by name, business, type, or location..."
                className="pl-10 bg-[hsl(220,20%,15%)] border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] placeholder:text-[hsl(210,100%,75%)]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <p className="text-sm text-[hsl(210,100%,75%)]">
              Showing {filteredProviders.length} of {providers.length} providers
            </p>
          </CardContent>
        </Card>

        {/* Providers Grid */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-[hsl(210,100%,65%)] border-t-transparent rounded-full"></div>
          </div>
        ) : filteredProviders.length === 0 ? (
          <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
            <CardContent className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto text-[hsl(210,100%,75%)] mb-4" />
              <h3 className="font-medium text-lg mb-2 text-[hsl(0,0%,95%)]">No providers found</h3>
              <p className="text-[hsl(210,100%,75%)]">
                {searchTerm 
                  ? 'No providers match your search criteria. Try a different search term.' 
                  : 'There are no providers in the system.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <Card key={provider.user_id} className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)] hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-[hsl(0,0%,95%)]">{provider.business_name || 'Unknown Business'}</h3>
                      <p className="text-[hsl(210,100%,75%)]">{provider.profiles?.full_name || 'Unknown Provider'}</p>
                    </div>
                    {provider.rating && (
                      <div className="flex items-center gap-1 bg-[hsl(220,15%,15%)] px-2 py-1 rounded">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium text-[hsl(0,0%,95%)]">{provider.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-[hsl(210,100%,65%)]" />
                      <span className="text-[hsl(210,100%,75%)] truncate">{provider.business_address || 'No address provided'}</span>
                    </div>
                    
                    <div className="flex items-center text-sm">
                      <Users className="h-4 w-4 mr-2 text-[hsl(210,100%,65%)]" />
                      <span className="text-[hsl(210,100%,75%)]">{provider.total_jobs || 0} completed jobs</span>
                    </div>
                    
                    <div className="flex items-center text-sm">
                      <Receipt className="h-4 w-4 mr-2 text-[hsl(210,100%,65%)]" />
                      <span className="text-[hsl(210,100%,75%)]">{formatCurrency(provider.total_earnings || 0)} earned</span>
                    </div>
                    
                    <div className="flex items-center text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[hsl(210,100%,65%)] text-white">
                        {provider.business_type || 'Service Provider'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[hsl(220,20%,18%)]">
                    <div className="flex justify-between gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                        onClick={() => {
                          // In a real implementation, you might want to navigate to a provider detail page
                          toast.info('Provider contact information would be displayed here');
                        }}
                      >
                        <Phone className="h-3.5 w-3.5 mr-1" />
                        Contact
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                        onClick={() => {
                          // In a real implementation, you might want to navigate to a provider detail page
                          toast.info('Provider details would be displayed here');
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderOverview;