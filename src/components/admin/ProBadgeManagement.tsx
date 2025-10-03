import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield,
  CheckCircle,
  XCircle,
  Users,
  Star,
  Receipt,
  Search,
  Filter,
  Clock,
  Check,
  X,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Image,
  Camera,
  MapPin,
  IdCard
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

type ProBadgeRequest = Tables<'pro_badge_requests'> & {
  provider_profiles?: {
    business_name: string;
    business_type: string;
    business_address: string;
    rating?: number;
    total_jobs?: number;
    total_earnings?: number;
    verified_pro?: boolean;
    admin_approved: boolean;
    // Document fields
    cnic_front_image?: string;
    cnic_back_image?: string;
    license_certificate?: string;
    profile_photo?: string;
    proof_of_address?: string;
    shop_photos?: string[];
    business_certificate?: string;
  };
  profiles?: {
    full_name: string;
    email: string;
    phone?: string;
  };
}

const ProBadgeManagement = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ProBadgeRequest[]>([]);
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const requestsPerPage = 10;

  useEffect(() => {
    loadRequests();
  }, [statusFilter, searchTerm, currentPage]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [statusFilter, searchTerm]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      // First, get the total count for pagination
      const { count } = await supabase
        .from('pro_badge_requests')
        .select('*', { count: 'exact', head: true });

      setTotalRequests(count || 0);

      let query = supabase
        .from('pro_badge_requests')
        .select(`
          *,
          provider_profiles!inner (
            business_name,
            business_type,
            business_address,
            rating,
            total_jobs,
            total_earnings,
            verified_pro,
            admin_approved,
            cnic_front_image,
            cnic_back_image,
            license_certificate,
            profile_photo,
            proof_of_address,
            shop_photos,
            business_certificate,
            user_id
          )
        `)
        .order('requested_at', { ascending: false });

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply search filter - simplified to avoid join issues
      if (searchTerm) {
        // First get all requests, then filter client-side
        const { data: allData, error: allError } = await supabase
          .from('pro_badge_requests')
          .select(`
            *,
            provider_profiles!inner (
              business_name,
              business_type,
              business_address,
              rating,
              total_jobs,
              total_earnings,
              verified_pro,
              admin_approved,
              cnic_front_image,
              cnic_back_image,
              license_certificate,
              profile_photo,
              proof_of_address,
              shop_photos,
              business_certificate,
              user_id
            )
          `)
          .order('requested_at', { ascending: false });

        if (allError) {
          console.error('Error fetching all requests for search:', allError);
          if (!allError.message.includes('RLS') && !allError.message.includes('permission')) {
            throw allError;
          }
          return;
        }

        // Filter client-side based on search term
        const filteredData = (allData || []).filter(request =>
          request.provider_profiles?.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Apply pagination to filtered results
        const from = (currentPage - 1) * requestsPerPage;
        const to = from + requestsPerPage - 1;
        const paginatedData = filteredData.slice(from, to);

        // Update total count
        setTotalRequests(filteredData.length);

        // Get user profiles for the filtered requests
        const providerIds = paginatedData.map(r => r.provider_id);
        let profilesData = [];

        if (providerIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, full_name, email, phone')
            .in('user_id', providerIds);

          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
          } else {
            profilesData = profiles || [];
          }
        }

        // Combine the data
        const requestsWithProfiles = paginatedData.map(request => ({
          ...request,
          profiles: profilesData.find(p => p.user_id === request.provider_id) || null
        }));

        setRequests(requestsWithProfiles);
        setLoading(false);
        return;
      }

      // Apply pagination
      const from = (currentPage - 1) * requestsPerPage;
      const to = from + requestsPerPage - 1;
      query = query.range(from, to);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching Pro badge requests:', error);
        // Don't throw for RLS or permission errors, just log them
        if (!error.message.includes('RLS') && !error.message.includes('permission')) {
          throw error;
        }
        return;
      }

      // Get user profiles for the requests
      const providerIds = data?.map(r => r.provider_id) || [];
      let profilesData = [];

      if (providerIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, phone')
          .in('user_id', providerIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        } else {
          profilesData = profiles || [];
        }
      }

      // Combine the data
      const requestsWithProfiles = (data || []).map(request => ({
        ...request,
        profiles: profilesData.find(p => p.user_id === request.provider_id) || null
      }));

      setRequests(requestsWithProfiles);
    } catch (error) {
      console.error('Error fetching Pro badge requests:', error);
      toast.error('Failed to load Pro badge requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject', adminNotes?: string) => {
    setIsProcessing(prev => ({ ...prev, [requestId]: true }));

    try {
      console.log(`Processing ${action} action for request ${requestId}`);
      const updateData = {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes || ''
      };

      const { data, error } = await supabase
        .from('pro_badge_requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();

      if (error) {
        console.error('Error updating request:', error);
        throw error;
      }

      console.log('Request updated successfully:', data);

      // If approved, also update the provider profile
      if (action === 'approve') {
        const request = requests.find(r => r.id === requestId);
        if (request) {
          console.log('Updating provider profile for approval:', request.provider_id);
          const { data: profileData, error: profileError } = await supabase
            .from('provider_profiles')
            .update({ verified_pro: true })
            .eq('user_id', request.provider_id)
            .select()
            .single();

          if (profileError) {
            console.error('Error updating provider profile:', profileError);
            // Don't throw for RLS or permission errors, just log them
            if (!profileError.message.includes('RLS') && !profileError.message.includes('permission')) {
              throw profileError;
            }
          }

          console.log('Provider profile updated successfully:', profileData);
        }
      }

      toast.success(action === 'approve' ? "Pro badge request approved!" : "Pro badge request rejected!");
      loadRequests(); // Reload data
    } catch (error: any) {
      console.error('Error processing request:', error);
      toast.error("Failed to process request: " + error.message);
    } finally {
      setIsProcessing(prev => ({ ...prev, [requestId]: false }));
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pro Badge Management</h2>
          <p className="text-muted-foreground">
            Manage Pro badge requests from providers
          </p>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by business name, provider name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{requests.filter(r => r.status === 'pending').length}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{requests.filter(r => r.status === 'approved').length}</div>
            <div className="text-sm text-muted-foreground">Approved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{requests.filter(r => r.status === 'rejected').length}</div>
            <div className="text-sm text-muted-foreground">Rejected</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{requests.length}</div>
            <div className="text-sm text-muted-foreground">Total Requests</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">No Pro badge requests found</h3>
            <p className="text-muted-foreground">
              There are no Pro badge requests yet. Providers can apply for Pro badge from their dashboard.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{request.provider_profiles?.business_name || 'Unknown Business'}</CardTitle>
                    <p className="text-sm text-muted-foreground">{request.provider_profiles?.business_type}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{request.profiles?.full_name}</span>
                      <span>{request.profiles?.email}</span>
                      {request.profiles?.phone && <span>{request.profiles?.phone}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(request.requested_at)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {request.request_message && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium mb-1">Request Message:</p>
                          <p className="text-sm text-muted-foreground">{request.request_message}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Provider Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <div>
                        <p className="text-sm font-medium">
                          {request.provider_profiles?.rating ? request.provider_profiles.rating.toFixed(1) : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">Rating</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">{request.provider_profiles?.total_jobs || 0}</p>
                        <p className="text-xs text-muted-foreground">Total Jobs</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                       <Receipt className="h-4 w-4 text-green-500" />
                       <div>
                         <p className="text-sm font-medium">
                           {formatCurrency(request.provider_profiles?.total_earnings || 0)}
                         </p>
                         <p className="text-xs text-muted-foreground">Total Earnings</p>
                       </div>
                     </div>
                  </div>

                  {/* Documents Section */}
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Verification Documents
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* CNIC Front */}
                      <div className="flex items-center gap-2 p-2 bg-background rounded border">
                        <IdCard className="h-4 w-4 text-blue-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">CNIC Front</p>
                          <p className="text-xs text-muted-foreground">
                            {request.provider_profiles?.cnic_front_image ? 'Uploaded' : 'Missing'}
                          </p>
                        </div>
                        {request.provider_profiles?.cnic_front_image && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(request.provider_profiles?.cnic_front_image, '_blank')}
                          >
                            <Image className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      {/* CNIC Back */}
                      <div className="flex items-center gap-2 p-2 bg-background rounded border">
                        <IdCard className="h-4 w-4 text-green-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">CNIC Back</p>
                          <p className="text-xs text-muted-foreground">
                            {request.provider_profiles?.cnic_back_image ? 'Uploaded' : 'Missing'}
                          </p>
                        </div>
                        {request.provider_profiles?.cnic_back_image && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(request.provider_profiles?.cnic_back_image, '_blank')}
                          >
                            <Image className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      {/* License Certificate */}
                      <div className="flex items-center gap-2 p-2 bg-background rounded border">
                        <FileText className="h-4 w-4 text-purple-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">License</p>
                          <p className="text-xs text-muted-foreground">
                            {request.provider_profiles?.license_certificate ? 'Uploaded' : 'Missing'}
                          </p>
                        </div>
                        {request.provider_profiles?.license_certificate && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(request.provider_profiles?.license_certificate, '_blank')}
                          >
                            <FileText className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      {/* Profile Photo */}
                      <div className="flex items-center gap-2 p-2 bg-background rounded border">
                        <Camera className="h-4 w-4 text-orange-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">Profile Photo</p>
                          <p className="text-xs text-muted-foreground">
                            {request.provider_profiles?.profile_photo ? 'Uploaded' : 'Missing'}
                          </p>
                        </div>
                        {request.provider_profiles?.profile_photo && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(request.provider_profiles?.profile_photo, '_blank')}
                          >
                            <Image className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      {/* Proof of Address */}
                      <div className="flex items-center gap-2 p-2 bg-background rounded border">
                        <MapPin className="h-4 w-4 text-red-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">Proof of Address</p>
                          <p className="text-xs text-muted-foreground">
                            {request.provider_profiles?.proof_of_address ? 'Uploaded' : 'Missing'}
                          </p>
                        </div>
                        {request.provider_profiles?.proof_of_address && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(request.provider_profiles?.proof_of_address, '_blank')}
                          >
                            <FileText className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      {/* Shop Photos */}
                      <div className="flex items-center gap-2 p-2 bg-background rounded border">
                        <Image className="h-4 w-4 text-cyan-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">Shop Photos</p>
                          <p className="text-xs text-muted-foreground">
                            {request.provider_profiles?.shop_photos?.length || 0} uploaded
                          </p>
                        </div>
                        {request.provider_profiles?.shop_photos && request.provider_profiles.shop_photos.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              request.provider_profiles?.shop_photos?.forEach(url => window.open(url, '_blank'));
                            }}
                          >
                            <Image className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      {/* Business Certificate */}
                      <div className="flex items-center gap-2 p-2 bg-background rounded border sm:col-span-2 lg:col-span-3">
                        <FileText className="h-4 w-4 text-indigo-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">Business Certificate</p>
                          <p className="text-xs text-muted-foreground">
                            {request.provider_profiles?.business_certificate ? 'Uploaded' : 'Missing'}
                          </p>
                        </div>
                        {request.provider_profiles?.business_certificate && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(request.provider_profiles?.business_certificate, '_blank')}
                          >
                            <FileText className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {request.status === 'pending' && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleRequestAction(request.id, 'approve')}
                          disabled={isProcessing[request.id]}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isProcessing[request.id] ? (
                            <>
                              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleRequestAction(request.id, 'reject')}
                          disabled={isProcessing[request.id]}
                          variant="destructive"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Admin Notes */}
                  {request.admin_notes && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm">
                        <strong>Admin Notes:</strong> {request.admin_notes}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalRequests > requestsPerPage && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Showing {((currentPage - 1) * requestsPerPage) + 1} to {Math.min(currentPage * requestsPerPage, totalRequests)} of {totalRequests} requests
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, Math.ceil(totalRequests / requestsPerPage)) }, (_, i) => {
                const page = Math.max(1, Math.min(
                  Math.ceil(totalRequests / requestsPerPage) - 4,
                  currentPage - 2
                )) + i;

                if (page > Math.ceil(totalRequests / requestsPerPage)) return null;

                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalRequests / requestsPerPage), prev + 1))}
              disabled={currentPage === Math.ceil(totalRequests / requestsPerPage)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.ceil(totalRequests / requestsPerPage))}
              disabled={currentPage === Math.ceil(totalRequests / requestsPerPage)}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProBadgeManagement;