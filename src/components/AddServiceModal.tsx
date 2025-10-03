import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { serviceCategories } from "@/data/serviceCategories";

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServiceAdded: () => void;
  providerProfile: any;
  servicesCount: number;
}


const AddServiceModal = ({ isOpen, onClose, onServiceAdded, providerProfile, servicesCount }: AddServiceModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    base_price: "",
    duration_hours: "",
    service_area: [] as string[],
    price_negotiable: true
  });


  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validation
    if (!formData.title || !formData.description || !formData.category || !formData.base_price) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (parseFloat(formData.base_price) <= 0) {
      toast.error("Base price must be greater than 0");
      return;
    }
    
    setLoading(true);
    
    try {
      const serviceData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        base_price: parseFloat(formData.base_price),
        duration_hours: formData.duration_hours ? parseInt(formData.duration_hours) : null,
        price_negotiable: formData.price_negotiable,
        provider_id: user.id,
        is_active: true, // Show as pending approval initially
        admin_approved: false // Will be approved by admin
      };
      
      const { error } = await supabase
        .from('services')
        .insert(serviceData);
      
      if (error) {
        console.error('Service creation error:', error);
        toast.error("Failed to create service");
        return;
      }
      
      toast.success("Service created! It will be active after admin approval.");
      onServiceAdded();
      onClose();
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "",
        base_price: "",
        duration_hours: "",
        service_area: [],
        price_negotiable: true
      });
      
    } catch (error) {
      console.error('Service creation error:', error);
      toast.error("Failed to create service");
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            Add New Service
          </DialogTitle>
        </DialogHeader>

          <div className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Service Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Home Electrical Repair"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceCategories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="base_price">Base Price (PKR) *</Label>
                <Input
                  id="base_price"
                  type="number"
                  placeholder="e.g. 2000"
                  value={formData.base_price}
                  onChange={(e) => handleInputChange('base_price', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duration_hours">Duration (Hours)</Label>
                <Input
                  id="duration_hours"
                  type="number"
                  placeholder="e.g. 2"
                  value={formData.duration_hours}
                  onChange={(e) => handleInputChange('duration_hours', e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Service Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your service, what's included, and any special requirements"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Price Negotiable</Label>
                <p className="text-sm text-muted-foreground">Allow customers to negotiate the price</p>
              </div>
              <Switch
                checked={formData.price_negotiable}
                onCheckedChange={(checked) => handleInputChange('price_negotiable', checked)}
              />
            </div>

            <div className="flex justify-end gap-4 pt-6">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Creating..." : "Create Service"}
              </Button>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddServiceModal;