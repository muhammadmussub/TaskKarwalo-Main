import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { serviceCategories } from "@/data/serviceCategories";
import { AlertTriangle } from "lucide-react";

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  base_price: number;
  duration_hours?: number;
  price_negotiable: boolean;
  is_active: boolean;
  admin_approved: boolean;
}

interface EditServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServiceUpdated: () => void;
  service: Service | null;
}


const EditServiceModal = ({ isOpen, onClose, onServiceUpdated, service }: EditServiceModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isCommissionDue, setIsCommissionDue] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    base_price: "",
    duration_hours: "",
    price_negotiable: true,
    is_active: true
  });

  // Populate form when service changes
  useEffect(() => {
    if (service) {
      setFormData({
        title: service.title,
        description: service.description,
        category: service.category,
        base_price: service.base_price.toString(),
        duration_hours: service.duration_hours ? service.duration_hours.toString() : "",
        price_negotiable: service.price_negotiable,
        is_active: service.is_active
      });
    }
  }, [service]);

  // Check commission status when modal opens
  useEffect(() => {
    if (isOpen && user) {
      checkCommissionStatus();
    }
  }, [isOpen, user]);

  const checkCommissionStatus = async () => {
    if (!user) return;

    try {
      // Get provider's bookings to calculate commission status
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('status, completed_at, final_price, proposed_price')
        .eq('provider_id', user.id);

      if (error) {
        console.error('Error checking commission status:', error);
        return;
      }

      if (bookings) {
        const completedJobsCount = bookings.filter(booking => booking.status === 'completed').length;
        const jobsSinceLastCommission = completedJobsCount % 5;
        const commissionDue = completedJobsCount > 0 && jobsSinceLastCommission === 0;

        setIsCommissionDue(commissionDue);
      }
    } catch (error) {
      console.error('Error checking commission status:', error);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!user || !service) return;

    // Validation
    if (!formData.title || !formData.description || !formData.category || !formData.base_price) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (parseFloat(formData.base_price) <= 0) {
      toast.error("Base price must be greater than 0");
      return;
    }

    // Prevent activating service when commission is due
    if (formData.is_active && isCommissionDue) {
      toast.error("Cannot activate service - Commission payment is due. Please pay your commission to reactivate services.");
      // Automatically set to inactive to maintain consistency
      setFormData(prev => ({ ...prev, is_active: false }));
      return;
    }

    setLoading(true);

    try {
      // Check if service was rejected (admin_approved: false and is_active: false)
      const wasRejected = !service.admin_approved && !service.is_active;

      const serviceData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        base_price: parseFloat(formData.base_price),
        duration_hours: formData.duration_hours ? parseInt(formData.duration_hours) : null,
        price_negotiable: formData.price_negotiable,
        is_active: formData.is_active,
        // If service was rejected, reset to pending approval for admin review
        ...(wasRejected && {
          admin_approved: false,
          is_active: true,
          updated_at: new Date().toISOString()
        })
      };

      const { error } = await supabase
        .from('services')
        .update(serviceData)
        .eq('id', service.id);

      if (error) {
        console.error('Service update error:', error);
        toast.error("Failed to update service");
        return;
      }

      if (wasRejected) {
        toast.success("Service updated and sent back for admin approval!");
      } else {
        toast.success("Service updated successfully!");
      }

      onServiceUpdated();
      onClose();

    } catch (error) {
      console.error('Service update error:', error);
      toast.error("Failed to update service");
    } finally {
      setLoading(false);
    }
  };

  if (!service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            Edit Service
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

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Service Active</Label>
              <p className="text-sm text-muted-foreground">Make service visible to customers</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              disabled={!service.admin_approved || isCommissionDue} // Disable if not approved OR commission is due
            />
          </div>

          {/* Commission Due Warning */}
          {isCommissionDue && (
            <div className="bg-red-900/20 border border-red-600 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-red-400 text-sm font-semibold mb-1">Commission Payment Required</div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Your services are currently inactive because commission payment is due. You cannot activate services until the commission is paid and approved by admin.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!service.admin_approved && (
            <div className={`border rounded-lg p-3 ${
              !service.is_active
                ? 'bg-red-50 border-red-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <p className={`text-sm ${
                !service.is_active
                  ? 'text-red-800'
                  : 'text-yellow-800'
              }`}>
                {service.is_active
                  ? "This service is pending admin approval. You can edit details, but it won't be visible to customers until approved."
                  : "This service was rejected by admin. After editing, it will be sent back for admin approval again."
                }
              </p>
            </div>
          )}

          <div className="flex justify-end gap-4 pt-6">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Updating..." : "Update Service"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditServiceModal;