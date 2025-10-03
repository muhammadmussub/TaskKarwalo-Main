import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  FileText,
  IdCard,
  User,
  MapPin,
  Eye,
  Download,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createAccountApprovalNotification, createProviderRejectionNotification } from "@/utils/notificationUtils";

interface Provider {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  business_address: string;
  phone?: string;
  cnic?: string;
  description?: string;
  shop_photos?: string[];
  business_certificate?: string;
  application_status?: string;
  submitted_at?: string;
  verified: boolean;
  admin_approved: boolean;
  verified_pro?: boolean;
  rating?: number;
  total_jobs?: number;
  total_earnings?: number;
  rejection_reason?: string;
  updated_at?: string;
  // Verification documents
  cnic_front_image?: string;
  cnic_back_image?: string;
  license_certificate?: string;
  profile_photo?: string;
  proof_of_address?: string;
  profiles?: {
    full_name: string;
    email: string;
    phone?: string;
  };
}

interface NormalVerificationManagementProps {
  pendingProviders: Provider[];
  rejectedProviders: Provider[];
  onReviewComplete: () => void;
}

const NormalVerificationManagement = ({ pendingProviders, rejectedProviders, onReviewComplete }: NormalVerificationManagementProps) => {
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});

  // Debug: Log provider data to see what's being loaded
  console.log('NormalVerificationManagement - Provider data:', {
    pendingProviders: pendingProviders.map(p => ({
      id: p.id,
      business_name: p.business_name,
      shop_photos: p.shop_photos,
      cnic_front_image: p.cnic_front_image,
      cnic_back_image: p.cnic_back_image,
      license_certificate: p.license_certificate,
      profile_photo: p.profile_photo,
      proof_of_address: p.proof_of_address,
      business_certificate: p.business_certificate
    })),
    rejectedProviders: rejectedProviders.map(p => ({
      id: p.id,
      business_name: p.business_name,
      shop_photos: p.shop_photos
    }))
  });

  // Pagination states
  const [currentPendingPage, setCurrentPendingPage] = useState(1);
  const [currentRejectedPage, setCurrentRejectedPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate pagination
  const totalPendingPages = Math.ceil(pendingProviders.length / itemsPerPage);
  const totalRejectedPages = Math.ceil(rejectedProviders.length / itemsPerPage);

  const startPendingIndex = (currentPendingPage - 1) * itemsPerPage;
  const endPendingIndex = startPendingIndex + itemsPerPage;
  const paginatedPendingProviders = pendingProviders.slice(startPendingIndex, endPendingIndex);

  const startRejectedIndex = (currentRejectedPage - 1) * itemsPerPage;
  const endRejectedIndex = startRejectedIndex + itemsPerPage;
  const paginatedRejectedProviders = rejectedProviders.slice(startRejectedIndex, endRejectedIndex);

  // Pagination component
  const PaginationControls = ({
    currentPage,
    totalPages,
    onPageChange
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-muted-foreground">
          Showing {currentPage * itemsPerPage - itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, pendingProviders.length || rejectedProviders.length)} of {pendingProviders.length || rejectedProviders.length} entries
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              );
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="px-2">...</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(totalPages)}
                  className="w-8 h-8 p-0"
                >
                  {totalPages}
                </Button>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const handleApprove = async (providerId: string) => {
    setIsProcessing(prev => ({ ...prev, [providerId]: true }));

    try {
      // Get provider details for notification
      const provider = [...pendingProviders, ...rejectedProviders].find(p => p.id === providerId);
      if (!provider) throw new Error('Provider not found');

      const { error } = await supabase
        .from('provider_profiles')
        .update({
          admin_approved: true,
          verified: true
        })
        .eq('id', providerId);

      if (error) throw error;

      // Send notification to provider
      await createAccountApprovalNotification(provider.user_id, 'provider');

      toast.success("Provider approved successfully");
      onReviewComplete();
    } catch (error: any) {
      toast.error("Failed to approve provider: " + error.message);
    } finally {
      setIsProcessing(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const handleReject = async (providerId: string) => {
    if (!rejectionReason[providerId]?.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setIsProcessing(prev => ({ ...prev, [providerId]: true }));

    try {
      // Get provider details for notification
      const provider = [...pendingProviders, ...rejectedProviders].find(p => p.id === providerId);
      if (!provider) throw new Error('Provider not found');

      const { error } = await supabase
        .from('provider_profiles')
        .update({
          admin_approved: false,
          verified: false,
          rejection_reason: rejectionReason[providerId]
        })
        .eq('id', providerId);

      if (error) throw error;

      // Send notification to provider
      await createProviderRejectionNotification(provider.user_id, provider.business_name, rejectionReason[providerId]);

      toast.success("Provider rejected and notified");
      onReviewComplete();
    } catch (error: any) {
      toast.error("Failed to reject provider: " + error.message);
    } finally {
      setIsProcessing(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const openDocument = async (bucket: string, path: string) => {
    try {
      // For private buckets (verification-docs, provider-documents), we need to get a signed URL
      if (bucket === 'verification-docs' || bucket === 'provider-documents') {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600); // 1 hour expiry

        if (error) {
          console.error('Error creating signed URL:', error);
          toast.error('Error accessing document. Please try again.');
          return;
        }

        window.open(data.signedUrl, '_blank');
      } else {
        // For public buckets (shop-photos), use public URL
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        window.open(data.publicUrl, '_blank');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      toast.error('Error accessing document. Please try again.');
    }
  };

  const downloadDocument = async (bucket: string, path: string, filename: string) => {
    try {
      // For private buckets, we need to get a signed URL
      if (bucket === 'verification-docs' || bucket === 'provider-documents') {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600); // 1 hour expiry

        if (error) {
          console.error('Error creating signed URL:', error);
          toast.error('Error downloading document. Please try again.');
          return;
        }

        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = filename;
        link.click();
      } else {
        // For public buckets, use public URL
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        const link = document.createElement('a');
        link.href = data.publicUrl;
        link.download = filename;
        link.click();
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Error downloading document. Please try again.');
    }
  };

  const renderDocumentPreview = (bucket: string, path: string, title: string, icon: React.ReactNode) => {
    if (!path) {
      console.log(`Document not rendered - missing path for ${title}`);
      return null;
    }

    console.log(`Rendering document: ${title} - Path: ${path} - Bucket: ${bucket}`);

    // Get the appropriate URL based on bucket type
    const getDocumentUrl = () => {
      if (bucket === 'verification-docs' || bucket === 'provider-documents') {
        // For private buckets, we'll use the openDocument function
        return null;
      } else {
        // For public buckets, get public URL
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
      }
    };

    const documentUrl = getDocumentUrl();

    return (
      <div className="flex items-center gap-2 p-2 border rounded-lg">
        {icon}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{path.split('/').pop()}</p>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openDocument(bucket, path)}
            title="View document"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadDocument(bucket, path, path.split('/').pop() || 'document')}
            title="Download document"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="data-[state=active]:bg-[hsl(210,100%,65%)] data-[state=active]:text-white">
            <Clock className="h-4 w-4 mr-2" />
            Pending Approval ({pendingProviders.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="data-[state=active]:bg-[hsl(210,100%,65%)] data-[state=active]:text-white">
            <XCircle className="h-4 w-4 mr-2" />
            Rejected History ({rejectedProviders.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Providers Tab */}
        <TabsContent value="pending" className="space-y-4">
          {pendingProviders.length === 0 ? (
            <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[hsl(0,0%,95%)] mb-2">No Pending Providers</h3>
                <p className="text-[hsl(210,100%,75%)]">All providers have been reviewed!</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedPendingProviders.map((provider) => (
                <Card key={provider.id}>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Provider Info */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{provider.business_name}</h3>
                        {provider.application_status === 'resubmitted' && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Resubmitted
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{provider.business_type}</p>
                      <p className="text-sm">{provider.profiles?.full_name} - {provider.profiles?.email}</p>
                      {provider.phone && <p className="text-sm">Phone: {provider.phone}</p>
}
                      {provider.cnic && <p className="text-sm">CNIC: {provider.cnic}</p>
}
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <MapPin className="h-4 w-4" />
                        <span>{provider.business_address}</span>
                      </div>
                      {provider.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <strong>Description:</strong> {provider.description}
                        </p>
                      )}
                      {provider.submitted_at && (
                        <p className="text-xs text-muted-foreground">
                          Submitted: {new Date(provider.submitted_at).toLocaleString()}
                          {provider.application_status === 'resubmitted' && (
                            <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                              (Resubmitted for review)
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* All Documents */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Verification Documents
                      </h4>
                      {provider.application_status === 'resubmitted' && (
                        <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300">
                          Updated Documents
                        </Badge>
                      )}
                    </div>

                    {provider.application_status === 'resubmitted' && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-white text-xs">!</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                              Provider has resubmitted their application
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                              All documents have been re-uploaded and are ready for review. Please review the updated documents carefully.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Identity Documents */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-sm flex items-center gap-2">
                        <IdCard className="h-4 w-4" />
                        Identity Documents
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {provider.cnic_front_image && renderDocumentPreview(
                          'verification-docs',
                          provider.cnic_front_image,
                          'CNIC Front',
                          <IdCard className="h-4 w-4 text-blue-600" />
                        )}
                        {provider.cnic_back_image && renderDocumentPreview(
                          'verification-docs',
                          provider.cnic_back_image,
                          'CNIC Back',
                          <IdCard className="h-4 w-4 text-blue-600" />
                        )}
                        {provider.profile_photo && renderDocumentPreview(
                          'verification-docs',
                          provider.profile_photo,
                          'Profile Photo',
                          <User className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </div>

                    {/* Business Documents */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Business Documents
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {provider.business_certificate && renderDocumentPreview(
                          'provider-documents',
                          provider.business_certificate,
                          'Business Registration Certificate',
                          <FileText className="h-4 w-4 text-red-600" />
                        )}
                        {provider.license_certificate && renderDocumentPreview(
                          'verification-docs',
                          provider.license_certificate,
                          'Professional License/Certificate',
                          <FileText className="h-4 w-4 text-purple-600" />
                        )}
                        {provider.proof_of_address && renderDocumentPreview(
                          'verification-docs',
                          provider.proof_of_address,
                          'Proof of Address',
                          <MapPin className="h-4 w-4 text-orange-600" />
                        )}
                        {/* Show missing documents as placeholders */}
                        {!provider.business_certificate && (
                          <div className="flex items-center gap-2 p-2 border rounded-lg border-dashed border-gray-300">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-500">Business Certificate</p>
                              <p className="text-xs text-gray-400">Not uploaded</p>
                            </div>
                          </div>
                        )}
                        {!provider.license_certificate && (
                          <div className="flex items-center gap-2 p-2 border rounded-lg border-dashed border-gray-300">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-500">License/Certificate</p>
                              <p className="text-xs text-gray-400">Not uploaded</p>
                            </div>
                          </div>
                        )}
                        {!provider.proof_of_address && (
                          <div className="flex items-center gap-2 p-2 border rounded-lg border-dashed border-gray-300">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-500">Proof of Address</p>
                              <p className="text-xs text-gray-400">Not uploaded</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Shop Photos - Always visible */}
                    {provider.shop_photos && provider.shop_photos.length > 0 && (
                      <div className="space-y-4">
                        <h5 className="font-medium text-sm">Shop Photos ({provider.shop_photos.length})</h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {provider.shop_photos.map((photo: string, index: number) => {
                            console.log(`Rendering shop photo ${index + 1}: ${photo}`);
                            // Use public URL for shop photos since they're in a public bucket
                            const { data: urlData } = supabase.storage.from('shop-photos').getPublicUrl(photo);

                            return (
                              <div key={index} className="space-y-2">
                                <div
                                  className="w-full h-24 rounded border cursor-pointer hover:opacity-80 bg-gray-100 flex items-center justify-center overflow-hidden"
                                  onClick={() => openDocument('shop-photos', photo)}
                                >
                                  <img
                                    src={urlData.publicUrl}
                                    alt={`Shop photo ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.error(`Failed to load shop photo ${index + 1}:`, urlData.publicUrl);
                                      // Fallback to placeholder
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `
                                          <div class="w-full h-full flex items-center justify-center bg-gray-200">
                                            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                            </svg>
                                          </div>
                                        `;
                                      }
                                    }}
                                    onLoad={() => {
                                      console.log(`Successfully loaded shop photo ${index + 1}:`, urlData.publicUrl);
                                    }}
                                  />
                                </div>
                                <p className="text-xs text-center text-muted-foreground">
                                  Shop Photo {index + 1}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>


                  {/* Rejection Reason */}
                  <div className="space-y-2">
                    <Label htmlFor={`rejection-reason-${provider.id}`}>
                      Rejection Reason
                    </Label>
                    <Textarea
                      id={`rejection-reason-${provider.id}`}
                      placeholder="Enter reason for rejection..."
                      value={rejectionReason[provider.id] || ""}
                      onChange={(e) => setRejectionReason(prev => ({
                        ...prev,
                        [provider.id]: e.target.value
                      }))}
                      rows={3}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-4">
                    <Button 
                      onClick={() => handleApprove(provider.id)}
                      disabled={isProcessing[provider.id]}
                      className="flex items-center gap-2"
                    >
                      {isProcessing[provider.id] ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="destructive"
                      onClick={() => handleReject(provider.id)}
                      disabled={isProcessing[provider.id]}
                      className="flex items-center gap-2"
                    >
                      {isProcessing[provider.id] ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" />
                          Reject
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>

          {/* Pagination Controls for Pending Providers */}
          <PaginationControls
            currentPage={currentPendingPage}
            totalPages={totalPendingPages}
            onPageChange={setCurrentPendingPage}
          />
        </>
      )}
    </TabsContent>

        {/* Rejected Providers Tab */}
        <TabsContent value="rejected" className="space-y-4">
          {rejectedProviders.length === 0 ? (
            <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
              <CardContent className="p-12 text-center">
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[hsl(0,0%,95%)] mb-2">No Rejected Providers</h3>
                <p className="text-[hsl(210,100%,75%)]">No providers have been rejected yet.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedRejectedProviders.map((provider) => (
                <Card key={provider.id} className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)] opacity-75">
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {/* Provider Info */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg line-through text-red-400">{provider.business_name}</h3>
                            <Badge variant="destructive">Rejected</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{provider.business_type}</p>
                          <p className="text-sm">{provider.profiles?.full_name} - {provider.profiles?.email}</p>
                          {provider.phone && <p className="text-sm">Phone: {provider.phone}</p>
}
                          {provider.cnic && <p className="text-sm">CNIC: {provider.cnic}</p>
}
                          <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <MapPin className="h-4 w-4" />
                            <span>{provider.business_address}</span>
                          </div>
                          {provider.description && (
                            <p className="text-sm text-muted-foreground mt-2">
                              <strong>Description:</strong> {provider.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span>Submitted: {provider.submitted_at ? new Date(provider.submitted_at).toLocaleString() : 'N/A'}</span>
                            <span>Rejected: {provider.updated_at ? new Date(provider.updated_at).toLocaleString() : 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Rejection Reason */}
                      {provider.rejection_reason && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                              <p className="text-sm text-red-700 mt-1">{provider.rejection_reason}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>

              {/* Pagination Controls for Rejected Providers */}
              <PaginationControls
                currentPage={currentRejectedPage}
                totalPages={totalRejectedPages}
                onPageChange={setCurrentRejectedPage}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NormalVerificationManagement;