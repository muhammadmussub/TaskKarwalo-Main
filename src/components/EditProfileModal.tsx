import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LocationPicker from "./LocationPicker";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: () => void;
  providerProfile: any;
}

const EditProfileModal = ({ isOpen, onClose, onProfileUpdated, providerProfile }: EditProfileModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    business_name: "",
    business_type: "",
    business_address: "",
    phone: "",
    description: ""
  });

  // Location state
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (providerProfile) {
      console.log('Loading profile data:', providerProfile);
      setFormData({
        business_name: providerProfile.business_name || "",
        business_type: providerProfile.business_type || "",
        business_address: providerProfile.business_address || "",
        phone: providerProfile.phone || "",
        description: providerProfile.description || ""
      });

      // Load location if available
      if (providerProfile.latitude && providerProfile.longitude) {
        setLocation({
          lat: providerProfile.latitude,
          lng: providerProfile.longitude
        });
      }
    }
  }, [providerProfile, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (lat: number, lng: number, address: string) => {
    setLocation({ lat, lng });
    setFormData(prev => ({ ...prev, business_address: address }));
  };

  const handleSubmit = async () => {
    if (!user || !providerProfile) {
      console.log('Debug: Missing user or providerProfile', { user: !!user, providerProfile: !!providerProfile });
      toast.error("Missing profile data");
      return;
    }
    
    // Validation
    if (!formData.business_name || !formData.business_type || !formData.business_address || !formData.phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    console.log('Debug: Attempting to update profile', { userId: user.id, formData });
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('provider_profiles')
        .update({
          business_name: formData.business_name,
          business_type: formData.business_type,
          business_address: formData.business_address,
          phone: formData.phone,
          description: formData.description,
          latitude: location?.lat || null,
          longitude: location?.lng || null,
          location_updated_at: location ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Profile update error:', error);
        toast.error("Failed to update profile: " + error.message);
        return;
      }
      
      console.log('Debug: Profile updated successfully');
      toast.success("Profile updated successfully!");
      onProfileUpdated();
      onClose();
      
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            Edit Business Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                placeholder="e.g. Ahmed Electronics"
                value={formData.business_name}
                onChange={(e) => handleInputChange('business_name', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="business_type">Business Type *</Label>
              <Input
                id="business_type"
                placeholder="e.g. Electrician, Plumber, Salon"
                value={formData.business_type}
                onChange={(e) => handleInputChange('business_type', e.target.value)}
              />
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
              <Label htmlFor="business_address">Business Address *</Label>
              <Input
                id="business_address"
                placeholder="Complete address with area and city"
                value={formData.business_address}
                onChange={(e) => handleInputChange('business_address', e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Business Description</Label>
            <Textarea
              id="description"
              placeholder="Tell us about your business, experience, and services you offer"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Location Picker */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Business Location</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Mark your business location on the map. This helps customers find you easily.
              </p>
              <LocationPicker
                onLocationChange={handleLocationChange}
                initialAddress={formData.business_address}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 pt-6">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Updating..." : "Update Profile"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;