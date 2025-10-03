import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
   Search,
   Users,
   Star,
   MapPin,
   Receipt,
   Phone,
   Mail,
   Eye,
   Shield,
   XCircle,
   CheckCircle,
   AlertTriangle,
   DollarSign,
   Target
 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ProviderDetailView from './ProviderDetailView';

interface Provider {
   id: string;
   user_id: string;
   business_name: string;
   business_type: string;
   business_address: string;
   rating?: number;
   total_jobs?: number;
   total_earnings?: number;
   total_commission?: number;
   phone?: string;
   admin_approved: boolean;
   verified: boolean;
   verified_pro?: boolean;
   is_banned?: boolean;
   application_status?: string;
   completed_jobs_since_commission?: number;
   commission_reminder_active?: boolean;
   last_commission_paid_at?: string;
   profiles?: {
     full_name: string;
     email: string;
     phone?: string;
     is_banned?: boolean;
   };
   // Commission and earnings data
   commission_data?: {
     is_commission_due: boolean;
     current_cycle_jobs: number;
     commission_amount: number;
     last_payment_status?: string;
     last_payment_date?: string;
   };
 }

const ProviderOverviewSearch = () => {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      console.log('Starting to fetch ALL providers...');

      // Fetch all providers with their profiles - NO FILTERING AT THE DATABASE LEVEL
      const { data: providersData, error: providersError } = await supabase
        .from('provider_profiles')
        .select('*')
        .order('business_name', { ascending: true });

      if (providersError) {
        console.error('Supabase query error for providers:', providersError);
        throw new Error(`Failed to fetch providers: ${providersError.message}`);
      }

      console.log('Raw provider data fetched:', providersData);
      console.log('Number of providers fetched:', providersData?.length || 0);

      // Now fetch user profiles separately to avoid join issues
      const userIds = providersData?.map(provider => provider.user_id) || [];
      let profilesData = [];

      if (userIds.length > 0) {
        const { data: fetchedProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, phone, is_banned')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          // Only show error if it's a critical error, not just missing profiles table
          if (!profilesError.message.includes('does not exist')) {
            toast.error(`Failed to fetch user profiles: ${profilesError.message}`);
          }
          // Continue with what we have rather than throwing
        } else {
          profilesData = fetchedProfiles || [];
        }
      }

      // Create a map for easy profile lookup
      const profilesMap = profilesData.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {});

      console.log('Profiles map:', profilesMap);

      // Fetch commission payments and booking data for commission calculations
      let commissionDataMap: Record<string, any> = {};
      let bookingDataMap: Record<string, any> = {};

      if (userIds.length > 0) {
        try {
          // Fetch commission payments
          const { data: commissionPayments, error: commissionError } = await supabase
            .from('commission_payments')
            .select('*')
            .in('provider_id', userIds)
            .order('submitted_at', { ascending: false });

          if (commissionError && !commissionError.message.includes('does not exist')) {
            console.error('Error fetching commission payments:', commissionError);
          } else if (commissionPayments) {
            // Group by provider_id
            commissionDataMap = commissionPayments.reduce((acc, payment) => {
              if (!acc[payment.provider_id]) {
                acc[payment.provider_id] = [];
              }
              acc[payment.provider_id].push(payment);
              return acc;
            }, {});
          }

          // Fetch booking data for each provider
          const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select('provider_id, status, final_price, proposed_price, completed_at')
            .in('provider_id', userIds);

          if (bookingsError && !bookingsError.message.includes('does not exist')) {
            console.error('Error fetching bookings:', bookingsError);
          } else if (bookingsData) {
            // Group by provider_id and calculate stats
            bookingDataMap = bookingsData.reduce((acc, booking) => {
              const providerId = booking.provider_id;
              if (!acc[providerId]) {
                acc[providerId] = {
                  total_jobs: 0,
                  completed_jobs: 0,
                  total_earnings: 0,
                  current_cycle_jobs: 0
                };
              }

              acc[providerId].total_jobs += 1;

              if (booking.status === 'completed') {
                acc[providerId].completed_jobs += 1;
                const earnings = booking.final_price || booking.proposed_price || 0;
                acc[providerId].total_earnings += earnings;
              }

              return acc;
            }, {});
          }
        } catch (error) {
          console.error('Error fetching additional provider data:', error);
          // Continue without commission/booking data
        }
      }

      // Transform the data to match our interface
      const transformedData = (providersData || []).map((provider: any) => {
        const profile = profilesMap[provider.user_id];
        const providerBookings = bookingDataMap[provider.user_id] || {};
        const providerCommissions = commissionDataMap[provider.user_id] || [];

        // Calculate commission status
        const completedJobs = providerBookings.completed_jobs || provider.total_jobs || 0;

        // Get latest commission payment to determine if counter was reset
        const latestPayment = providerCommissions[0];
        const hasRecentApprovedPayment = latestPayment?.status === 'approved' &&
          latestPayment?.reviewed_at &&
          new Date(latestPayment.reviewed_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

        // Calculate current cycle jobs correctly
        let currentCycleJobs;
        if (hasRecentApprovedPayment) {
          // If there's a recent approved payment, use the database value or 0
          currentCycleJobs = provider.completed_jobs_since_commission || 0;
        } else {
          // If no recent approved payment, calculate based on total completed jobs
          currentCycleJobs = completedJobs % 5;
        }

        const isCommissionDue = completedJobs > 0 && currentCycleJobs === 0 && !hasRecentApprovedPayment;

        return {
          id: provider.id,
          user_id: provider.user_id,
          business_name: provider.business_name || 'Unnamed Business',
          business_type: provider.business_type || 'General Provider',
          business_address: provider.business_address || 'No address provided',
          rating: provider.rating || 0,
          total_jobs: providerBookings.total_jobs || provider.total_jobs || 0,
          total_earnings: providerBookings.total_earnings || provider.total_earnings || 0,
          total_commission: provider.total_commission || 0,
          completed_jobs_since_commission: currentCycleJobs,
          commission_reminder_active: provider.commission_reminder_active || isCommissionDue,
          last_commission_paid_at: provider.last_commission_paid_at,
          admin_approved: provider.admin_approved !== undefined ? provider.admin_approved : false,
          verified: provider.verified !== undefined ? provider.verified : false,
          verified_pro: provider.verified_pro !== undefined ? provider.verified_pro : false,
          application_status: provider.application_status || 'pending',
          is_banned: profile?.is_banned || false,
          profiles: profile ? {
            full_name: profile.full_name || 'Unknown',
            email: profile.email || 'No email',
            phone: profile.phone || 'No phone',
            is_banned: profile.is_banned || false
          } : {
            full_name: 'Unknown',
            email: 'No email',
            phone: 'No phone',
            is_banned: false
          },
          commission_data: {
            is_commission_due: isCommissionDue,
            current_cycle_jobs: currentCycleJobs,
            commission_amount: isCommissionDue ? (providerBookings.total_earnings * 0.05) || 0 : 0,
            last_payment_status: latestPayment?.status,
            last_payment_date: latestPayment?.submitted_at
          }
        };
      });

      console.log('Transformed provider data:', transformedData);
      console.log('Number of transformed providers:', transformedData.length);

      setProviders(transformedData);
      // Auto-select 'all' filter to show all providers
      setFilter('all');
    } catch (error: any) {
      console.error('Error fetching providers:', error);
      toast.error(`Failed to load providers: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter providers based on search term and filter status
  const filteredProviders = useMemo(() => {
    let result = providers;
    
    console.log('Total providers before filtering:', providers.length);
    console.log('Current filter:', filter);
    
    // Apply status filter
    if (filter === 'approved') {
      // Show only approved providers (admin_approved = true)
      result = result.filter(provider => provider.admin_approved);
    } else if (filter === 'pending') {
      // Show pending providers: not approved AND not resubmitted
      // Resubmitted providers should appear in pending filter
      result = result.filter(provider => !provider.admin_approved);
    }
    // For 'all' filter, show all providers with no filtering
    
    console.log('Filtered providers length:', result.length);
    
    // Apply search term filter
    if (!searchTerm) return result;
    
    const term = searchTerm.toLowerCase();
    return result.filter(provider => 
      (provider.business_name && provider.business_name.toLowerCase().includes(term)) ||
      (provider.profiles?.full_name && provider.profiles.full_name.toLowerCase().includes(term)) ||
      (provider.business_type && provider.business_type.toLowerCase().includes(term)) ||
      (provider.business_address && provider.business_address.toLowerCase().includes(term)) ||
      (provider.profiles?.email && provider.profiles.email.toLowerCase().includes(term))
    );
  }, [providers, searchTerm, filter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {selectedProviderId ? (
        <ProviderDetailView 
          providerId={selectedProviderId} 
          onBack={() => setSelectedProviderId(null)} 
        />
      ) : (
        <>
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(210,100%,75%)]" />
              <Input
                placeholder="Search providers by name, business, type, or location..."
                className="pl-10 bg-[hsl(220,20%,15%)] border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] placeholder:text-[hsl(210,100%,75%)]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={filter === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'bg-[hsl(210,100%,65%)]' : 'border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]'}
              >
                All
              </Button>
              <Button 
                variant={filter === 'approved' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('approved')}
                className={filter === 'approved' ? 'bg-[hsl(210,100%,65%)]' : 'border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]'}
              >
                Approved
              </Button>
              <Button 
                variant={filter === 'pending' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('pending')}
                className={filter === 'pending' ? 'bg-[hsl(210,100%,65%)]' : 'border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]'}
              >
                Pending
              </Button>
            </div>
          </div>
          
          {/* Results Info */}
          <div className="text-sm text-[hsl(210,100%,75%)]">
            Showing {filteredProviders.length} of {providers.length} providers
            {filter === 'all' && ' (showing all providers)'}
            {providers.length === 0 && ' - No providers loaded from database! Please check your connection.'}
          </div>

          {/* Providers Grid */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-[hsl(210,100%,65%)] border-t-transparent rounded-full"></div>
            </div>
          ) : filteredProviders.length === 0 ? (
            <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
              <div className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-[hsl(210,100%,75%)] mb-4" />
                <h3 className="font-medium text-lg mb-2 text-[hsl(0,0%,95%)]">No providers found</h3>
                <p className="text-[hsl(210,100%,75%)]">
                  {searchTerm || filter !== 'all'
                    ? 'No providers match your search criteria. Try a different search term or filter.' 
                    : 'There are no providers in the system.'}
                </p>
                {providers.length === 0 && (
                  <Button 
                    onClick={loadProviders}
                    className="mt-4"
                    variant="outline"
                  >
                    Retry Loading Providers
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProviders.map((provider) => (
                <Card 
                  key={provider.user_id} 
                  className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)] hover:shadow-md transition-shadow cursor-pointer" 
                  onClick={() => setSelectedProviderId(provider.id)}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-[hsl(0,0%,95%)]">{provider.business_name || 'Unknown Business'}</h3>
                        <p className="text-[hsl(210,100%,75%)]">{provider.profiles?.full_name || 'Unknown Provider'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1">
                          {provider.rating && (
                            <div className="flex items-center gap-1 bg-[hsl(220,15%,15%)] px-2 py-1 rounded">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium text-[hsl(0,0%,95%)]">{provider.rating.toFixed(1)}</span>
                            </div>
                          )}
                          {provider.is_banned && (
                            <Badge variant="destructive" className="text-xs">
                              Banned
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {provider.admin_approved ? (
                            <Badge variant="default" className="bg-green-600">
                              Approved
                            </Badge>
                          ) : provider.application_status === 'resubmitted' ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              Resubmitted
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              Pending
                            </Badge>
                          )}
                          {provider.verified_pro && (
                            <Badge variant="default" className="bg-purple-600">
                              Pro
                            </Badge>
                          )}
                          {provider.application_status === 'pending' && (
                            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                              Verification Pending
                            </Badge>
                          )}
                          {/* Commission Status Badge */}
                          {provider.commission_data?.is_commission_due && (
                            <Badge variant="destructive" className="bg-red-600 text-white border-red-600">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Commission Due
                            </Badge>
                          )}
                          {provider.commission_reminder_active && !provider.commission_data?.is_commission_due && (
                            <Badge variant="outline" className="text-orange-500 border-orange-500">
                              <Target className="h-3 w-3 mr-1" />
                              Commission Soon
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-2 text-[hsl(210,100%,65%)]" />
                        <span className="text-[hsl(210,100%,75%)] truncate">{provider.business_address || 'No address provided'}</span>
                      </div>

                      {/* Commission Status - Prominent Display */}
                      <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-300">Commission Status</span>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            provider.commission_data?.is_commission_due
                              ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                              : 'bg-green-600/20 text-green-400 border border-green-600/30'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${
                              provider.commission_data?.is_commission_due ? 'bg-red-400' : 'bg-green-400'
                            }`}></div>
                            {provider.commission_data?.is_commission_due ? 'Due' : 'Active'}
                          </div>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Current Cycle:</span>
                            <span className="text-white">{provider.commission_data?.current_cycle_jobs || 0}/5 jobs</span>
                          </div>
                          {provider.commission_data?.is_commission_due && (
                            <div className="flex justify-between font-semibold text-red-400">
                              <span>This Cycle Earnings:</span>
                              <span>{formatCurrency(provider.commission_data?.commission_amount || 0)}</span>
                            </div>
                          )}
                          {provider.commission_data?.last_payment_status && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Last Payment:</span>
                              <span className={`font-medium ${
                                provider.commission_data.last_payment_status === 'approved'
                                  ? 'text-green-400'
                                  : provider.commission_data.last_payment_status === 'rejected'
                                    ? 'text-red-400'
                                    : 'text-yellow-400'
                              }`}>
                                {provider.commission_data.last_payment_status}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Jobs and Earnings */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-2 bg-slate-800/30 rounded-lg">
                          <div className="text-lg font-bold text-white">{provider.total_jobs || 0}</div>
                          <div className="text-xs text-gray-400">Total Jobs</div>
                        </div>
                        <div className="text-center p-2 bg-slate-800/30 rounded-lg">
                          <div className="text-lg font-bold text-green-400">{formatCurrency(provider.total_earnings || 0)}</div>
                          <div className="text-xs text-gray-400">Total Earnings</div>
                        </div>
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
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            // Show a modal or toast with contact information
                            const contactInfo = `
                              Business: ${provider.business_name || 'N/A'}
                              Provider: ${provider.profiles?.full_name || 'N/A'}
                              Email: ${provider.profiles?.email || 'N/A'}
                              Phone: ${provider.profiles?.phone || 'N/A'}
                            `.trim();
                            
                            // Create a more detailed contact information display
                            toast(
                              <div className="space-y-2">
                                <h4 className="font-bold">Contact Information</h4>
                                <div className="text-sm">
                                  <p><strong>Business:</strong> {provider.business_name || 'N/A'}</p>
                                  <p><strong>Provider:</strong> {provider.profiles?.full_name || 'N/A'}</p>
                                  <p><strong>Email:</strong> {provider.profiles?.email || 'N/A'}</p>
                                  <p><strong>Phone:</strong> {provider.profiles?.phone || 'N/A'}</p>
                                </div>
                              </div>,
                              {
                                duration: 10000,
                                dismissible: true
                              }
                            );
                          }}
                        >
                          <Phone className="h-3.5 w-3.5 mr-1" />
                          Contact
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            setSelectedProviderId(provider.id);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                        <Button 
                          variant={provider.is_banned ? "default" : "destructive"}
                          size="sm"
                          className={`flex-1 ${provider.is_banned ? "bg-green-600 hover:bg-green-700" : ""}`}
                          onClick={async (e) => {
                            e.stopPropagation(); // Prevent card click
                            try {
                              // Toggle ban status
                              const newBanStatus = !provider.is_banned;
                              
                              // Update the user's ban status in the profiles table
                              const { error } = await supabase
                                .from('profiles')
                                .update({ is_banned: newBanStatus })
                                .eq('user_id', provider.user_id);
                              
                              if (error) throw error;
                              
                              // Update local state
                              setProviders(prev => prev.map(p => 
                                p.id === provider.id 
                                  ? { ...p, is_banned: newBanStatus, profiles: p.profiles ? { ...p.profiles, is_banned: newBanStatus } : { full_name: '', email: '', phone: '', is_banned: newBanStatus } } 
                                  : p
                              ));
                              
                              toast.success(newBanStatus ? 'Provider banned successfully' : 'Provider unbanned successfully');
                            } catch (error: any) {
                              console.error('Error updating ban status:', error);
                              toast.error(`Failed to update ban status: ${error.message}`);
                            }
                          }}
                        >
                          {provider.is_banned ? (
                            <>
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Unban
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Ban
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProviderOverviewSearch;