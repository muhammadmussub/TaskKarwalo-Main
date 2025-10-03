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

interface ProviderVerificationReviewProps {
  providers: any[];
  onReviewComplete: () => void;
}

const ProviderVerificationReview = ({ providers, onReviewComplete }: ProviderVerificationReviewProps) => {
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});

  const handleApprove = async (providerId: string) => {
    setIsProcessing(prev => ({ ...prev, [providerId]: true }));
    
    try {
      const { error } = await supabase
        .from('provider_profiles')
        .update({ 
          admin_approved: true, 
          verified: true,
          application_status: 'approved'
        })
        .eq('id', providerId);

      if (error) throw error;

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
      const { error } = await supabase
        .from('provider_profiles')
        .update({ 
          admin_approved: false,
          verified: false,
          application_status: 'rejected',
          rejection_reason: rejectionReason[providerId]
        })
        .eq('id', providerId);

      if (error) throw error;

      toast.success("Provider rejected");
      onReviewComplete();
    } catch (error: any) {
      toast.error("Failed to reject provider: " + error.message);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Provider Verification Review</h2>
          <p className="text-muted-foreground">
            Review verification documents and approve or reject provider applications
          </p>
        </div>
      </div>

      {providers.length > 0 ? (
        <div className="space-y-4">
          {providers.map((provider) => (
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
                      {provider.phone && <p className="text-sm">Phone: {provider.phone}</p>}
                      {provider.cnic && <p className="text-sm">CNIC: {provider.cnic}</p>}
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

                  {/* Document Sections */}
                  <div className="space-y-6">
                    {/* Verification Documents */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <IdCard className="h-4 w-4" />
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
                      </div>
                    </div>

                    {/* Identity Documents */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Identity Documents
                      </h4>

                      {/* All identity photos in grid like shop photos */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {provider.cnic_front_image && (
                          <div className="space-y-2">
                            <div className="aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group">
                              <img
                                src={`https://vqqqdsmyytuvxrtwvifn.supabase.co/storage/v1/object/public/verification-docs/${provider.cnic_front_image}`}
                                alt="CNIC Front"
                                className="w-full h-full object-cover cursor-pointer transition-opacity group-hover:opacity-80"
                                onClick={() => openDocument('verification-docs', provider.cnic_front_image)}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="w-full h-full flex flex-col items-center justify-center text-gray-500 p-2">
                                        <IdCard class="h-8 w-8 mb-2 text-blue-500" />
                                        <span class="text-xs text-center font-medium">CNIC Front</span>
                                        <span class="text-xs text-center text-gray-400 mt-1">${provider.cnic_front_image.split('/').pop()}</span>
                                      </div>
                                    `;
                                  }
                                }}
                                loading="lazy"
                              />
                            </div>
                            <p className="text-xs text-center text-muted-foreground font-medium">CNIC Front</p>
                          </div>
                        )}

                        {provider.cnic_back_image && (
                          <div className="space-y-2">
                            <div className="aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group">
                              <img
                                src={`https://vqqqdsmyytuvxrtwvifn.supabase.co/storage/v1/object/public/verification-docs/${provider.cnic_back_image}`}
                                alt="CNIC Back"
                                className="w-full h-full object-cover cursor-pointer transition-opacity group-hover:opacity-80"
                                onClick={() => openDocument('verification-docs', provider.cnic_back_image)}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="w-full h-full flex flex-col items-center justify-center text-gray-500 p-2">
                                        <IdCard class="h-8 w-8 mb-2 text-blue-500" />
                                        <span class="text-xs text-center font-medium">CNIC Back</span>
                                        <span class="text-xs text-center text-gray-400 mt-1">${provider.cnic_back_image.split('/').pop()}</span>
                                      </div>
                                    `;
                                  }
                                }}
                                loading="lazy"
                              />
                            </div>
                            <p className="text-xs text-center text-muted-foreground font-medium">CNIC Back</p>
                          </div>
                        )}

                        {provider.profile_photo && (
                          <div className="space-y-2">
                            <div className="aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group">
                              <img
                                src={`https://vqqqdsmyytuvxrtwvifn.supabase.co/storage/v1/object/public/verification-docs/${provider.profile_photo}`}
                                alt="Profile Photo"
                                className="w-full h-full object-cover cursor-pointer transition-opacity group-hover:opacity-80"
                                onClick={() => openDocument('verification-docs', provider.profile_photo)}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="w-full h-full flex flex-col items-center justify-center text-gray-500 p-2">
                                        <User class="h-8 w-8 mb-2 text-green-500" />
                                        <span class="text-xs text-center font-medium">Profile Photo</span>
                                        <span class="text-xs text-center text-gray-400 mt-1">${provider.profile_photo.split('/').pop()}</span>
                                      </div>
                                    `;
                                  }
                                }}
                                loading="lazy"
                              />
                            </div>
                            <p className="text-xs text-center text-muted-foreground font-medium">Profile Photo</p>
                          </div>
                        )}
                      </div>

                      {/* Other identity documents as preview cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {provider.proof_of_address && renderDocumentPreview(
                          'verification-docs',
                          provider.proof_of_address,
                          'Proof of Address',
                          <MapPin className="h-4 w-4 text-orange-600" />
                        )}
                      </div>
                    </div>

                    {/* Business Documents */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Business Documents
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {provider.business_certificate && renderDocumentPreview(
                          'provider-documents',
                          provider.business_certificate,
                          'Business Registration Certificate',
                          <FileText className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>

                    {/* Shop Photos */}
                    {provider.shop_photos && provider.shop_photos.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-medium">Shop Photos</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {provider.shop_photos.map((photo: string, index: number) => (
                            <div key={index} className="space-y-2">
                              <img
                                src={`https://vqqqdsmyytuvxrtwvifn.supabase.co/storage/v1/object/public/shop-photos/${photo}`}
                                alt={`Shop photo ${index + 1}`}
                                className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80"
                                onClick={() => openDocument('shop-photos', photo)}
                              />
                              <p className="text-xs text-center text-muted-foreground">Shop Photo {index + 1}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

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
              <h3 className="text-lg font-semibold mb-2">No pending verification reviews</h3>
              <p className="text-muted-foreground">
                All provider verification applications have been reviewed
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProviderVerificationReview;