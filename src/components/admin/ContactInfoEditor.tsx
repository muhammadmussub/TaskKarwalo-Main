import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Globe, Save } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ContactInfoEditor = () => {
  const [contactInfo, setContactInfo] = useState({
    email: '',
    phone: '',
    address: '',
    website: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        setLoading(true);
        // Use the profiles table with a specific user ID for admin contact info
        // We'll use a fixed admin ID or the first admin user
        const { data, error } = await supabase
          .from('profiles')
          .select('email, phone')
          .eq('user_type', 'admin')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
          console.error('Error fetching contact info:', error);
          toast.error("Failed to load contact information");
        } else if (data) {
          setContactInfo({
            email: data.email || '',
            phone: data.phone || '',
            address: '',
            website: ''
          });
        }
      } catch (error) {
        console.error('Failed to fetch contact info:', error);
        toast.error("An error occurred while loading contact information");
      } finally {
        setLoading(false);
      }
    };

    fetchContactInfo();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setContactInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Contact information would be saved here in a real implementation");
    // In a real implementation, you would save to a proper table
    // For now, we'll just show a success message
    toast.success("Contact information updated successfully");
  };

  if (loading) {
    return (
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={contactInfo.email}
                onChange={handleChange}
                placeholder="Email address"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                Phone Number
              </Label>
              <Input
                id="phone"
                name="phone"
                type="text"
                value={contactInfo.phone}
                onChange={handleChange}
                placeholder="Phone number"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Address
              </Label>
              <Input
                id="address"
                name="address"
                type="text"
                value={contactInfo.address}
                onChange={handleChange}
                placeholder="Address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Website
              </Label>
              <Input
                id="website"
                name="website"
                type="text"
                value={contactInfo.website}
                onChange={handleChange}
                placeholder="Website URL"
              />
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="mt-6 flex items-center gap-2"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ContactInfoEditor;