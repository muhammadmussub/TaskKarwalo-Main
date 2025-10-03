import React, { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, Globe, Shield, FileText, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

interface ContentSection {
  id: string;
  section_key: string;
  title: string;
  content: string;
  content_type: string;
  is_active: boolean;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_active: boolean;
}

interface Policy {
  id: string;
  policy_key: string;
  title: string;
  content: string;
  version: string;
  is_active: boolean;
}

const AboutPage = () => {
  const [contactInfo, setContactInfo] = useState({
    email: 'contact@tasktap.com',
    phone: '+92 300 1234567',
    address: 'Islamabad, Pakistan',
    website: 'www.tasktap.com'
  });
  const [contentSections, setContentSections] = useState<ContentSection[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all content from database
    const fetchAllContent = async () => {
      try {
        setLoading(true);

        // Fetch contact information
        const { data: contactData, error: contactError } = await supabase
          .from('contact_information')
          .select('*')
          .eq('is_active', true)
          .single();

        if (contactError) {
          console.error('Error fetching contact info:', contactError);
        } else if (contactData) {
          setContactInfo({
            email: contactData.email || contactInfo.email,
            phone: contactData.phone || contactInfo.phone,
            address: contactData.address || contactInfo.address,
            website: contactData.website || contactInfo.website
          });
        }

        // Fetch content sections
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('content_sections')
          .select('*')
          .eq('is_active', true)
          .in('section_key', ['about_main', 'project_info']);

        if (sectionsError) {
          console.error('Error fetching content sections:', sectionsError);
        } else {
          setContentSections(sectionsData || []);
        }

        // Fetch FAQs
        const { data: faqsData, error: faqsError } = await supabase
          .from('faqs')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');

        if (faqsError) {
          console.error('Error fetching FAQs:', faqsError);
        } else {
          setFaqs(faqsData || []);
        }

        // Fetch policies
        const { data: policiesData, error: policiesError } = await supabase
          .from('policies')
          .select('*')
          .eq('is_active', true)
          .in('policy_key', ['privacy_policy', 'terms_of_service', 'user_guidelines']);

        if (policiesError) {
          console.error('Error fetching policies:', policiesError);
        } else {
          setPolicies(policiesData || []);
        }

      } catch (error) {
        console.error('Failed to fetch content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllContent();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Navigation onOpenAuth={() => {}} />

      {/* Page Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-8">About TaskKarwalo</h1>
          
          <div className="prose max-w-none mb-12">
            {contentSections
              .filter(section => section.section_key === 'about_main')
              .map(section => (
                <div key={section.id}>
                  <p className="text-lg text-gray-700 mb-6 whitespace-pre-line">
                    {section.content}
                  </p>
                </div>
              ))}
          </div>

          {/* Contact Information */}
          <Card className="mb-12">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">Email</h3>
                    <p className="text-gray-600">{contactInfo.email}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">Phone</h3>
                    <p className="text-gray-600">{contactInfo.phone}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">Address</h3>
                    <p className="text-gray-600">{contactInfo.address}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">Website</h3>
                    <p className="text-gray-600">{contactInfo.website}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Policies and Support */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Policies</h2>
                </div>
                <ul className="space-y-3">
                  <li>
                    <Button variant="link" className="p-0 h-auto text-gray-700 hover:text-primary">
                      Privacy Policy
                    </Button>
                  </li>
                  <li>
                    <Button variant="link" className="p-0 h-auto text-gray-700 hover:text-primary">
                      Terms of Service
                    </Button>
                  </li>
                  <li>
                    <Button variant="link" className="p-0 h-auto text-gray-700 hover:text-primary">
                      User Guidelines
                    </Button>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Support</h2>
                </div>
                <ul className="space-y-3">
                  <li>
                    <Button variant="link" className="p-0 h-auto text-gray-700 hover:text-primary">
                      FAQ
                    </Button>
                  </li>
                  <li>
                    <Button variant="link" className="p-0 h-auto text-gray-700 hover:text-primary">
                      Contact Support
                    </Button>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Project Information */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Project Information</h2>
              </div>
              <div className="prose max-w-none">
                {contentSections
                  .filter(section => section.section_key === 'project_info')
                  .map(section => (
                    <p key={section.id} className="mb-4">
                      {section.content}
                    </p>
                  ))}
                <Separator className="my-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Version</h3>
                    <p className="text-gray-700">1.0.0</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Released</h3>
                    <p className="text-gray-700">September 2024</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Built with</h3>
                    <p className="text-gray-700">React, TypeScript, Supabase</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Platform</h3>
                    <p className="text-gray-700">Web, Mobile Responsive</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default AboutPage;