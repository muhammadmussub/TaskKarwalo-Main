import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  IdCard, 
  User, 
  MapPin, 
  Eye,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface KYCVerificationManagementProps {
  providers: Provider[];
  onReviewComplete: () => void;
}

const KYCVerificationManagement = ({ providers, onReviewComplete }: KYCVerificationManagementProps) => {
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});

  const handleApprove = async (providerId: string) => {
    setIsProcessing(prev => ({ ...prev, [providerId]: true }));
    
    try {
      const { error } = await supabase
        .from('provider_profiles')
        .update({ 
          application_status: 'approved'
        })
        .eq('id', providerId);

      if (error) throw error;

      toast.success("KYC documents approved successfully");
      onReviewComplete();
    } catch (error: any) {
      toast.error("Failed to approve KYC documents: " + error.message);
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
      const { error } = await supabase
        .from('provider_profiles')
        .update({ 
          application_status: 'rejected',
          rejection_reason: rejectionReason[providerId]
        })
        .eq('id', providerId);

      if (error) throw error;

      toast.success("KYC documents rejected");
      onReviewComplete();
    } catch (error: any) {
      toast.error("Failed to reject KYC documents: " + error.message);
    } finally {
      setIsProcessing(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const handleRequestReupload = async (providerId: string) => {
    if (!rejectionReason[providerId]?.trim()) {
      toast.error("Please provide a reason for reupload request");
      return;
    }

    setIsProcessing(prev => ({ ...prev, [providerId]: true }));
    
    try {
      const { error } = await supabase
        .from('provider_profiles')
        .update({ 
          application_status: 'reupload_requested',
          rejection_reason: rejectionReason[providerId]
        })
        .eq('id', providerId);

      if (error) throw error;

      toast.success("Reupload request sent to provider");
      onReviewComplete();
    } catch (error: any) {
      toast.error("Failed to request reupload: " + error.message);
    } finally {
      setIsProcessing(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const openDocument = (bucket: string, path: string) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    window.open(data.publicUrl, '_blank');
  };

  const downloadDocument = (bucket: string, path: string, filename: string) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    const link = document.createElement('a');
    link.href = data.publicUrl;
    link.download = filename;
    link.click();
  };

  const renderDocumentPreview = (bucket: string, path: string, title: string, icon: React.ReactNode) => {
    if (!path) return null;
    
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
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => downloadDocument(bucket, path, path.split('/').pop() || 'document')}
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  // Filter providers with pending KYC verification (application_status is not 'approved')
  const pendingKYCProviders = providers.filter(provider => 
    provider.application_status !== 'approved'
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">KYC Verification Management</h2>
          <p className="text-muted-foreground">
            Review KYC documents and approve or reject provider applications
          </p>
        </div>
      </div>

      {pendingKYCProviders.length > 0 ? (
        <div className="space-y-4">
          {pendingKYCProviders.map((provider) => (
            <Card key={provider.id}>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Provider Info */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <h3 className="font-semibold text-lg">{provider.business_name}</h3>
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
                        </p>
                      )}
                      {provider.application_status && (
                        <div className="mt-2">
                          <Badge 
                            variant={
                              provider.application_status === 'approved' ? 'default' :
                              provider.application_status === 'rejected' ? 'destructive' : 'outline'
                            }
                          >
                            {provider.application_status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Verification Documents */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <IdCard className="h-4 w-4" />
                      KYC Documents
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {renderDocumentPreview(
                        'verification-docs', 
                        provider.cnic_front_image, 
                        'CNIC Front Image', 
                        <IdCard className="h-4 w-4 text-blue-600" />
                      )}
                      
                      {provider.cnic_back_image && renderDocumentPreview(
                        'verification-docs', 
                        provider.cnic_back_image, 
                        'CNIC Back Image', 
                        <IdCard className="h-4 w-4 text-blue-600" />
                      )}
                      
                      {provider.license_certificate && renderDocumentPreview(
                        'verification-docs', 
                        provider.license_certificate, 
                        'License / Certification', 
                        <FileText className="h-4 w-4 text-green-600" />
                      )}
                      
                      {provider.profile_photo && renderDocumentPreview(
                        'verification-docs', 
                        provider.profile_photo, 
                        'Profile Photo', 
                        <User className="h-4 w-4 text-purple-600" />
                      )}
                      
                      {provider.proof_of_address && renderDocumentPreview(
                        'verification-docs', 
                        provider.proof_of_address, 
                        'Proof of Address', 
                        <MapPin className="h-4 w-4 text-orange-600" />
                      )}
                    </div>
                  </div>

                  {/* Shop Photos */}
                  {provider.shop_photos && provider.shop_photos.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Shop Photos</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {provider.shop_photos.slice(0, 3).map((photo: string, index: number) => (
                          <img
                            key={index}
                            src={`https://vqqqdsmyytuvxrtwvifn.supabase.co/storage/v1/object/public/shop-photos/${photo}`}
                            alt={`Shop photo ${index + 1}`}
                            className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => openDocument('shop-photos', photo)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Business Certificate */}
                  {provider.business_certificate && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Business Registration Certificate</h4>
                      <div className="flex items-center gap-2 p-2 border rounded-lg">
                        <FileText className="h-4 w-4 text-red-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">Business Certificate</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {provider.business_certificate.split('/').pop()}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => openDocument('provider-documents', provider.business_certificate)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => downloadDocument(
                              'provider-documents', 
                              provider.business_certificate, 
                              provider.business_certificate.split('/').pop() || 'certificate'
                            )}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  <div className="space-y-2">
                    <Label htmlFor={`rejection-reason-${provider.id}`}>
                      Rejection Reason / Reupload Request Note
                    </Label>
                    <Textarea
                      id={`rejection-reason-${provider.id}`}
                      placeholder="Enter reason for rejection or what documents need to be reuploaded..."
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
                          Approve KYC
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
                          Reject KYC
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => handleRequestReupload(provider.id)}
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
                          <FileText className="h-4 w-4" />
                          Request Re-upload
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <IdCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No pending KYC verification reviews</h3>
              <p className="text-muted-foreground">
                All provider KYC documents have been reviewed
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default KYCVerificationManagement;