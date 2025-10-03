import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createServiceApprovalNotification, createServiceRejectionNotification } from "@/utils/notificationUtils";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  Calendar,
  MapPin,
  DollarSign,
  User,
  Briefcase,
  MessageSquare
} from "lucide-react";

interface PendingService {
  id: string;
  title: string;
  description: string;
  category: string;
  base_price: number;
  duration_hours?: number;
  price_negotiable: boolean;
  provider_id: string;
  admin_approved: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  provider_profiles?: {
    business_name?: string;
    phone?: string;
  } | null;
  profiles?: {
    full_name?: string;
    email?: string;
    phone?: string;
  } | null;
}

interface RejectedService {
  id: string;
  title: string;
  description: string;
  category: string;
  base_price: number;
  duration_hours?: number;
  price_negotiable: boolean;
  provider_id: string;
  admin_approved: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  provider_profiles?: {
    business_name?: string;
    phone?: string;
  } | null;
  profiles?: {
    full_name?: string;
    email?: string;
    phone?: string;
  } | null;
}

const ServiceApprovalManagement = () => {
  const [pendingServices, setPendingServices] = useState<PendingService[]>([]);
  const [rejectedServices, setRejectedServices] = useState<RejectedService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<PendingService | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);

      // Load pending services
      const { data: pendingData, error: pendingError } = await supabase
        .from('services')
        .select(`
          id,
          title,
          description,
          category,
          base_price,
          duration_hours,
          price_negotiable,
          provider_id,
          admin_approved,
          is_active,
          created_at,
          updated_at
        `)
        .eq('admin_approved', false)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      // Get unique provider IDs from pending services
      const providerIds = [...new Set((pendingData || []).map(service => service.provider_id))];

      // Load provider profiles and user profiles
      let providerProfiles: any[] = [];
      let userProfiles: any[] = [];

      if (providerIds.length > 0) {
        // Load provider profiles
        const { data: providerProfilesData, error: providerError } = await supabase
          .from('provider_profiles')
          .select('user_id, business_name, phone')
          .in('user_id', providerIds);

        if (providerError) throw providerError;
        providerProfiles = providerProfilesData || [];

        // Load user profiles
        const { data: userProfilesData, error: userError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, phone')
          .in('user_id', providerIds);

        if (userError) throw userError;
        userProfiles = userProfilesData || [];
      }

      // Create lookup maps
      const providerProfilesMap = providerProfiles.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      const userProfilesMap = userProfiles.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Combine services with provider and user data
      const servicesWithProfiles = (pendingData || []).map(service => ({
        ...service,
        provider_profiles: providerProfilesMap[service.provider_id] || null,
        profiles: userProfilesMap[service.provider_id] || null
      }));

      setPendingServices((servicesWithProfiles as unknown as PendingService[]) || []);

      // Load rejected services
      const { data: rejectedData, error: rejectedError } = await supabase
        .from('services')
        .select(`
          id,
          title,
          description,
          category,
          base_price,
          duration_hours,
          price_negotiable,
          provider_id,
          admin_approved,
          is_active,
          created_at,
          updated_at
        `)
        .eq('admin_approved', false)
        .eq('is_active', false)
        .order('updated_at', { ascending: false });

      if (rejectedError) throw rejectedError;

      // Get unique provider IDs from rejected services
      const rejectedProviderIds = [...new Set((rejectedData || []).map((service: any) => service.provider_id))];

      // Load provider profiles and user profiles for rejected services
      let rejectedProviderProfiles: any[] = [];
      let rejectedUserProfiles: any[] = [];

      if (rejectedProviderIds.length > 0) {
        // Load provider profiles
        const { data: rejectedProviderProfilesData, error: rejectedProviderError } = await supabase
          .from('provider_profiles')
          .select('user_id, business_name, phone')
          .in('user_id', rejectedProviderIds);

        if (rejectedProviderError) throw rejectedProviderError;
        rejectedProviderProfiles = rejectedProviderProfilesData || [];

        // Load user profiles
        const { data: rejectedUserProfilesData, error: rejectedUserError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, phone')
          .in('user_id', rejectedProviderIds);

        if (rejectedUserError) throw rejectedUserError;
        rejectedUserProfiles = rejectedUserProfilesData || [];
      }

      // Create lookup maps for rejected services
      const rejectedProviderProfilesMap = rejectedProviderProfiles.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      const rejectedUserProfilesMap = rejectedUserProfiles.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Combine rejected services with provider and user data
      const rejectedServicesWithProfiles = (rejectedData || []).map((service: any) => ({
        ...service,
        provider_profiles: rejectedProviderProfilesMap[service.provider_id] || null,
        profiles: rejectedUserProfilesMap[service.provider_id] || null
      }));

      setRejectedServices(rejectedServicesWithProfiles as RejectedService[]);

    } catch (error: any) {
      console.error('Error loading services:', error);
      toast.error('Failed to load services: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveService = async (serviceId: string) => {
    try {
      setActionLoading(true);

      // Get service details for notification
      const service = pendingServices.find(s => s.id === serviceId);
      if (!service) throw new Error('Service not found');

      const { error } = await supabase
        .from('services')
        .update({
          admin_approved: true,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId);

      if (error) throw error;

      // Send notification to provider
      await createServiceApprovalNotification(service.provider_id, service.title);

      toast.success('Service approved successfully!');
      loadServices(); // Reload the services list
    } catch (error: any) {
      console.error('Error approving service:', error);
      toast.error('Failed to approve service: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectService = async () => {
    if (!selectedService) return;

    try {
      setActionLoading(true);

      // Update the service status to rejected instead of deleting it
      const { error } = await supabase
        .from('services')
        .update({
          admin_approved: false,
          is_active: false,
          rejection_reason: rejectionReason || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedService.id);

      if (error) throw error;

      // Send notification to provider
      await createServiceRejectionNotification(selectedService.provider_id, selectedService.title, rejectionReason);

      toast.success('Service rejected successfully!');
      setShowRejectDialog(false);
      setSelectedService(null);
      setRejectionReason('');
      loadServices(); // Reload the services list
    } catch (error: any) {
      console.error('Error rejecting service:', error);
      toast.error('Failed to reject service: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-[hsl(210,100%,65%)] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="data-[state=active]:bg-[hsl(210,100%,65%)] data-[state=active]:text-white">
            <Clock className="h-4 w-4 mr-2" />
            Pending Approval ({pendingServices.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="data-[state=active]:bg-[hsl(210,100%,65%)] data-[state=active]:text-white">
            <XCircle className="h-4 w-4 mr-2" />
            Rejected History ({rejectedServices.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Services Tab */}
        <TabsContent value="pending" className="space-y-4">
          {pendingServices.length === 0 ? (
            <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[hsl(0,0%,95%)] mb-2">No Pending Services</h3>
                <p className="text-[hsl(210,100%,75%)]">All services have been reviewed!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingServices.map((service) => (
                <Card key={service.id} className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-600 text-white">
                              {service.profiles?.full_name?.charAt(0) || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-lg font-semibold text-[hsl(0,0%,95%)]">{service.title}</h3>
                            <p className="text-sm text-[hsl(210,100%,75%)]">
                              by {service.provider_profiles?.business_name || 'Unknown Provider'}
                            </p>
                          </div>
                        </div>

                        <p className="text-[hsl(210,100%,75%)] mb-4">{service.description}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-[hsl(210,100%,75%)]">{service.category}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-400" />
                            <span className="text-sm text-[hsl(0,0%,95%)]">{formatPrice(service.base_price)}</span>
                          </div>
                          {service.duration_hours && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-blue-400" />
                              <span className="text-sm text-[hsl(210,100%,75%)]">{service.duration_hours}h</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${service.price_negotiable ? 'text-green-400' : 'text-red-400'}`}>
                              {service.price_negotiable ? 'Negotiable' : 'Fixed Price'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>Submitted: {formatDate(service.created_at)}</span>
                          <span>Provider: {service.profiles?.full_name}</span>
                          {service.profiles?.email && (
                            <span>Email: {service.profiles.email}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedService(service)}
                          className="border-[hsl(220,20%,18%)] text-[hsl(210,100%,75%)] hover:bg-[hsl(220,20%,15%)]"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        <Button
                          onClick={() => handleApproveService(service.id)}
                          disabled={actionLoading}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            setSelectedService(service);
                            setShowRejectDialog(true);
                          }}
                          disabled={actionLoading}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Rejected Services Tab */}
        <TabsContent value="rejected" className="space-y-4">
          {rejectedServices.length === 0 ? (
            <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
              <CardContent className="p-12 text-center">
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[hsl(0,0%,95%)] mb-2">No Rejected Services</h3>
                <p className="text-[hsl(210,100%,75%)]">No services have been rejected yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {rejectedServices.map((service) => (
                <Card key={service.id} className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)] opacity-75">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-red-600 text-white">
                              {service.profiles?.full_name?.charAt(0) || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-lg font-semibold text-[hsl(0,0%,95%)] line-through">{service.title}</h3>
                            <p className="text-sm text-red-400">
                              by {service.provider_profiles?.business_name || 'Unknown Provider'}
                            </p>
                          </div>
                          <Badge variant="destructive" className="ml-auto">Rejected</Badge>
                        </div>

                        <p className="text-[hsl(210,100%,75%)] mb-4">{service.description}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-[hsl(210,100%,75%)]">{service.category}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-red-400" />
                            <span className="text-sm text-[hsl(0,0%,95%)]">{formatPrice(service.base_price)}</span>
                          </div>
                          {service.duration_hours && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-[hsl(210,100%,75%)]">{service.duration_hours}h</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${service.price_negotiable ? 'text-green-400' : 'text-red-400'}`}>
                              {service.price_negotiable ? 'Negotiable' : 'Fixed Price'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>Submitted: {formatDate(service.created_at)}</span>
                          <span>Rejected: {formatDate(service.updated_at)}</span>
                          <span>Provider: {service.profiles?.full_name}</span>
                        </div>

                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-red-800">Service Rejected:</p>
                              <p className="text-sm text-red-700 mt-1">This service was rejected by the admin and is no longer active.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Service Details Dialog */}
      <Dialog open={!!selectedService && !showRejectDialog} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
          <DialogHeader>
            <DialogTitle className="text-[hsl(0,0%,95%)]">Service Details</DialogTitle>
          </DialogHeader>

          {selectedService && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[hsl(210,100%,75%)]">Service Title</Label>
                  <p className="text-[hsl(0,0%,95%)] font-medium">{selectedService.title}</p>
                </div>
                <div>
                  <Label className="text-[hsl(210,100%,75%)]">Category</Label>
                  <p className="text-[hsl(0,0%,95%)]">{selectedService.category}</p>
                </div>
                <div>
                  <Label className="text-[hsl(210,100%,75%)]">Base Price</Label>
                  <p className="text-[hsl(0,0%,95%)] font-medium">{formatPrice(selectedService.base_price)}</p>
                </div>
                <div>
                  <Label className="text-[hsl(210,100%,75%)]">Duration</Label>
                  <p className="text-[hsl(0,0%,95%)]">{selectedService.duration_hours || 'N/A'} hours</p>
                </div>
              </div>

              <div>
                <Label className="text-[hsl(210,100%,75%)]">Description</Label>
                <p className="text-[hsl(0,0%,95%)] mt-1">{selectedService.description}</p>
              </div>

              <div className="border-t border-[hsl(220,20%,18%)] pt-4">
                <Label className="text-[hsl(210,100%,75%)]">Provider Information</Label>
                <div className="mt-2 space-y-1">
                  <p className="text-[hsl(0,0%,95%)]"><strong>Business:</strong> {selectedService.provider_profiles?.business_name}</p>
                  <p className="text-[hsl(0,0%,95%)]"><strong>Provider:</strong> {selectedService.profiles?.full_name}</p>
                  <p className="text-[hsl(0,0%,95%)]"><strong>Email:</strong> {selectedService.profiles?.email}</p>
                  {selectedService.provider_profiles?.phone && (
                    <p className="text-[hsl(0,0%,95%)]"><strong>Phone:</strong> {selectedService.provider_profiles.phone}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>Submitted: {formatDate(selectedService.created_at)}</span>
                <span>Price Type: {selectedService.price_negotiable ? 'Negotiable' : 'Fixed'}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedService(null)}
              className="border-[hsl(220,20%,18%)] text-[hsl(210,100%,75%)] hover:bg-[hsl(220,20%,15%)]"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Service Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
          <DialogHeader>
            <DialogTitle className="text-[hsl(0,0%,95%)] flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Reject Service
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason" className="text-[hsl(210,100%,75%)]">
                Reason for Rejection (Optional)
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="You can provide a reason for rejecting this service..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1 bg-[hsl(220,15%,15%)] border-[hsl(220,20%,18%)] text-[hsl(0,0%,95%)]"
                rows={4}
              />
            </div>

            <div className="flex items-start bg-red-50 text-red-800 rounded-lg p-3 text-sm">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <p>
                Rejecting this service will deactivate it and set it as not approved.
                The provider will need to create a new service if they wish to try again.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setSelectedService(null);
                setRejectionReason('');
              }}
              className="border-[hsl(220,20%,18%)] text-[hsl(210,100%,75%)] hover:bg-[hsl(220,20%,15%)]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectService}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Service
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceApprovalManagement;