import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  Save,
  Edit,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  HelpCircle,
  Shield,
  Monitor
} from "lucide-react";

interface ContentSection {
  id: string;
  section_key: string;
  title: string;
  content: string;
  content_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ContactInfo {
  id: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Policy {
  id: string;
  policy_key: string;
  title: string;
  content: string;
  version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// React Quill toolbar configuration
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'color': [] }, { 'background': [] }],
    ['link'],
    ['clean']
  ],
};

const quillFormats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'color', 'background', 'link'
];

const ContentManagement = () => {
  const [contentSections, setContentSections] = useState<ContentSection[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadAllContent();
  }, []);

  const loadAllContent = async () => {
    try {
      setLoading(true);

      // Load content sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('content_sections')
        .select('*')
        .order('created_at');

      if (sectionsError) throw sectionsError;
      setContentSections(sectionsData || []);

      // Load contact information
      const { data: contactData, error: contactError } = await supabase
        .from('contact_information')
        .select('*')
        .eq('is_active', true)
        .single();

      if (contactError && contactError.code !== 'PGRST116') throw contactError;
      setContactInfo(contactData || null);

      // Load FAQs
      const { data: faqsData, error: faqsError } = await supabase
        .from('faqs')
        .select('*')
        .order('sort_order');

      if (faqsError) throw faqsError;
      setFaqs(faqsData || []);

      // Load policies
      const { data: policiesData, error: policiesError } = await supabase
        .from('policies')
        .select('*')
        .order('created_at');

      if (policiesError) throw policiesError;
      setPolicies(policiesData || []);

    } catch (error: any) {
      console.error('Error loading content:', error);
      toast.error('Failed to load content: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: any, type: string) => {
    setEditingId(item.id);
    setEditForm({ ...item, type });
  };

  const handleSave = async () => {
    try {
      const { type, ...updateData } = editForm;

      let tableName = '';
      switch (type) {
        case 'content':
          tableName = 'content_sections';
          break;
        case 'contact':
          tableName = 'contact_information';
          break;
        case 'faq':
          tableName = 'faqs';
          break;
        case 'policy':
          tableName = 'policies';
          break;
        default:
          throw new Error('Invalid type');
      }

      const { error } = await (supabase as any)
        .from(tableName)
        .update(updateData)
        .eq('id', editingId);

      if (error) throw error;

      toast.success('Content updated successfully');
      setEditingId(null);
      setEditForm({});
      loadAllContent();
    } catch (error: any) {
      console.error('Error updating content:', error);
      toast.error('Failed to update content: ' + error.message);
    }
  };

  const handleToggleActive = async (id: string, type: string, currentStatus: boolean) => {
    try {
      let tableName = '';
      switch (type) {
        case 'content':
          tableName = 'content_sections';
          break;
        case 'contact':
          tableName = 'contact_information';
          break;
        case 'faq':
          tableName = 'faqs';
          break;
        case 'policy':
          tableName = 'policies';
          break;
        default:
          throw new Error('Invalid type');
      }

      const { error } = await (supabase as any)
        .from(tableName)
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Content ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      loadAllContent();
    } catch (error: any) {
      console.error('Error toggling content:', error);
      toast.error('Failed to toggle content: ' + error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Content Management</h2>
          <p className="text-muted-foreground">
            Manage website content, contact information, FAQs, and policies
          </p>
        </div>
      </div>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">Content Sections</TabsTrigger>
          <TabsTrigger value="contact">Contact Info</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        {/* Content Sections Tab */}
        <TabsContent value="content" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Content Sections</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Monitor className="h-4 w-4 mr-2" />
              {previewMode ? 'Edit Mode' : 'Preview Mode'}
            </Button>
          </div>

          <div className="grid gap-4">
            {contentSections.map((section) => (
              <Card key={section.id}>
                <CardContent className="p-6">
                  {editingId === section.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="title">Title</Label>
                          <Input
                            id="title"
                            value={editForm.title || ''}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="section_key">Section Key</Label>
                          <Input
                            id="section_key"
                            value={editForm.section_key || ''}
                            onChange={(e) => setEditForm({ ...editForm, section_key: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="content">Content</Label>
                        <div className="border rounded-md">
                          <ReactQuill
                            theme="snow"
                            value={editForm.content || ''}
                            onChange={(value) => setEditForm({ ...editForm, content: value })}
                            modules={quillModules}
                            formats={quillFormats}
                            style={{ minHeight: '200px' }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button variant="outline" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{section.title}</h3>
                            <Badge variant={section.is_active ? "default" : "secondary"}>
                              {section.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline">{section.section_key}</Badge>
                          </div>

                          {previewMode ? (
                            <div
                              className="prose max-w-none"
                              dangerouslySetInnerHTML={{ __html: section.content }}
                            />
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              <p className="text-xs mb-2">Raw Content:</p>
                              <p className="whitespace-pre-line bg-gray-50 p-3 rounded text-xs">
                                {section.content}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(section, 'content')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(section.id, 'content', section.is_active)}
                          >
                            {section.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Contact Information Tab */}
        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              {editingId === 'contact' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={editForm.email || ''}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={editForm.phone || ''}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={editForm.address || ''}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={editForm.website || ''}
                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Contact Information</h3>
                    <Button
                      variant="outline"
                      onClick={() => handleEdit(contactInfo || {}, 'contact')}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>

                  {contactInfo ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">Email</p>
                          <p className="text-sm text-muted-foreground">{contactInfo.email || 'Not set'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">Phone</p>
                          <p className="text-sm text-muted-foreground">{contactInfo.phone || 'Not set'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="font-medium">Address</p>
                          <p className="text-sm text-muted-foreground">{contactInfo.address || 'Not set'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium">Website</p>
                          <p className="text-sm text-muted-foreground">{contactInfo.website || 'Not set'}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No contact information found.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQs Tab */}
        <TabsContent value="faqs" className="space-y-4">
          <div className="grid gap-4">
            {faqs.map((faq) => (
              <Card key={faq.id}>
                <CardContent className="p-6">
                  {editingId === faq.id ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="question">Question</Label>
                        <Input
                          id="question"
                          value={editForm.question || ''}
                          onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="answer">Answer</Label>
                        <Textarea
                          id="answer"
                          rows={3}
                          value={editForm.answer || ''}
                          onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Input
                            id="category"
                            value={editForm.category || ''}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="sort_order">Sort Order</Label>
                          <Input
                            id="sort_order"
                            type="number"
                            value={editForm.sort_order || 0}
                            onChange={(e) => setEditForm({ ...editForm, sort_order: parseInt(e.target.value) })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button variant="outline" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <HelpCircle className="h-5 w-5 text-blue-600" />
                            <h3 className="font-semibold">{faq.question}</h3>
                            <Badge variant={faq.is_active ? "default" : "secondary"}>
                              {faq.is_active ? "Active" : "Inactive"}
                            </Badge>
                            {faq.category && (
                              <Badge variant="outline">{faq.category}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {faq.answer}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Sort Order: {faq.sort_order}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(faq, 'faq')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(faq.id, 'faq', faq.is_active)}
                          >
                            {faq.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <div className="grid gap-4">
            {policies.map((policy) => (
              <Card key={policy.id}>
                <CardContent className="p-6">
                  {editingId === policy.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="title">Title</Label>
                          <Input
                            id="title"
                            value={editForm.title || ''}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="policy_key">Policy Key</Label>
                          <Input
                            id="policy_key"
                            value={editForm.policy_key || ''}
                            onChange={(e) => setEditForm({ ...editForm, policy_key: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="version">Version</Label>
                          <Input
                            id="version"
                            value={editForm.version || ''}
                            onChange={(e) => setEditForm({ ...editForm, version: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="content">Content</Label>
                        <div className="border rounded-md">
                          <ReactQuill
                            theme="snow"
                            value={editForm.content || ''}
                            onChange={(value) => setEditForm({ ...editForm, content: value })}
                            modules={quillModules}
                            formats={quillFormats}
                            style={{ minHeight: '300px' }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button variant="outline" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="h-5 w-5 text-green-600" />
                            <h3 className="font-semibold">{policy.title}</h3>
                            <Badge variant={policy.is_active ? "default" : "secondary"}>
                              {policy.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline">{policy.version}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Key: {policy.policy_key}
                          </p>

                          {previewMode ? (
                            <div
                              className="prose max-w-none"
                              dangerouslySetInnerHTML={{ __html: policy.content }}
                            />
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              <p className="text-xs mb-2">Raw Content:</p>
                              <p className="whitespace-pre-line bg-gray-50 p-3 rounded text-xs">
                                {policy.content}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(policy, 'policy')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(policy.id, 'policy', policy.is_active)}
                          >
                            {policy.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentManagement;