import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Star,
  MapPin,
  Clock,
  Banknote,
  CheckCircle,
  XCircle,
  MessageSquare,
  Calendar,
  TrendingUp,
  Users,
  ArrowLeft,
  Phone,
  Mail,
  Shield,
  Activity,
  Eye,
  Download,
  FileText,
  Image,
  User,
  Building,
  MapPin as MapPinIcon,
  Camera
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createProviderApprovalNotification, createProviderRejectionNotification } from "@/utils/notificationUtils";

interface ProviderDetailViewProps {
  providerId: string;
  onBack: () => void;
}

interface Provider {
  id: string;
  user_id: string;
  business_name?: string;
  business_type?: string;
  business_address?: string;
  rating?: number;
  total_jobs?: number;
  total_earnings?: number;
  total_commission?: number;
  verified?: boolean;
  verified_pro?: boolean;
  admin_approved?: boolean;
  application_status?: string;
  is_banned?: boolean;
  cnic?: string;
  business_certificate?: string;
  shop_photos?: string[];
  submitted_at?: string;
  // Document fields from provider_profiles table
  cnic_front_image?: string;
  cnic_back_image?: string;
  license_certificate?: string;
  profile_photo?: string;
  proof_of_address?: string;
  rejection_reason?: string;
  admin_notes?: string;
  profiles?: {
    full_name: string;
    email: string;
    phone?: string;
    is_banned?: boolean;
  };
}

interface ServiceData {
  id: string;
  title: string;
  category: string;
  base_price: number;
  is_active: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

interface BookingData {
  id: string;
  title: string;
  status: string;
  final_price: number;
  created_at: string;
  completed_at?: string;
  customer_id: string;
  service_id: string;
}

interface PerformanceData {
  recentEarnings: number;
  weeklyBookings: number;
  completionRate: number;
  averageRating: number;
}

interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
  details?: string;
}

interface CommissionPayment {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  screenshot_url?: string;
  submitted_at: string;
  approved_at?: string;
  rejection_reason?: string;
}

const ProviderDetailView: React.FC<ProviderDetailViewProps> = ({ providerId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [recentBookings, setRecentBookings] = useState<BookingData[]>([]);
  const [commissionPayments, setCommissionPayments] = useState<CommissionPayment[]>([]);
  const [performance, setPerformance] = useState<PerformanceData>({
    recentEarnings: 0,
    weeklyBookings: 0,
    completionRate: 0,
    averageRating: 0
  });

  // Approval/Rejection state
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadProviderData();
  }, [providerId]);

  const loadProviderData = async () => {
    setLoading(true);
    try {
      console.log('Loading provider data for ID:', providerId);

      // Fetch provider profile with all document fields
      const { data: providerData, error: providerError } = await supabase
        .from('provider_profiles')
        .select(`
          *,
          cnic_front_image,
          cnic_back_image,
          license_certificate,
          profile_photo,
          proof_of_address,
          shop_photos
        `)
        .eq('id', providerId)
        .single();

      if (providerError) {
        console.error('Provider fetch error:', providerError);
        throw providerError;
      }

      console.log('Provider data fetched:', providerData);
      console.log('CNIC Front Image:', providerData.cnic_front_image);
      console.log('CNIC Back Image:', providerData.cnic_back_image);
      console.log('Profile Photo:', providerData.profile_photo);
      console.log('Shop Photos:', providerData.shop_photos);

      // Test image loading for identity documents
      if (providerData.cnic_front_image) {
        console.log('Testing CNIC Front image accessibility...');
        try {
          const response = await fetch(providerData.cnic_front_image, { method: 'HEAD' });
          console.log('CNIC Front image status:', response.status, response.statusText);
          console.log('CNIC Front image headers:', Object.fromEntries(response.headers.entries()));
        } catch (error) {
          console.error('CNIC Front image test failed:', error);
        }

        // Test if we can create an image element
        const testImg = document.createElement('img') as HTMLImageElement;
        testImg.onload = () => console.log('CNIC Front image can be loaded by browser');
        testImg.onerror = () => console.error('CNIC Front image cannot be loaded by browser');
        testImg.src = providerData.cnic_front_image;
      }

      if (providerData.cnic_back_image) {
        console.log('Testing CNIC Back image accessibility...');
        try {
          const response = await fetch(providerData.cnic_back_image, { method: 'HEAD' });
          console.log('CNIC Back image status:', response.status, response.statusText);
        } catch (error) {
          console.error('CNIC Back image test failed:', error);
        }
      }

      if (providerData.profile_photo) {
        console.log('Testing Profile Photo image accessibility...');
        try {
          const response = await fetch(providerData.profile_photo, { method: 'HEAD' });
          console.log('Profile Photo image status:', response.status, response.statusText);
        } catch (error) {
          console.error('Profile Photo image test failed:', error);
        }
      }
      
      // Fetch user profile separately
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, phone, is_banned')
        .eq('user_id', providerData.user_id)
        .single();
        
      if (profileError) {
        console.error('Profile fetch error:', profileError);
        // Continue with what we have
      }
      
      console.log('User profile fetched:', userProfile);
      
      // Transform provider data to ensure profile data structure is correct
      const transformedProvider = {
        ...providerData,
        profiles: userProfile ? {
          full_name: userProfile.full_name || 'Unknown',
          email: userProfile.email || 'No email',
          phone: userProfile.phone || 'No phone',
          is_banned: userProfile.is_banned || false
        } : {
          full_name: 'Unknown',
          email: 'No email',
          phone: 'No phone',
          is_banned: false
        }
      };
      
      console.log('Transformed provider:', transformedProvider);
      
      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', providerData.user_id);
        
      if (servicesError) {
        console.error('Services fetch error:', servicesError);
        throw servicesError;
      }
      
      console.log('Services data fetched:', servicesData);
      
      // Fetch recent bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('provider_id', providerData.user_id)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (bookingsError) {
        console.error('Bookings fetch error:', bookingsError);
        throw bookingsError;
      }
      
      console.log('Bookings data fetched:', bookingsData);

      // Fetch commission payments
      const { data: commissionData, error: commissionError } = await supabase
        .from('commission_payments')
        .select('*')
        .eq('provider_id', providerData.user_id)
        .order('submitted_at', { ascending: false });

      if (commissionError) {
        console.error('Commission payments fetch error:', commissionError);
        // Continue without commission data
      }

      console.log('Commission payments data fetched:', commissionData);

      // Calculate performance metrics
      const today = new Date();
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(today.getDate() - 7);
      
      const { data: weeklyBookings, error: weeklyError } = await supabase
        .from('bookings')
        .select('*')
        .eq('provider_id', providerData.user_id)
        .gte('created_at', oneWeekAgo.toISOString());
      
      if (weeklyError) {
        console.error('Weekly bookings fetch error:', weeklyError);
        throw weeklyError;
      }
      
      const completedBookings = (weeklyBookings || []).filter(booking => booking.status === 'completed');
      const weeklyEarnings = completedBookings.reduce((sum, booking) => sum + (booking.final_price || 0), 0);
      const completionRate = weeklyBookings && weeklyBookings.length > 0 
        ? (completedBookings.length / weeklyBookings.length) * 100 
        : 0;
      
      setProvider(transformedProvider);
      setServices(servicesData || []);
      setRecentBookings(bookingsData || []);
      setCommissionPayments(commissionData || []);
      setPerformance({
        recentEarnings: weeklyEarnings,
        weeklyBookings: weeklyBookings?.length || 0,
        completionRate,
        averageRating: providerData.rating || 0
      });
      
    } catch (error: any) {
      console.error('Error loading provider data:', error);
      toast.error(`Failed to load provider details: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Add ban/unban functionality
  const toggleBanStatus = async () => {
    if (!provider) return;

    try {
      const newBanStatus = !provider.profiles?.is_banned;

      // Update the user's ban status in the profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: newBanStatus })
        .eq('user_id', provider.user_id);

      if (error) throw error;

      // Update local state
      setProvider(prev => prev ? {
        ...prev,
        profiles: prev.profiles ? {
          ...prev.profiles,
          is_banned: newBanStatus
        } : undefined
      } : null);

      toast.success(newBanStatus ? 'Provider banned successfully' : 'Provider unbanned successfully');

      // Reload provider data to ensure consistency
      loadProviderData();
    } catch (error: any) {
      console.error('Error updating ban status:', error);
      toast.error(`Failed to update ban status: ${error.message}`);
    }
  };

  // Approve provider
  const approveProvider = async () => {
    if (!provider) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('provider_profiles')
        .update({
          admin_approved: true,
          verified: true,
          application_status: 'approved'
        })
        .eq('id', provider.id);

      if (error) throw error;

      // Send approval notification to provider
      await createProviderApprovalNotification(provider.user_id, provider.business_name || 'your business');

      toast.success('Provider approved successfully!');
      loadProviderData(); // Reload to get updated status
    } catch (error: any) {
      console.error('Error approving provider:', error);
      toast.error(`Failed to approve provider: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject provider
  const rejectProvider = async () => {
    if (!provider || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('provider_profiles')
        .update({
          admin_approved: false,
          verified: false,
          application_status: 'rejected',
          rejection_reason: rejectionReason
        })
        .eq('id', provider.id);

      if (error) throw error;

      // Send rejection notification to provider
      await createProviderRejectionNotification(provider.user_id, provider.business_name || 'your business', rejectionReason);

      toast.success('Provider rejected successfully!');
      setShowRejectDialog(false);
      setRejectionReason('');
      loadProviderData(); // Reload to get updated status
    } catch (error: any) {
      console.error('Error rejecting provider:', error);
      toast.error(`Failed to reject provider: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove pro badge
  const removeProBadge = async () => {
    if (!provider) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('provider_profiles')
        .update({
          verified_pro: false
        })
        .eq('id', provider.id);

      if (error) throw error;

      toast.success('Pro badge removed successfully!');
      loadProviderData(); // Reload to get updated status
    } catch (error: any) {
      console.error('Error removing pro badge:', error);
      toast.error(`Failed to remove pro badge: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleViewDocument = (documentUrl: string, documentName: string) => {
    console.log(`Attempting to view ${documentName}:`, documentUrl);
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    } else {
      console.error(`No ${documentName} available to view`);
      toast.error(`No ${documentName} available to view`);
    }
  };

  const handleDownloadDocument = async (documentUrl: string, documentName: string) => {
    if (!documentUrl) {
      toast.error(`No ${documentName} available to download`);
      return;
    }

    try {
      const response = await fetch(documentUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${documentName.replace(/\s+/g, '_').toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`${documentName} downloaded successfully`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Failed to download ${documentName}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-[hsl(210,100%,65%)] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="text-center py-8">
        <p className="text-[hsl(210,100%,75%)]">Provider not found</p>
        <Button 
          onClick={onBack} 
          className="mt-4 bg-[hsl(210,100%,65%)] text-white hover:bg-[hsl(210,100%,70%]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Providers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button 
        onClick={onBack} 
        variant="outline" 
        className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Providers
      </Button>
      
      {/* Provider Header */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-[hsl(0,0%,95%)]">{provider.business_name}</h2>
                <div className="flex gap-1">
                  {provider.admin_approved ? (
                    <Badge variant="default" className="bg-green-600">
                      Approved
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      Pending
                    </Badge>
                  )}
                  {provider.verified_pro && (
                    <Badge variant="default" className="bg-purple-600">
                      <Shield className="h-3 w-3 mr-1" />
                      Pro
                    </Badge>
                  )}
                  {provider.profiles?.is_banned && (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Banned
                    </Badge>
                  )}
                </div>
              </div>
              
              <p className="text-[hsl(210,100%,75%)] mb-4">{provider.business_type}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center text-sm text-[hsl(0,0%,95%)]">
                  <MapPin className="h-4 w-4 mr-2 text-[hsl(210,100%,65%)]" />
                  <span>{provider.business_address}</span>
                </div>
                
                <div className="flex items-center text-sm text-[hsl(0,0%,95%)]">
                  <Mail className="h-4 w-4 mr-2 text-[hsl(210,100%,65%)]" />
                  <span>{provider.profiles?.email}</span>
                </div>
                
                <div className="flex items-center text-sm text-[hsl(0,0%,95%)]">
                  <Phone className="h-4 w-4 mr-2 text-[hsl(210,100%,65%)]" />
                  <span>{provider.profiles?.phone || 'No phone provided'}</span>
                </div>
                
                <div className="flex items-center text-sm text-[hsl(0,0%,95%)]">
                  <Users className="h-4 w-4 mr-2 text-[hsl(210,100%,65%)]" />
                  <span>{provider.profiles?.full_name}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center p-4 bg-[hsl(220,15%,15%)] rounded-lg min-w-[200px]">
              <div className="text-3xl font-bold text-[hsl(0,0%,95%)]">{formatCurrency(provider.total_earnings || 0)}</div>
              <p className="text-[hsl(210,100%,75%)]">Total Earnings</p>
              
              <div className="w-full h-px bg-[hsl(220,20%,18%)] my-4"></div>
              
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="text-xl font-bold text-[hsl(0,0%,95%)]">{provider.rating?.toFixed(1) || 'N/A'}</span>
              </div>
              <p className="text-[hsl(210,100%,75%)]">Rating</p>
              
              <div className="w-full h-px bg-[hsl(220,20%,18%)] my-4"></div>
              
              <div className="text-2xl font-bold text-[hsl(0,0%,95%)]">{provider.total_jobs || 0}</div>
              <p className="text-[hsl(210,100%,75%)]">Total Jobs</p>
              
              {/* Approval/Rejection Buttons */}
              <div className="w-full h-px bg-[hsl(220,20%,18%)] my-4"></div>

              {!provider.admin_approved && (
                <div className="space-y-2 w-full">
                  <Button
                    onClick={approveProvider}
                    disabled={isProcessing}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {isProcessing ? "Processing..." : "Approve Provider"}
                  </Button>

                  <Button
                    onClick={() => setShowRejectDialog(true)}
                    disabled={isProcessing}
                    variant="destructive"
                    className="w-full"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Provider
                  </Button>
                </div>
              )}

              {provider.admin_approved && (
                <div className="space-y-2 w-full">
                  <Badge variant="default" className="bg-green-600 w-full justify-center py-2">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Provider Approved
                  </Badge>

                  {provider.verified_pro && (
                    <Button
                      onClick={removeProBadge}
                      disabled={isProcessing}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      {isProcessing ? "Removing..." : "Remove Pro Badge"}
                    </Button>
                  )}
                </div>
              )}

              {/* Ban/Unban Button */}
              <div className="w-full h-px bg-[hsl(220,20%,18%)] my-4"></div>

              <Button
                onClick={toggleBanStatus}
                variant={provider.profiles?.is_banned ? "default" : "destructive"}
                className={`w-full ${provider.profiles?.is_banned ? "bg-green-600 hover:bg-green-700" : ""}`}
              >
                {provider.profiles?.is_banned ? "Unban Provider" : "Ban Provider"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Performance Metrics */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Recent Performance</CardTitle>
          <CardDescription className="text-gray-600">
            Provider's performance metrics for the last 7 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-xl font-bold text-gray-900">{formatCurrency(performance.recentEarnings)}</div>
              <p className="text-sm text-gray-600">7-Day Earnings</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-xl font-bold text-gray-900">{performance.weeklyBookings}</div>
              <p className="text-sm text-gray-600">7-Day Bookings</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-xl font-bold text-gray-900">{performance.completionRate.toFixed(1)}%</div>
              <p className="text-sm text-gray-600">Completion Rate</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-xl font-bold text-gray-900">{formatCurrency(provider.total_commission || 0)}</div>
              <p className="text-sm text-gray-600">Total Commission</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Compliance and Verification */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Compliance and Verification</CardTitle>
          <CardDescription className="text-gray-600">
            Provider's verification status and documentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Account Status</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Admin Approved</span>
                  {provider.admin_approved ? (
                    <Badge variant="default" className="bg-green-600">Approved</Badge>
                  ) : (
                    <Badge variant="destructive">Pending</Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Verified Provider</span>
                  {provider.verified ? (
                    <Badge variant="default" className="bg-green-600">Verified</Badge>
                  ) : (
                    <Badge variant="destructive">Not Verified</Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pro Badge</span>
                  {provider.verified_pro ? (
                    <Badge variant="default" className="bg-purple-600">Pro</Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-600 border-gray-300">Not Pro</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Documentation Status</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">CNIC Front</span>
                  {provider.cnic_front_image ? (
                    <Badge variant="default" className="bg-green-600">Available</Badge>
                  ) : (
                    <Badge variant="destructive">Missing</Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">CNIC Back</span>
                  {provider.cnic_back_image ? (
                    <Badge variant="default" className="bg-green-600">Available</Badge>
                  ) : (
                    <Badge variant="destructive">Missing</Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">License/Certificate</span>
                  {provider.license_certificate ? (
                    <Badge variant="default" className="bg-green-600">Available</Badge>
                  ) : (
                    <Badge variant="destructive">Missing</Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Profile Photo</span>
                  {provider.profile_photo ? (
                    <Badge variant="default" className="bg-green-600">Available</Badge>
                  ) : (
                    <Badge variant="destructive">Missing</Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Proof of Address</span>
                  {provider.proof_of_address ? (
                    <Badge variant="default" className="bg-green-600">Available</Badge>
                  ) : (
                    <Badge variant="destructive">Missing</Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shop Photos</span>
                  {provider.shop_photos && provider.shop_photos.length > 0 ? (
                    <Badge variant="default" className="bg-green-600">
                      {provider.shop_photos.length} Available
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Missing</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Account Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Member Since</span>
                  <span className="text-gray-900">
                    {provider.submitted_at ? formatDate(provider.submitted_at) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account Status</span>
                  {provider.profiles?.is_banned ? (
                    <Badge variant="destructive">Banned</Badge>
                  ) : (
                    <Badge variant="default" className="bg-green-600">Active</Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Application Status</span>
                  <span className="text-gray-900">
                    {provider.application_status || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Documents */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Provider Documents
          </CardTitle>
          <CardDescription className="text-gray-600">
            All verification documents submitted by the provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Identity Documents */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Identity Documents
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[hsl(210,100%,75%)]">CNIC Front</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(provider.cnic_front_image || '', 'CNIC Front')}
                        disabled={!provider.cnic_front_image}
                        className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadDocument(provider.cnic_front_image || '', 'CNIC Front')}
                        disabled={!provider.cnic_front_image}
                        className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  {provider.cnic_front_image ? (
                    <div className="bg-[hsl(220,20%,12%)] p-2 rounded border border-[hsl(220,20%,18%)]">
                      <img
                        src={provider.cnic_front_image}
                        alt="CNIC Front"
                        className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleViewDocument(provider.cnic_front_image || '', 'CNIC Front')}
                        onError={(e) => {
                          console.error('CNIC Front image failed to load:', provider.cnic_front_image);
                          console.error('Image src:', e.currentTarget.src);
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) {
                            fallback.style.display = 'flex';
                          }
                        }}
                        onLoad={(e) => {
                          console.log('CNIC Front image loaded successfully:', provider.cnic_front_image);
                          console.log('Image dimensions:', e.currentTarget.naturalWidth, 'x', e.currentTarget.naturalHeight);
                        }}
                      />
                      <div
                        className="w-full h-32 bg-[hsl(220,15%,15%)] rounded flex items-center justify-center text-[hsl(210,100%,75%)] text-sm"
                        style={{ display: 'none' }}
                      >
                        <div className="text-center">
                          <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Preview unavailable</p>
                          <p className="text-xs opacity-75">Click to view full document</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[hsl(220,20%,12%)] p-2 rounded border border-[hsl(220,20%,18%)]">
                      <div className="w-full h-32 bg-[hsl(220,15%,15%)] rounded flex items-center justify-center text-[hsl(210,100%,75%)] text-sm">
                        <div className="text-center">
                          <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No CNIC Front image</p>
                          <p className="text-xs opacity-75">Document not uploaded</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[hsl(210,100%,75%)]">CNIC Back</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(provider.cnic_back_image || '', 'CNIC Back')}
                        disabled={!provider.cnic_back_image}
                        className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadDocument(provider.cnic_back_image || '', 'CNIC Back')}
                        disabled={!provider.cnic_back_image}
                        className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  {provider.cnic_back_image ? (
                    <div className="bg-[hsl(220,20%,12%)] p-2 rounded border border-[hsl(220,20%,18%)]">
                      <img
                        src={provider.cnic_back_image}
                        alt="CNIC Back"
                        className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleViewDocument(provider.cnic_back_image || '', 'CNIC Back')}
                        onError={(e) => {
                          console.error('CNIC Back image failed to load:', provider.cnic_back_image);
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) {
                            fallback.style.display = 'flex';
                          }
                        }}
                        onLoad={() => console.log('CNIC Back image loaded successfully:', provider.cnic_back_image)}
                      />
                      <div
                        className="w-full h-32 bg-[hsl(220,15%,15%)] rounded flex items-center justify-center text-[hsl(210,100%,75%)] text-sm"
                        style={{ display: 'none' }}
                      >
                        <div className="text-center">
                          <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Preview unavailable</p>
                          <p className="text-xs opacity-75">Click to view full document</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[hsl(220,20%,12%)] p-2 rounded border border-[hsl(220,20%,18%)]">
                      <div className="w-full h-32 bg-[hsl(220,15%,15%)] rounded flex items-center justify-center text-[hsl(210,100%,75%)] text-sm">
                        <div className="text-center">
                          <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No CNIC Back image</p>
                          <p className="text-xs opacity-75">Document not uploaded</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[hsl(210,100%,75%)]">Profile Photo</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(provider.profile_photo || '', 'Profile Photo')}
                        disabled={!provider.profile_photo}
                        className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadDocument(provider.profile_photo || '', 'Profile Photo')}
                        disabled={!provider.profile_photo}
                        className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  {provider.profile_photo ? (
                    <div className="bg-[hsl(220,20%,12%)] p-2 rounded border border-[hsl(220,20%,18%)]">
                      <img
                        src={provider.profile_photo}
                        alt="Profile Photo"
                        className="w-32 h-32 object-cover rounded-full cursor-pointer mx-auto hover:opacity-80 transition-opacity"
                        onClick={() => handleViewDocument(provider.profile_photo || '', 'Profile Photo')}
                        onError={(e) => {
                          console.error('Profile Photo image failed to load:', provider.profile_photo);
                          console.error('Image src:', e.currentTarget.src);
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) {
                            fallback.style.display = 'flex';
                          }
                        }}
                        onLoad={(e) => {
                          console.log('Profile Photo image loaded successfully:', provider.profile_photo);
                          console.log('Image dimensions:', e.currentTarget.naturalWidth, 'x', e.currentTarget.naturalHeight);
                        }}
                      />
                      <div
                        className="w-32 h-32 bg-[hsl(220,15%,15%)] rounded-full flex items-center justify-center text-[hsl(210,100%,75%)] text-sm mx-auto"
                        style={{ display: 'none' }}
                      >
                        <div className="text-center">
                          <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Preview unavailable</p>
                          <p className="text-xs opacity-75">Click to view full photo</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[hsl(220,20%,12%)] p-2 rounded border border-[hsl(220,20%,18%)]">
                      <div className="w-32 h-32 bg-[hsl(220,15%,15%)] rounded-full flex items-center justify-center text-[hsl(210,100%,75%)] text-sm mx-auto">
                        <div className="text-center">
                          <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No Profile Photo</p>
                          <p className="text-xs opacity-75">Photo not uploaded</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Business Documents */}
            <div className="bg-[hsl(220,15%,15%)] p-4 rounded-lg">
              <h4 className="font-semibold text-[hsl(0,0%,95%)] mb-3 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Business Documents
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[hsl(210,100%,75%)]">License/Certificate</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(provider.license_certificate || '', 'License Certificate')}
                        disabled={!provider.license_certificate}
                        className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadDocument(provider.license_certificate || '', 'License Certificate')}
                        disabled={!provider.license_certificate}
                        className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[hsl(210,100%,75%)]">Proof of Address</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(provider.proof_of_address || '', 'Proof of Address')}
                        disabled={!provider.proof_of_address}
                        className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadDocument(provider.proof_of_address || '', 'Proof of Address')}
                        disabled={!provider.proof_of_address}
                        className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Shop Photos */}
            <div className="bg-[hsl(220,15%,15%)] p-4 rounded-lg">
              <h4 className="font-semibold text-[hsl(0,0%,95%)] mb-3 flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Shop Photos
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {provider.shop_photos && provider.shop_photos.length > 0 ? (
                  provider.shop_photos.map((photo, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[hsl(210,100%,75%)]">Shop Photo {index + 1}</span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(photo, `Shop Photo ${index + 1}`)}
                            className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadDocument(photo, `Shop Photo ${index + 1}`)}
                            className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                      <div className="bg-[hsl(220,20%,12%)] p-2 rounded border border-[hsl(220,20%,18%)]">
                        <img
                          src={photo}
                          alt={`Shop Photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleViewDocument(photo, `Shop Photo ${index + 1}`)}
                          onError={(e) => {
                            console.error(`Shop Photo ${index + 1} failed to load:`, photo);
                            console.error('Image src:', e.currentTarget.src);
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) {
                              fallback.style.display = 'flex';
                            }
                          }}
                          onLoad={(e) => {
                            console.log(`Shop Photo ${index + 1} loaded successfully:`, photo);
                            console.log('Image dimensions:', e.currentTarget.naturalWidth, 'x', e.currentTarget.naturalHeight);
                          }}
                        />
                        <div
                          className="w-full h-32 bg-[hsl(220,15%,15%)] rounded flex items-center justify-center text-[hsl(210,100%,75%)] text-sm"
                          style={{ display: 'none' }}
                        >
                          <div className="text-center">
                            <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Preview unavailable</p>
                            <p className="text-xs opacity-75">Click to view full photo</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-4">
                    <p className="text-[hsl(210,100%,75%)]">No shop photos available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Photo */}
            <div className="bg-[hsl(220,15%,15%)] p-4 rounded-lg">
              <h4 className="font-semibold text-[hsl(0,0%,95%)] mb-3 flex items-center gap-2">
                <Image className="h-4 w-4" />
                Profile Photo
              </h4>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[hsl(210,100%,75%)]">Profile Photo</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDocument(provider.profile_photo || '', 'Profile Photo')}
                    disabled={!provider.profile_photo}
                    className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadDocument(provider.profile_photo || '', 'Profile Photo')}
                    disabled={!provider.profile_photo}
                    className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
              {provider.profile_photo && (
                <div className="mt-3 bg-[hsl(220,20%,12%)] p-2 rounded border border-[hsl(220,20%,18%)]">
                  <img
                    src={provider.profile_photo}
                    alt="Profile Photo"
                    className="w-32 h-32 object-cover rounded-full cursor-pointer mx-auto hover:opacity-80 transition-opacity"
                    onClick={() => handleViewDocument(provider.profile_photo || '', 'Profile Photo')}
                    onError={(e) => {
                      console.error('Profile Photo image failed to load:', provider.profile_photo);
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) {
                        fallback.style.display = 'flex';
                      }
                    }}
                  />
                  <div
                    className="w-32 h-32 bg-[hsl(220,15%,15%)] rounded-full flex items-center justify-center text-[hsl(210,100%,75%)] text-sm mx-auto"
                    style={{ display: 'none' }}
                  >
                    <div className="text-center">
                      <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Preview unavailable</p>
                      <p className="text-xs opacity-75">Click to view full photo</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Notes */}
            {(provider.admin_notes || provider.rejection_reason) && (
              <div className="bg-[hsl(220,15%,15%)] p-4 rounded-lg">
                <h4 className="font-semibold text-[hsl(0,0%,95%)] mb-3">Admin Notes</h4>
                <div className="space-y-2">
                  {provider.admin_notes && (
                    <div>
                      <span className="text-sm text-[hsl(210,100%,75%)]">Notes:</span>
                      <p className="text-sm text-[hsl(0,0%,95%)] mt-1">{provider.admin_notes}</p>
                    </div>
                  )}
                  {provider.rejection_reason && (
                    <div>
                      <span className="text-sm text-[hsl(210,100%,75%)]">Rejection Reason:</span>
                      <p className="text-sm text-red-400 mt-1">{provider.rejection_reason}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
        <CardHeader>
          <CardTitle className="text-[hsl(0,0%,95%)]">Services Offered</CardTitle>
          <CardDescription className="text-[hsl(210,100%,75%)]">
            Services this provider offers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-center py-4 text-[hsl(210,100%,75%)]">No services available</p>
          ) : (
            <div className="space-y-4">
              {services.map(service => (
                <div 
                  key={service.id} 
                  className="flex items-center justify-between p-4 border border-[hsl(220,20%,18%)] rounded-lg hover:bg-[hsl(220,20%,15%)] transition-colors"
                >
                  <div>
                    <h4 className="font-semibold text-[hsl(0,0%,95%)]">{service.title}</h4>
                    <p className="text-sm text-[hsl(210,100%,75%)]">{service.category}</p>
                    <p className="text-xs text-[hsl(210,100%,75%)] mt-1">{service.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-[hsl(0,0%,95%)] font-medium">{formatCurrency(service.base_price)}</div>
                    {service.is_active ? (
                      <Badge variant="default" className="bg-green-600">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[hsl(210,100%,75%)] border-[hsl(210,100%,75%)]">Inactive</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Recent Bookings */}
      <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
        <CardHeader>
          <CardTitle className="text-[hsl(0,0%,95%)]">Recent Bookings</CardTitle>
          <CardDescription className="text-[hsl(210,100%,75%)]">
            Most recent booking activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <p className="text-center py-4 text-[hsl(210,100%,75%)]">No recent bookings</p>
          ) : (
            <div className="space-y-4">
              {recentBookings.map(booking => (
                <div 
                  key={booking.id} 
                  className="flex items-center justify-between p-4 border border-[hsl(220,20%,18%)] rounded-lg hover:bg-[hsl(220,20%,15%)] transition-colors"
                >
                  <div>
                    <h4 className="font-semibold text-[hsl(0,0%,95%)]">{booking.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-[hsl(210,100%,75%)]">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-[hsl(210,100%,65%)]" />
                        <span>{formatDate(booking.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Banknote className="h-4 w-4 text-[hsl(210,100%,65%)]" />
                        <span>{formatCurrency(booking.final_price)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    {booking.status === 'completed' ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    ) : booking.status === 'cancelled' ? (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Cancelled
                      </Badge>
                    ) : booking.status === 'pending' ? (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                        {booking.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission Payment History */}
      <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
        <CardHeader>
          <CardTitle className="text-[hsl(0,0%,95%)] flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Commission Payment History
          </CardTitle>
          <CardDescription className="text-[hsl(210,100%,75%)]">
            Provider's commission payment submissions and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commissionPayments.length === 0 ? (
            <p className="text-center py-4 text-[hsl(210,100%,75%)]">No commission payments submitted</p>
          ) : (
            <div className="space-y-4">
              {commissionPayments.map(payment => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border border-[hsl(220,20%,18%)] rounded-lg hover:bg-[hsl(220,20%,15%)] transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h4 className="font-semibold text-[hsl(0,0%,95%)]">
                        {formatCurrency(payment.amount)}
                      </h4>
                      <Badge
                        variant={payment.status === 'pending' ? 'destructive' : 'default'}
                        className={
                          payment.status === 'pending'
                            ? 'bg-red-600 text-white'
                            : payment.status === 'approved'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-600 text-white'
                        }
                      >
                        {payment.status === 'pending' ? 'Pending Review' : payment.status === 'approved' ? 'Approved' : 'Rejected'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[hsl(210,100%,75%)]">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-[hsl(210,100%,65%)]" />
                        <span>Submitted: {formatDate(payment.submitted_at)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Banknote className="h-4 w-4 text-[hsl(210,100%,65%)]" />
                        <span>{payment.payment_method}</span>
                      </div>
                      {payment.approved_at && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Approved: {formatDate(payment.approved_at)}</span>
                        </div>
                      )}
                      {payment.rejection_reason && (
                        <div className="flex items-center gap-1">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-red-400">Rejected: {payment.rejection_reason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {payment.screenshot_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(payment.screenshot_url || '', 'Payment Screenshot')}
                        className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Proof
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Reject Provider Application
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason" className="text-[hsl(210,100%,75%)]">
                Reason for Rejection *
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please provide a detailed reason for rejecting this provider application..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-2 bg-[hsl(220,15%,15%)] border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] min-h-[100px]"
              />
            </div>

            <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3">
              <p className="text-sm text-yellow-300">
                <strong>Note:</strong> The provider will be notified of the rejection and can reapply with corrections.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={isProcessing}
              className="border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)] hover:bg-[hsl(220,20%,15%)]"
            >
              Cancel
            </Button>
            <Button
              onClick={rejectProvider}
              disabled={isProcessing || !rejectionReason.trim()}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? "Processing..." : "Reject Provider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProviderDetailView;