import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Camera, FileText, IdCard, User, MapPin } from "lucide-react";
import { serviceCategories } from "@/data/serviceCategories";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import LocationPicker from "./LocationPicker";

interface ProviderBusinessSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  isReapplying?: boolean;
  existingProfile?: any;
}

interface FileUpload {
  file: File;
  preview: string;
  uploaded: boolean;
  url?: string;
}

const ProviderBusinessSetup = ({ isOpen, onClose, onSubmitted, isReapplying = false, existingProfile }: ProviderBusinessSetupProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isModalReady, setIsModalReady] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(true);
  const [storageAvailable, setStorageAvailable] = useState<boolean | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Component initialization
  
  // Form data
  const [formData, setFormData] = useState({
    business_name: "",
    business_type: "",
    business_address: "",
    phone: "",
    cnic: "",
    description: ""
  });

  // Track which fields have been changed
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  
  // Location state
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Existing file uploads
  const [shopPhotos, setShopPhotos] = useState<FileUpload[]>([]);
  const [businessCertificate, setBusinessCertificate] = useState<FileUpload | null>(null);

  // New verification document uploads
  const [cnicFront, setCnicFront] = useState<FileUpload | null>(null);
  const [cnicBack, setCnicBack] = useState<FileUpload | null>(null);
  const [licenseCertificate, setLicenseCertificate] = useState<FileUpload | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<FileUpload | null>(null);
  const [proofOfAddress, setProofOfAddress] = useState<FileUpload | null>(null);

  // Upload progress tracking
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<string>('');
  
  // Refs for file inputs
  const shopPhotoRef = useRef<HTMLInputElement>(null);
  const certificateRef = useRef<HTMLInputElement>(null);
  const cnicFrontRef = useRef<HTMLInputElement>(null);
  const cnicBackRef = useRef<HTMLInputElement>(null);
  const licenseCertificateRef = useRef<HTMLInputElement>(null);
  const profilePhotoRef = useRef<HTMLInputElement>(null);
  const proofOfAddressRef = useRef<HTMLInputElement>(null);

  // Set modal as ready when it opens
  useEffect(() => {
    if (isOpen) {
      console.log('✅ Modal opened, setting as ready...');
      setIsFormLoading(true);

      // Add a small delay to ensure all data is loaded
      const timer = setTimeout(() => {
        setIsModalReady(true);
        setIsFormLoading(false);
        console.log('✅ Modal is now ready for submission');
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setIsModalReady(false);
      setIsFormLoading(false);
    }
  }, [isOpen]);

  // Load existing data when in reapply mode
  useEffect(() => {
    if (isReapplying && existingProfile && isOpen) {
      console.log('✅ Loading existing data for editing:', existingProfile);

      // Clear any existing data first
      setFormData({
        business_name: "",
        business_type: "",
        business_address: "",
        phone: "",
        cnic: "",
        description: ""
      });
      setLocation(null);
      setShopPhotos([]);
      setBusinessCertificate(null);
      setCnicFront(null);
      setCnicBack(null);
      setLicenseCertificate(null);
      setProfilePhoto(null);
      setProofOfAddress(null);
      setChangedFields(new Set());

      // Then load the existing data
      setTimeout(() => {
        setFormData({
          business_name: existingProfile.business_name || "",
          business_type: existingProfile.business_type || "",
          business_address: existingProfile.business_address || "",
          phone: existingProfile.phone || "",
          cnic: existingProfile.cnic || "",
          description: existingProfile.description || ""
        });

        // Set location if available
        if (existingProfile.latitude && existingProfile.longitude) {
          setLocation({
            lat: existingProfile.latitude,
            lng: existingProfile.longitude
          });
        }

        // For reapply mode, DO NOT load existing documents - let provider upload fresh ones
        // This ensures all documents are re-uploaded for verification
        console.log('🔄 Reapply mode: NOT loading existing documents - provider must upload fresh ones');
        console.log('📝 Provider will need to upload: CNIC front, CNIC back, license, profile photo, proof of address, shop photos, and business certificate');

        console.log('✅ All existing data loaded successfully');
        console.log('✅ Form is ready for editing - user must click submit to send updated data');
      }, 100);
    }
  }, [isReapplying, existingProfile, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Track changed fields for reapply mode
    if (isReapplying && existingProfile) {
      const originalValue = existingProfile[field] || '';
      if (value !== originalValue) {
        setChangedFields(prev => new Set([...prev, field]));
      } else {
        setChangedFields(prev => {
          const newSet = new Set(prev);
          newSet.delete(field);
          return newSet;
        });
      }
    }
  };

  const handleLocationChange = (lat: number, lng: number, address: string) => {
    setLocation({ lat, lng });
    setFormData(prev => ({ ...prev, business_address: address }));
  };

  const validateFile = (file: File, type: 'image' | 'document'): boolean => {
    const maxSize = 2 * 1024 * 1024; // 2MB (reduced from 5MB for better performance and reliability)

    if (file.size > maxSize) {
      toast.error(`File ${file.name} is too large. Maximum size is 2MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB. Please use a smaller file or compress your image.`);
      return false;
    }

    if (file.size === 0) {
      toast.error(`File ${file.name} is empty. Please select a valid file.`);
      return false;
    }

    if (type === 'image') {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error(`Invalid image format for ${file.name}. Please use JPEG, PNG, or WebP.`);
        return false;
      }
    } else {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast.error(`Invalid document format for ${file.name}. Please use PDF, JPEG, or PNG.`);
        return false;
      }
    }

    return true;
  };

  const handleFileUpload = (files: FileList | null, type: 'photos' | 'certificate' | 'cnic_front' | 'cnic_back' | 'license' | 'profile' | 'address') => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    let fileType: 'image' | 'document' = 'image';
    
    // Determine file type based on upload field
    if (type === 'certificate' || type === 'license') {
      fileType = 'document';
    }
    
    if (!validateFile(file, fileType)) {
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      const fileUpload: FileUpload = {
        file,
        preview,
        uploaded: false
      };
      
      switch (type) {
        case 'photos':
          setShopPhotos(prev => {
            const newPhotos = [...prev, fileUpload];
            console.log(`Added photo: ${file.name}, total photos: ${newPhotos.length}`);
            return newPhotos;
          });
          break;
        case 'certificate':
          setBusinessCertificate(fileUpload);
          console.log(`Added certificate: ${file.name}`);
          break;
        case 'cnic_front':
          setCnicFront(fileUpload);
          console.log(`Added CNIC front: ${file.name}`);
          break;
        case 'cnic_back':
          setCnicBack(fileUpload);
          console.log(`Added CNIC back: ${file.name}`);
          break;
        case 'license':
          setLicenseCertificate(fileUpload);
          console.log(`Added license: ${file.name}`);
          break;
        case 'profile':
          setProfilePhoto(fileUpload);
          console.log(`Added profile photo: ${file.name}`);
          break;
        case 'address':
          setProofOfAddress(fileUpload);
          console.log(`Added proof of address: ${file.name}`);
          break;
      }
    };
    
    reader.onerror = (error) => {
      console.error('File reading error:', error);
      toast.error(`Failed to read file: ${file.name}`);
    };
    
    reader.readAsDataURL(file);
  };

  const removeFile = (type: 'photos' | 'certificate' | 'cnic_front' | 'cnic_back' | 'license' | 'profile' | 'address', index?: number) => {
    switch (type) {
      case 'photos':
        if (index !== undefined) {
          setShopPhotos(prev => prev.filter((_, i) => i !== index));
        }
        break;
      case 'certificate':
        setBusinessCertificate(null);
        break;
      case 'cnic_front':
        setCnicFront(null);
        break;
      case 'cnic_back':
        setCnicBack(null);
        break;
      case 'license':
        setLicenseCertificate(null);
        break;
      case 'profile':
        setProfilePhoto(null);
        break;
      case 'address':
        setProofOfAddress(null);
        break;
    }
  };


  // Compress image files to reduce size
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (file.type === 'application/pdf') {
        resolve(file); // Don't compress PDFs
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 1200px on longest side)
        const maxSize = 1200;
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            console.log(`Compressed ${file.name} from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, file.type, 0.8); // 80% quality
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const uploadFile = async (fileUpload: FileUpload, folder: string, retryCount = 0): Promise<string | null> => {
    if (!user) {
      console.error('Upload failed: No user authenticated');
      return null;
    }

    let fileToUpload = fileUpload.file;

    // Compress images to reduce upload time
    if (fileToUpload.type.startsWith('image/')) {
      try {
        fileToUpload = await compressImage(fileToUpload);
      } catch (error) {
        console.warn('Failed to compress image, using original:', error);
      }
    }

    // Quick file size check - reject files over 5MB immediately
    if (fileToUpload.size > 5 * 1024 * 1024) {
      toast.error(`File ${fileToUpload.name} is too large (max 5MB)`);
      return null;
    }

    const fileExt = fileToUpload.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const bucket = folder === 'photos' ? 'shop-photos' :
                  folder === 'documents' ? 'provider-documents' :
                  'verification-docs';

    console.log(`Uploading ${fileToUpload.name} (${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB) to ${bucket}...`);

    // Check network connectivity before upload
    try {
      await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
    } catch (networkError) {
      console.error('Network connectivity check failed:', networkError);
      toast.error('No internet connection. Please check your connection and try again.');
      return null;
    }

    try {
      // Upload with improved retry logic for network errors
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
          contentType: fileToUpload.type
        });

      if (error) {
        console.error('Upload error:', error);

        // Enhanced retry logic for network errors
        if (retryCount < 3 && (
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('network') ||
          error.message.includes('ERR_FAILED') ||
          error.message.includes('timeout') ||
          error.message.includes('connection') ||
          error.message.includes('StorageUnknownError') ||
          error.message.includes('fetch') ||
          error.message.includes('CORS') ||
          error.message.includes('aborted')
        )) {
          console.log(`Retrying upload for ${fileToUpload.name}, attempt ${retryCount + 1}/3`);
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          return uploadFile(fileUpload, folder, retryCount + 1);
        }

        // Show specific error messages
        if (error.message.includes('Bucket not found')) {
          toast.error('Storage not configured. Please contact support.');
        } else if (error.message.includes('size')) {
          toast.error('File too large. Please use smaller files.');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('ERR_FAILED') || error.message.includes('timeout') || error.message.includes('StorageUnknownError')) {
          toast.error('Network error. Please check your connection and try again.');
        } else if (error.message.includes('CORS')) {
          toast.error('CORS error. Please try again or contact support.');
        } else {
          toast.error(`Upload failed: ${error.message}`);
        }
        return null;
      }

      console.log(`✅ ${fileToUpload.name} uploaded successfully to ${bucket}`);
      return fileName;

    } catch (error) {
      console.error('Upload exception:', error);

      // Enhanced retry logic for network exceptions
      if (retryCount < 3 && (
        error instanceof TypeError ||
        error instanceof DOMException ||
        (error instanceof Error && (
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('ERR_FAILED') ||
          error.message.includes('timeout') ||
          error.message.includes('connection') ||
          error.message.includes('StorageUnknownError') ||
          error.message.includes('fetch') ||
          error.message.includes('CORS') ||
          error.message.includes('aborted')
        ))
      )) {
        console.log(`Retrying upload for ${fileToUpload.name}, attempt ${retryCount + 1}/3`);
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return uploadFile(fileUpload, folder, retryCount + 1);
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        toast.error('Network error. Please check your connection and try again.');
      } else if (errorMessage.includes('CORS')) {
        toast.error('CORS error. Please try again or contact support.');
      } else {
        toast.error(`Upload failed: ${errorMessage}`);
      }
      return null;
    }
  };

  const submitToDatabase = async (photoUrls: string[], certificateUrl: string | null, verificationDocs: Record<string, string | null>) => {
    setUploadStage('Saving to database...');
    setOverallProgress(90);

    // Create provider profile
    const profileData = {
      user_id: user.id,
      business_name: formData.business_name,
      business_type: formData.business_type,
      business_address: formData.business_address,
      phone: formData.phone,
      cnic: formData.cnic,
      description: formData.description,
      shop_photos: photoUrls,
      business_certificate: certificateUrl,
      latitude: location?.lat || null,
      longitude: location?.lng || null,
      location_updated_at: location ? new Date().toISOString() : null,
      application_status: isReapplying ? 'resubmitted' : 'submitted',
      submitted_at: new Date().toISOString(),
      documents_uploaded: true,
      verified: false,
      admin_approved: false,
      rejection_reason: null,
      ...verificationDocs
    };

    // Try insert first, then update if needed
    const { error: insertError } = await supabase
      .from('provider_profiles')
      .insert(profileData);

    if (insertError) {
      console.log('Insert failed, trying update:', insertError.message);
      const { error: updateError } = await supabase
        .from('provider_profiles')
        .update(profileData)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Update also failed:', updateError);
        throw new Error(`Database error: ${updateError.message}`);
      }
    }

    console.log('✅ Database operation completed successfully');
  };

  const handleSubmitWithFallback = async () => {
    try {
      setLoading(true);
      setOverallProgress(50);
      setUploadStage('Saving application...');

      // Create provider profile without uploaded files
      const profileData = {
        user_id: user.id,
        business_name: formData.business_name,
        business_type: formData.business_type,
        business_address: formData.business_address,
        phone: formData.phone,
        cnic: formData.cnic,
        description: formData.description,
        shop_photos: [],
        business_certificate: null,
        latitude: location?.lat || null,
        longitude: location?.lng || null,
        location_updated_at: location ? new Date().toISOString() : null,
        application_status: isReapplying ? 'resubmitted' : 'submitted',
        submitted_at: new Date().toISOString(),
        documents_uploaded: false, // Mark as not uploaded
        verified: false,
        admin_approved: false,
        rejection_reason: null,
        cnic_front_image: null,
        cnic_back_image: null,
        license_certificate: null,
        profile_photo: null,
        proof_of_address: null
      };

      // Try insert first, then update if needed
      const { error: insertError } = await supabase
        .from('provider_profiles')
        .insert(profileData);

      if (insertError) {
        console.log('Insert failed, trying update:', insertError.message);
        const { error: updateError } = await supabase
          .from('provider_profiles')
          .update(profileData)
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Update also failed:', updateError);
          throw new Error(`Database error: ${updateError.message}`);
        }
      }

      setOverallProgress(100);
      console.log('✅ Application submitted successfully without files!');

      toast.success(isReapplying
        ? "Application updated successfully! Upload files later from your dashboard."
        : "Application submitted successfully! You can upload files later from your dashboard."
      );

      onSubmitted();
      onClose();

    } catch (error) {
      console.error('Fallback submission error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit application";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setOverallProgress(0);
      setUploadStage('');
    }
  };

  const retryFailedUploads = async () => {
    if (retryCount >= 3) {
      toast.error("Maximum retry attempts reached. Please submit without files or try again later.");
      return;
    }

    setRetryCount(prev => prev + 1);
    console.log(`Retrying uploads (attempt ${retryCount + 1}/3)...`);

    // Re-run the upload process
    await handleSubmit();
  };

  const handleSubmit = async () => {
    try {
      if (!user) {
        toast.error('Authentication required');
        return;
      }

      // Basic validation
      if (!formData.business_name || !formData.business_type) {
        toast.error("Please fill in Business Name and Type");
        return;
      }

      if (shopPhotos.length < 2) {
        toast.error("Please upload at least 2 shop photos");
        return;
      }

      if (!cnicFront) {
        toast.error("Please upload CNIC Front Image");
        return;
      }

      if (!profilePhoto) {
        toast.error("Please upload Profile Photo (Selfie)");
        return;
      }

      console.log('Starting form submission...');
      setLoading(true);
      setOverallProgress(10);
      setUploadStage('Preparing files...');


      // Check network connectivity first with multiple fallbacks
      let networkConnected = false;
      try {
        // Try multiple endpoints to verify connectivity
        const endpoints = [
          'https://www.google.com/favicon.ico',
          'https://httpbin.org/status/200',
          'https://jsonplaceholder.typicode.com/posts/1',
          'https://vqqqdsmyytuvxrtwvifn.supabase.co/rest/v1/' // Test Supabase endpoint
        ];

        for (const endpoint of endpoints) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            const response = await fetch(endpoint, {
              method: 'HEAD',
              mode: endpoint.includes('supabase.co') ? 'cors' : 'no-cors',
              cache: 'no-cache',
              signal: controller.signal
            });

            clearTimeout(timeoutId);
            networkConnected = true;
            console.log(`✅ Network connectivity verified via ${endpoint}`);
            break;
          } catch (e) {
            console.warn(`Network check failed for ${endpoint}:`, e);
            continue;
          }
        }

        if (!networkConnected) {
          throw new Error('No internet connection');
        }
        console.log('✅ Network connectivity verified');
      } catch (error) {
        console.error('❌ Network connectivity check failed:', error);
        toast.error('No internet connection detected. Please check your connection and try again.');
        setLoading(false);
        setOverallProgress(0);
        setUploadStage('');
        return;
      }

      // Prepare all files for upload with priority ordering
      const filesToUpload: Array<{fileUpload: FileUpload, folder: string, priority: number}> = [];

      // Add files in specific order for proper matching
      // Priority 1: Required files (CNIC Front, Profile Photo)
      if (cnicFront && !cnicFront.uploaded) {
        filesToUpload.push({ fileUpload: cnicFront, folder: 'verification-docs', priority: 1 });
      }
      if (profilePhoto && !profilePhoto.uploaded) {
        filesToUpload.push({ fileUpload: profilePhoto, folder: 'verification-docs', priority: 1 });
      }

      // Priority 2: Shop photos (at least 2 required)
      shopPhotos.slice(0, 2).forEach((photo) => {
        if (!photo.uploaded) {
          filesToUpload.push({ fileUpload: photo, folder: 'photos', priority: 2 });
        }
      });

      // Priority 3: Optional verification files
      if (cnicBack && !cnicBack.uploaded) {
        filesToUpload.push({ fileUpload: cnicBack, folder: 'verification-docs', priority: 3 });
      }
      if (licenseCertificate && !licenseCertificate.uploaded) {
        filesToUpload.push({ fileUpload: licenseCertificate, folder: 'verification-docs', priority: 3 });
      }
      if (proofOfAddress && !proofOfAddress.uploaded) {
        filesToUpload.push({ fileUpload: proofOfAddress, folder: 'verification-docs', priority: 3 });
      }

      // Priority 4: Business certificate
      if (businessCertificate && !businessCertificate.uploaded) {
        filesToUpload.push({ fileUpload: businessCertificate, folder: 'documents', priority: 4 });
      }

      // Priority 5: Remaining shop photos
      shopPhotos.slice(2).forEach((photo) => {
        if (!photo.uploaded) {
          filesToUpload.push({ fileUpload: photo, folder: 'photos', priority: 5 });
        }
      });

      // Sort by priority (lower number = higher priority)
      filesToUpload.sort((a, b) => a.priority - b.priority);

      console.log(`Uploading ${filesToUpload.length} files...`);

      // Upload files with limited concurrency for better performance
      const maxConcurrent = 1; // Reduced to 1 for maximum reliability
      let completedFiles = 0;
      let failedUploads = 0;
      const uploadResults: (string | null)[] = [];

      setUploadStage('Uploading files...');
      setOverallProgress(30);

      // Process files sequentially to avoid overwhelming the network
      for (let i = 0; i < filesToUpload.length; i++) {
        const { fileUpload, folder } = filesToUpload[i];

        try {
          console.log(`Starting upload ${i + 1}/${filesToUpload.length}: ${fileUpload.file.name}`);
          const result = await uploadFile(fileUpload, folder);

          if (result) {
            completedFiles++;
            console.log(`✅ Completed upload ${i + 1}/${filesToUpload.length}: ${fileUpload.file.name}`);
            // Update progress based on completed files
            const progressPercent = 30 + Math.round((completedFiles / filesToUpload.length) * 50);
            setOverallProgress(Math.min(progressPercent, 80));
          } else {
            failedUploads++;
            console.error(`❌ Failed upload ${i + 1}/${filesToUpload.length}: ${fileUpload.file.name}`);
          }

          uploadResults.push(result);

          // Small delay between uploads to prevent network congestion
          if (i < filesToUpload.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          failedUploads++;
          console.error(`Failed to upload ${fileUpload.file.name}:`, error);
          uploadResults.push(null);

          // Small delay before next upload even on error
          if (i < filesToUpload.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      // Process results
      const verificationDocs: Record<string, string | null> = {
        cnic_front_image: null,
        cnic_back_image: null,
        license_certificate: null,
        profile_photo: null,
        proof_of_address: null
      };

      const photoUrls: string[] = [];
      let certificateUrl: string | null = null;

      // Process the results from the batch uploads
      // Since filenames are just timestamps, we need to match by upload order
      const verificationFiles = filesToUpload.filter(f => f.folder === 'verification-docs');
      const photoFiles = filesToUpload.filter(f => f.folder === 'photos');
      const documentFiles = filesToUpload.filter(f => f.folder === 'documents');

      console.log(`📋 Processing ${verificationFiles.length} verification docs, ${photoFiles.length} photos, ${documentFiles.length} documents`);

      // Process verification documents by order (since we can't rely on filenames)
      for (let i = 0; i < verificationFiles.length; i++) {
        const { fileUpload } = verificationFiles[i];
        const url = uploadResults[filesToUpload.indexOf(verificationFiles[i])];

        if (url) {
          // Match by the order they were added to the upload queue
          // This assumes the order is: CNIC Front, Profile Photo, CNIC Back, License, Proof of Address
          if (i === 0) {
            verificationDocs.cnic_front_image = url;
            console.log(`📋 CNIC Front saved: ${url}`);
          } else if (i === 1) {
            verificationDocs.profile_photo = url;
            console.log(`📋 Profile Photo saved: ${url}`);
          } else if (i === 2) {
            verificationDocs.cnic_back_image = url;
            console.log(`📋 CNIC Back saved: ${url}`);
          } else if (i === 3) {
            verificationDocs.license_certificate = url;
            console.log(`📋 License saved: ${url}`);
          } else if (i === 4) {
            verificationDocs.proof_of_address = url;
            console.log(`📋 Proof of Address saved: ${url}`);
          }
        }
      }

      // Process shop photos
      for (let i = 0; i < photoFiles.length; i++) {
        const { fileUpload } = photoFiles[i];
        const url = uploadResults[filesToUpload.indexOf(photoFiles[i])];

        if (url) {
          photoUrls.push(url);
          console.log(`📋 Shop photo ${i + 1} saved: ${url}`);
        }
      }

      // Process business certificate
      for (let i = 0; i < documentFiles.length; i++) {
        const { fileUpload } = documentFiles[i];
        const url = uploadResults[filesToUpload.indexOf(documentFiles[i])];

        if (url) {
          certificateUrl = url;
          console.log(`📋 Business certificate saved: ${url}`);
        }
      }

      // Log the final verification docs object
      console.log('📋 Final verification docs object:', verificationDocs);
      console.log('📋 Final photo URLs:', photoUrls);
      console.log('📋 Final certificate URL:', certificateUrl);

      // Check if we have at least the minimum required files
      const hasMinimumFiles = cnicFront && profilePhoto && shopPhotos.length >= 2;

      if (failedUploads > 0) {
        console.warn(`${failedUploads} files failed to upload, but continuing with submission...`);

        if (failedUploads === filesToUpload.length && !hasMinimumFiles) {
          // If all files failed AND we don't have minimum required files, show options
          toast.error(`All ${failedUploads} files failed to upload. Please try again or submit without files.`, {
            duration: 8000,
            action: {
              label: "Submit Anyway",
              onClick: () => {
                setRetryCount(prev => prev + 1);
                handleSubmitWithFallback();
              }
            }
          });
          return;
        }

        if (failedUploads === filesToUpload.length) {
          toast.warning(`All ${failedUploads} files failed to upload. Submitting application without files.`, {
            duration: 6000
          });
        } else {
          toast.warning(`${failedUploads} files failed to upload but form will still be submitted.`);
        }
      }

      // Continue with normal submission if we have minimum files or some files uploaded
      if (hasMinimumFiles || completedFiles > 0) {
        await submitToDatabase(photoUrls, certificateUrl, verificationDocs);
      } else {
        // Fallback to submit without files
        await handleSubmitWithFallback();
      }

      // Show upload summary
      console.log(`Upload Summary: ${completedFiles}/${filesToUpload.length} files uploaded successfully`);
      if (completedFiles > 0) {
        toast.success(`Successfully uploaded ${completedFiles} files`);
      }

      // Update progress to show database save
      setUploadStage('Saving to database...');
      setOverallProgress(90);

      setUploadStage('Saving to database...');
      setOverallProgress(80);

      // Create provider profile
      const profileData = {
        user_id: user.id,
        business_name: formData.business_name,
        business_type: formData.business_type,
        business_address: formData.business_address,
        phone: formData.phone,
        cnic: formData.cnic,
        description: formData.description,
        shop_photos: photoUrls,
        business_certificate: certificateUrl,
        latitude: location?.lat || null,
        longitude: location?.lng || null,
        location_updated_at: location ? new Date().toISOString() : null,
        application_status: isReapplying ? 'resubmitted' : 'submitted',
        submitted_at: new Date().toISOString(),
        documents_uploaded: true,
        verified: false,
        admin_approved: false,
        rejection_reason: null,
        ...verificationDocs
      };

      // Try insert first, then update if needed
      const { error: insertError } = await supabase
        .from('provider_profiles')
        .insert(profileData);

      if (insertError) {
        console.log('Insert failed, trying update:', insertError.message);
        const { error: updateError } = await supabase
          .from('provider_profiles')
          .update(profileData)
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Update also failed:', updateError);
          throw new Error(`Database error: ${updateError.message}`);
        }
      }

      console.log('✅ Database operation completed successfully');

      setOverallProgress(100);
      console.log('✅ Application submitted successfully!');

      // Show success message with details
      const message = isReapplying
        ? "Application updated successfully! You will be notified within 24 hours."
        : `Application submitted successfully! Your application is under review. ${completedFiles > 0 ? `${completedFiles} files uploaded.` : ''}`;

      toast.success(message);

      onSubmitted();
      onClose();

    } catch (error) {
      console.error('Submission error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit application";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setOverallProgress(0);
      setUploadStage('');
    }
  };

  const handleCancel = () => {
    onClose();
    // Navigate to home page using React Router (keeps user logged in)
    navigate('/');
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Reset form data when closing
      setFormData({
        business_name: "",
        business_type: "",
        business_address: "",
        phone: "",
        cnic: "",
        description: ""
      });
      setLocation(null);
      setShopPhotos([]);
      setBusinessCertificate(null);
      setCnicFront(null);
      setCnicBack(null);
      setLicenseCertificate(null);
      setProfilePhoto(null);
      setProofOfAddress(null);

      // Call the onClose callback
      onClose();
    }
  };

  // Debug: Log when the modal should be visible
  if (isOpen) {
    console.log('✅ ProviderBusinessSetup: Modal should be visible now');
    console.log('✅ ProviderBusinessSetup: Rendering modal with isOpen:', isOpen);
    console.log('✅ ProviderBusinessSetup: isReapplying:', isReapplying);
    console.log('✅ ProviderBusinessSetup: existingProfile exists:', !!existingProfile);
    console.log('✅ ProviderBusinessSetup: isModalReady:', isModalReady);
    console.log('✅ ProviderBusinessSetup: loading:', loading);
  }

  // Only render the modal if isOpen is true
  if (!isOpen) {
    console.log('❌ ProviderBusinessSetup: Modal not rendering because isOpen is false');
    return null;
  }

  console.log('✅ ProviderBusinessSetup: Rendering modal with isOpen:', isOpen, 'isReapplying:', isReapplying);

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent
        className="max-w-6xl max-h-[95vh] overflow-y-auto bg-white dark:bg-gray-900 relative"
        style={{
          zIndex: 10000,
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
        onPointerDownOutside={(e) => {
          // Allow normal modal behavior for better UX
          // e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Allow normal modal behavior for better UX
          // e.preventDefault();
        }}
      >
        <DialogHeader className="border-b pb-4 bg-white dark:bg-gray-900">
          <DialogTitle className="text-center text-2xl font-bold text-gray-900 dark:text-white">
            {isReapplying ? "🔄 Update Your Application" : "Provider Verification Form"}
          </DialogTitle>
          <p className="text-center text-gray-600 dark:text-gray-300 mt-2">
            {isReapplying
              ? "Please review and update your information based on the rejection feedback"
              : "Complete the form below to verify your provider account"
            }
          </p>
          {isReapplying && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-3">
              <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
                <strong>🔄 Reupload Mode:</strong> Update your documents and information below, then click "Update & Resubmit Application"
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300 text-center mt-2">
                ⚠️ Your application will only be sent when you click the submit button below. Make your changes first, then submit.
              </p>
              <p className="text-xs text-green-600 dark:text-green-300 text-center mt-1 font-semibold">
                ✅ Form is ready! You can now make changes and submit when ready.
              </p>
              {!isModalReady && (
                <p className="text-xs text-orange-600 dark:text-orange-300 text-center mt-2">
                  ⏳ Loading form data... Please wait before making changes.
                </p>
              )}
            </div>
          )}
          {isReapplying && existingProfile?.rejection_reason && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs">!</span>
                </div>
                <div>
                  <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                    Application Rejected - Action Required
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Your previous application was rejected. Please update the required information and re-upload any documents that need to be corrected. All previously uploaded files can be replaced by clicking the X button and uploading new ones.
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Modal backdrop - allow interactions with form */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 pointer-events-none"
          style={{ zIndex: 9999 }}
        />

        <div className="space-y-6 mt-6 px-1">
          {/* Basic Information */}
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4 text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                Business Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business_name" className="flex items-center gap-2">
                    Business Name / Shop Name *
                    {isReapplying && changedFields.has('business_name') && (
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                        Modified
                      </span>
                    )}
                  </Label>
                  <Input
                    id="business_name"
                    placeholder="e.g. Ahmed Electronics"
                    value={formData.business_name}
                    onChange={(e) => handleInputChange('business_name', e.target.value)}
                    disabled={loading || isFormLoading}
                    className={`bg-white dark:bg-gray-800 ${
                      isReapplying && changedFields.has('business_name')
                        ? 'border-green-500 dark:border-green-400'
                        : ''
                    }`}
                  />
                  {isReapplying && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      ✏️ You can edit this field to update your business name
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_type" className="flex items-center gap-2">
                    Business Category *
                    {isReapplying && changedFields.has('business_type') && (
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                        Modified
                      </span>
                    )}
                  </Label>
                  <Select
                    value={formData.business_type}
                    onValueChange={(value) => handleInputChange('business_type', value)}
                    disabled={loading || isFormLoading}
                  >
                    <SelectTrigger className={`bg-white dark:bg-gray-800 ${
                      isReapplying && changedFields.has('business_type')
                        ? 'border-green-500 dark:border-green-400'
                        : ''
                    }`} style={{ zIndex: 10001 }}>
                      <SelectValue placeholder="Select your business category" />
                    </SelectTrigger>
                    <SelectContent style={{ zIndex: 10001 }}>
                      {serviceCategories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          <div className="flex items-center gap-2">
                            <category.icon className="h-4 w-4" />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose the category that best describes your business
                  </p>
                  {isReapplying && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      ✏️ You can change this field to update your business category
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    placeholder="e.g. +92 300 1234567"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cnic">CNIC / National ID *</Label>
                  <Input
                    id="cnic"
                    placeholder="e.g. 12345-1234567-1"
                    value={formData.cnic}
                    onChange={(e) => handleInputChange('cnic', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="business_address">Business Address *</Label>
                  <Input
                    id="business_address"
                    placeholder="Complete address with area and city"
                    value={formData.business_address}
                    onChange={(e) => handleInputChange('business_address', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Business Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell us about your business, experience, and services you offer"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Picker */}
          <LocationPicker 
            onLocationChange={handleLocationChange}
            initialAddress={formData.business_address}
          />

          {/* Verification Documents Section */}
          <Card className="border-2 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-green-900 dark:text-green-100">
                <IdCard className="h-5 w-5" />
                Verification Documents
                <span className="text-sm font-normal text-green-600 dark:text-green-400">(Required for approval)</span>
              </h3>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Important:</strong> Please upload the following documents for verification. CNIC Front Image and Profile Photo (Selfie) are required. All documents should be clear and readable.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CNIC Front Image */}
                <div className="space-y-3">
                  <Label htmlFor="cnic_front" className="flex items-center gap-2">
                    <IdCard className="h-4 w-4" />
                    CNIC Front Image *
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Upload clear image of the front side of your CNIC
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cnicFrontRef.current?.click()}
                    className="flex items-center gap-2 w-full"
                  >
                    <Upload className="h-4 w-4" />
                    Upload CNIC Front
                  </Button>
                  <input
                    ref={cnicFrontRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files, 'cnic_front')}
                    disabled={loading || isFormLoading}
                    className="hidden"
                  />
                  {cnicFront && (
                    <div className="relative">
                      <img
                        src={cnicFront.preview}
                        alt="CNIC Front Preview"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2 h-6 w-6 p-0"
                        onClick={() => removeFile('cnic_front')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <Badge
                        variant={cnicFront.uploaded ? "default" : "secondary"}
                        className="absolute bottom-2 left-2 text-xs"
                      >
                        {cnicFront.uploaded ? (isReapplying && existingProfile?.rejection_reason ? "Previously uploaded - click to replace" : "Uploaded") : "Ready"}
                      </Badge>
                      {cnicFront.uploaded && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                          <div className="bg-green-600 text-white rounded-lg p-2 flex items-center gap-2">
                            <span className="text-sm">✓ Uploaded</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* CNIC Back Image */}
                <div className="space-y-3">
                  <Label htmlFor="cnic_back" className="flex items-center gap-2">
                    <IdCard className="h-4 w-4" />
                    CNIC Back Image
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Upload clear image of the back side of your CNIC (Optional but recommended)
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cnicBackRef.current?.click()}
                    className="flex items-center gap-2 w-full"
                  >
                    <Upload className="h-4 w-4" />
                    Upload CNIC Back
                  </Button>
                  <input
                    ref={cnicBackRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files, 'cnic_back')}
                    disabled={loading || isFormLoading}
                    className="hidden"
                  />
                  {cnicBack && (
                    <div className="relative">
                      <img
                        src={cnicBack.preview}
                        alt="CNIC Back Preview"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2 h-6 w-6 p-0"
                        onClick={() => removeFile('cnic_back')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <Badge
                        variant={cnicBack.uploaded ? "default" : "secondary"}
                        className="absolute bottom-2 left-2 text-xs"
                      >
                        {cnicBack.uploaded ? (isReapplying && existingProfile?.rejection_reason ? "Previously uploaded - click to replace" : "Uploaded") : "Ready"}
                      </Badge>
                      {cnicBack.uploaded && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                          <div className="bg-green-600 text-white rounded-lg p-2 flex items-center gap-2">
                            <span className="text-sm">✓ Uploaded</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* License / Certification */}
                <div className="space-y-3">
                  <Label htmlFor="license" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    License / Certification
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Upload your business license or professional certification (Optional)
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => licenseCertificateRef.current?.click()}
                    className="flex items-center gap-2 w-full"
                  >
                    <Upload className="h-4 w-4" />
                    Upload License
                  </Button>
                  <input
                    ref={licenseCertificateRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e.target.files, 'license')}
                    disabled={loading || isFormLoading}
                    className="hidden"
                  />
                  {licenseCertificate && (
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div className="flex-1">
                        <p className="font-medium">{licenseCertificate.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(licenseCertificate.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFile('license')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Profile Photo */}
                <div className="space-y-3">
                  <Label htmlFor="profile_photo" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile Photo (Selfie) *
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Upload a clear selfie of yourself holding your CNIC (Required for verification)
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => profilePhotoRef.current?.click()}
                    className="flex items-center gap-2 w-full"
                  >
                    <Camera className="h-4 w-4" />
                    Upload Selfie
                  </Button>
                  <input
                    ref={profilePhotoRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files, 'profile')}
                    disabled={loading || isFormLoading}
                    className="hidden"
                  />
                  {profilePhoto && (
                    <div className="relative">
                      <img
                        src={profilePhoto.preview}
                        alt="Profile Photo Preview"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2 h-6 w-6 p-0"
                        onClick={() => removeFile('profile')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <Badge
                        variant={profilePhoto.uploaded ? "default" : "secondary"}
                        className="absolute bottom-2 left-2 text-xs"
                      >
                        {profilePhoto.uploaded ? (isReapplying && existingProfile?.rejection_reason ? "Previously uploaded - click to replace" : "Uploaded") : "Ready"}
                      </Badge>
                      {profilePhoto.uploaded && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                          <div className="bg-green-600 text-white rounded-lg p-2 flex items-center gap-2">
                            <span className="text-sm">✓ Uploaded</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Proof of Address */}
                <div className="space-y-3 md:col-span-2">
                  <Label htmlFor="proof_of_address" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Proof of Address
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Upload a utility bill or bank statement as proof of address (Optional)
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => proofOfAddressRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Proof of Address
                  </Button>
                  <input
                    ref={proofOfAddressRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e.target.files, 'address')}
                    disabled={loading || isFormLoading}
                    className="hidden"
                  />
                  {proofOfAddress && (
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <MapPin className="h-8 w-8 text-blue-600" />
                      <div className="flex-1">
                        <p className="font-medium">{proofOfAddress.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(proofOfAddress.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFile('address')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shop Photos */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Shop Photos *</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload at least 2 photos: front view and inside view of your shop
              </p>
              
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => shopPhotoRef.current?.click()}
                  className="flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Add Shop Photos
                </Button>
                
                <input
                  ref={shopPhotoRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files, 'photos')}
                  disabled={loading || isFormLoading}
                  className="hidden"
                />
                
                {shopPhotos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {shopPhotos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo.preview}
                          alt={`Shop photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2 h-6 w-6 p-0"
                          onClick={() => removeFile('photos', index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <Badge
                          variant={photo.uploaded ? "default" : "secondary"}
                          className="absolute bottom-2 left-2 text-xs"
                        >
                          {photo.uploaded ? (isReapplying ? "Previously uploaded - click to replace" : "Uploaded") : "Ready"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Business Certificate */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Business Registration Certificate</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your business registration certificate (optional but recommended)
              </p>
              
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => certificateRef.current?.click()}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Upload Certificate
                </Button>
                
                <input
                  ref={certificateRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload(e.target.files, 'certificate')}
                  disabled={loading || isFormLoading}
                  className="hidden"
                />
                
                {businessCertificate && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium">{businessCertificate.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(businessCertificate.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeFile('certificate')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="border-t pt-6 mt-8">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm">✓</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Ready to Submit?</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Please review all information above before submitting. Your application will be sent for admin review.
                  </p>
                  {isReapplying && changedFields.size > 0 && (
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-200 font-medium mb-2">
                        📝 Changes detected:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(changedFields).map(field => (
                          <span key={field} className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                            {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center gap-4">
              <Button variant="outline" onClick={handleCancel} className="px-8">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !isModalReady || !user}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting Application...</span>
                    </div>
                    {overallProgress > 0 && (
                      <div className="w-full max-w-xs">
                        <Progress value={overallProgress} className="h-2" />
                        <p className="text-xs text-white/80 mt-1 text-center">
                          {uploadStage || `${overallProgress}% complete`}
                        </p>
                      </div>
                    )}
                  </div>
                ) : !isModalReady ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Loading Form...
                  </div>
                ) : !user ? (
                  "Authentication Required"
                ) : isReapplying ? (
                  "Update & Resubmit Application"
                ) : (
                  "Submit for Verification"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProviderBusinessSetup;