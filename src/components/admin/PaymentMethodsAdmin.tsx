import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Plus, 
  Eye, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Search,
  RefreshCw,
  Download
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";

interface PaymentMethod {
  id: string;
  method_name: string;
  display_name: string;
  account_details: string;
  instructions?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CommissionPayment {
  id: string;
  provider_id: string;
  amount: number;
  payment_method: string;
  screenshot_url: string;
  booking_count: number;
  status: string;
  rejection_reason?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  provider_name?: string;
  provider_email?: string;
  provider_business?: string;
  reviewer_name?: string;
}

const PaymentMethodsAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState("payment-methods");
  
  // Payment Methods State
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [methodForm, setMethodForm] = useState({
    method_name: '',
    display_name: '',
    account_details: '',
    instructions: '',
    is_active: true
  });

  // Commission Payments State
  const [commissionPayments, setCommissionPayments] = useState<CommissionPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<CommissionPayment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  useEffect(() => {
    if (activeTab === "payment-methods") {
      fetchPaymentMethods();
    } else {
      fetchCommissionPayments();
    }
  }, [activeTab]);

  // Fetch payment methods
  const fetchPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);

      // First check if user is admin
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (userError) {
        console.error('Error checking user type:', userError);
        toast.error('Authentication error. Please make sure you are logged in as an admin.');
        return;
      }

      if (userProfile?.user_type !== 'admin') {
        toast.error('Only administrators can access payment methods');
        return;
      }

      const { data, error } = await (supabase as any)
        .from('payment_methods')
        .select('*')
        .order('display_name');

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Payment methods loaded:', data);
      setPaymentMethods(data || []);
    } catch (error: any) {
      console.error('Error fetching payment methods:', error);
      toast.error(`Failed to load payment methods: ${error.message || 'Unknown error'}`);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  // Fetch commission payments
  const fetchCommissionPayments = async () => {
    try {
      setLoadingPayments(true);

      // First check if the view exists by trying to query it
      const { data, error } = await (supabase as any)
        .from('commission_payments_view')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) {
        // If the view doesn't exist, show a helpful message
        if (error.message.includes('does not exist') || error.message.includes('not a table')) {
          console.log('Commission payments view does not exist yet. Please run the commission view SQL script in your Supabase dashboard.');
          toast.error('Commission payments view not found. Please run the commission view SQL script in your Supabase dashboard first.');
          setCommissionPayments([]);
          return;
        }
        throw error;
      }

      setCommissionPayments(data || []);
    } catch (error: any) {
      console.error('Error fetching commission payments:', error);
      if (!error.message.includes('does not exist') && !error.message.includes('not a table')) {
        toast.error('Failed to load commission payments');
      }
      setCommissionPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Handle adding/editing payment method
  const handleSavePaymentMethod = async () => {
    try {
      if (!methodForm.method_name || !methodForm.display_name || !methodForm.account_details) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Check if user is admin
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (userError) {
        console.error('Error checking user type:', userError);
        toast.error('Authentication error. Please make sure you are logged in as an admin.');
        return;
      }

      if (userProfile?.user_type !== 'admin') {
        toast.error('Only administrators can manage payment methods');
        return;
      }

      if (editingMethod) {
        // Update existing method
        const { error } = await (supabase as any)
          .from('payment_methods')
          .update({
            method_name: methodForm.method_name,
            display_name: methodForm.display_name,
            account_details: methodForm.account_details,
            instructions: methodForm.instructions,
            is_active: methodForm.is_active,
          })
          .eq('id', editingMethod.id);

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        toast.success('Payment method updated successfully');
      } else {
        // Add new method
        const { error } = await (supabase as any)
          .from('payment_methods')
          .insert({
            method_name: methodForm.method_name,
            display_name: methodForm.display_name,
            account_details: methodForm.account_details,
            instructions: methodForm.instructions,
            is_active: methodForm.is_active,
          });

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        toast.success('Payment method added successfully');
      }

      // Reset form and close modal
      setShowAddEditModal(false);
      setEditingMethod(null);
      resetMethodForm();
      fetchPaymentMethods();
    } catch (error: any) {
      console.error('Error saving payment method:', error);
      toast.error(`Failed to save payment method: ${error.message || 'Unknown error'}`);
    }
  };

  // Handle deleting payment method
  const handleDeletePaymentMethod = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Payment method deleted successfully');
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast.error('Failed to delete payment method');
    }
  };

  // Handle toggling payment method active status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('payment_methods')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Payment method ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error toggling payment method status:', error);
      toast.error('Failed to update payment method status');
    }
  };

  // Handle approving/rejecting commission payment
  const handleReviewPayment = async (id: string, status: 'approved' | 'rejected') => {
    try {
      if (status === 'rejected' && !rejectionReason) {
        toast.error('Please provide a reason for rejection');
        return;
      }

      const { error } = await (supabase as any)
        .from('commission_payments')
        .update({
          status,
          rejection_reason: status === 'rejected' ? rejectionReason : null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Commission payment ${status} successfully`);
      setShowPaymentDetailsModal(false);
      setSelectedPayment(null);
      setRejectionReason('');
      fetchCommissionPayments();
    } catch (error) {
      console.error('Error reviewing commission payment:', error);
      toast.error('Failed to review commission payment');
    }
  };

  // Reset payment method form
  const resetMethodForm = () => {
    setMethodForm({
      method_name: '',
      display_name: '',
      account_details: '',
      instructions: '',
      is_active: true
    });
  };

  // Edit payment method
  const editPaymentMethod = (method: PaymentMethod) => {
    setEditingMethod(method);
    setMethodForm({
      method_name: method.method_name,
      display_name: method.display_name,
      account_details: method.account_details,
      instructions: method.instructions || '',
      is_active: method.is_active
    });
    setShowAddEditModal(true);
  };

  // View commission payment details
  const viewPaymentDetails = (payment: CommissionPayment) => {
    setSelectedPayment(payment);
    setShowPaymentDetailsModal(true);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR'
    }).format(amount);
  };

  // Debug function to test database connection
  const testDatabaseConnection = async () => {
    try {
      console.log('Testing database connection...');

      // Test if payment_methods table exists
      const { data: testData, error: testError } = await (supabase as any)
        .from('payment_methods')
        .select('count', { count: 'exact', head: true });

      if (testError) {
        console.error('Database connection test failed:', testError);
        toast.error(`Database connection failed: ${testError.message}`);
        return;
      }

      console.log('Database connection successful. Payment methods count:', testData);
      toast.success('Database connection successful');

      // Refresh data
      fetchPaymentMethods();
    } catch (error: any) {
      console.error('Database test error:', error);
      toast.error(`Database test failed: ${error.message}`);
    }
  };

  // Filter payments by search term and status
  const filteredPayments = commissionPayments.filter(payment => {
    const matchesSearch =
      (payment.provider_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
      (payment.provider_email?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
      (payment.provider_business?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
      payment.payment_method.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Payment Settings</h2>
        <div className="flex gap-2">
          <Button
            onClick={testDatabaseConnection}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            Test DB
          </Button>
          <Button
            onClick={() => {
              if (activeTab === "payment-methods") {
                fetchPaymentMethods();
              } else {
                fetchCommissionPayments();
              }
            }}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="commission-payments">Commission Payments</TabsTrigger>
        </TabsList>
        
        {/* Payment Methods Tab */}
        <TabsContent value="payment-methods" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Manage Payment Methods</h3>
            <Button 
              onClick={() => {
                resetMethodForm();
                setEditingMethod(null);
                setShowAddEditModal(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Method
            </Button>
          </div>
          
          {loadingPaymentMethods ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Method Name</TableHead>
                    <TableHead>Account Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentMethods.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No payment methods found. Add your first payment method to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paymentMethods.map((method) => (
                      <TableRow key={method.id}>
                        <TableCell className="font-medium">{method.display_name}</TableCell>
                        <TableCell>{method.method_name}</TableCell>
                        <TableCell className="max-w-xs truncate">{method.account_details.split('\n')[0]}</TableCell>
                        <TableCell>
                          {method.is_active ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(method.updated_at)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => editPaymentMethod(method)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(method.id, method.is_active)}>
                                {method.is_active ? (
                                  <>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this payment method?')) {
                                    handleDeletePaymentMethod(method.id);
                                  }
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        
        {/* Commission Payments Tab */}
        <TabsContent value="commission-payments" className="space-y-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <h3 className="text-xl font-semibold">Commission Payment History</h3>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="flex-shrink-0">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>
          
          {loadingPayments ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No commission payments found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          <div>{payment.provider_name || 'Unknown'}</div>
                          {payment.provider_business && (
                            <div className="text-xs text-muted-foreground">{payment.provider_business}</div>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{payment.payment_method}</TableCell>
                        <TableCell>
                          {payment.status === 'pending' && (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                              Pending
                            </Badge>
                          )}
                          {payment.status === 'approved' && (
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                              Approved
                            </Badge>
                          )}
                          {payment.status === 'rejected' && (
                            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                              Rejected
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(payment.submitted_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewPaymentDetails(payment)}
                            className="h-8 px-2"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Add/Edit Payment Method Modal */}
      <Dialog open={showAddEditModal} onOpenChange={setShowAddEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
            <DialogDescription>
              {editingMethod 
                ? 'Update the payment method details below.'
                : 'Add a new payment method for providers to use for commission payments.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={methodForm.display_name}
                onChange={(e) => setMethodForm({...methodForm, display_name: e.target.value})}
                placeholder="e.g. EasyPaisa"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="method_name">Method Name (ID)</Label>
              <Input
                id="method_name"
                value={methodForm.method_name}
                onChange={(e) => setMethodForm({...methodForm, method_name: e.target.value})}
                placeholder="e.g. easypaisa (lowercase, no spaces)"
              />
              <p className="text-xs text-muted-foreground">
                Used as an identifier, should be lowercase with no spaces.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="account_details">Account Details</Label>
              <Textarea
                id="account_details"
                value={methodForm.account_details}
                onChange={(e) => setMethodForm({...methodForm, account_details: e.target.value})}
                placeholder="Account Title: Example\nPhone: 0300-1234567"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Enter the account details that providers should use for payment. Use line breaks for multiple lines.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions (Optional)</Label>
              <Textarea
                id="instructions"
                value={methodForm.instructions}
                onChange={(e) => setMethodForm({...methodForm, instructions: e.target.value})}
                placeholder="Send payment to the account and upload screenshot as proof."
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={methodForm.is_active}
                onCheckedChange={(checked) => setMethodForm({...methodForm, is_active: checked})}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddEditModal(false);
                resetMethodForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSavePaymentMethod}
              className="bg-[hsl(210,100%,65%)] text-white hover:bg-[hsl(210,100%,70%)]"
            >
              {editingMethod ? 'Update Method' : 'Add Method'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Payment Details Modal */}
      <Dialog open={showPaymentDetailsModal} onOpenChange={setShowPaymentDetailsModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Commission Payment Details</DialogTitle>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{formatCurrency(selectedPayment.amount)}</h3>
                    <p className="text-sm text-muted-foreground">
                      Submitted on {formatDate(selectedPayment.submitted_at)}
                    </p>
                  </div>
                  <div>
                    {selectedPayment.status === 'pending' && (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                        Pending Review
                      </Badge>
                    )}
                    {selectedPayment.status === 'approved' && (
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                        Approved
                      </Badge>
                    )}
                    {selectedPayment.status === 'rejected' && (
                      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                        Rejected
                      </Badge>
                    )}
                  </div>
                </div>
                
                {selectedPayment.reviewed_at && (
                  <p className="text-xs text-muted-foreground">
                    {selectedPayment.status === 'approved' ? 'Approved' : 'Rejected'} on {formatDate(selectedPayment.reviewed_at)} 
                    {selectedPayment.reviewer_name && ` by ${selectedPayment.reviewer_name}`}
                  </p>
                )}
                
                {selectedPayment.rejection_reason && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                    <p className="font-medium">Rejection Reason:</p>
                    <p>{selectedPayment.rejection_reason}</p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Provider Information</h4>
                  <div className="rounded-md border p-3 bg-muted/10">
                    <p className="font-medium">{selectedPayment.provider_name || 'Unknown'}</p>
                    {selectedPayment.provider_business && (
                      <p className="text-sm">{selectedPayment.provider_business}</p>
                    )}
                    {selectedPayment.provider_email && (
                      <p className="text-sm text-muted-foreground">{selectedPayment.provider_email}</p>
                    )}
                    <p className="text-xs mt-1">Jobs since last payment: {selectedPayment.booking_count}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Payment Method</h4>
                  <div className="rounded-md border p-3 bg-muted/10">
                    <p className="font-medium">{selectedPayment.payment_method}</p>
                    {selectedPayment.payment_method_details ? (
                      <>
                        <p className="text-sm">{selectedPayment.payment_method_details.display_name}</p>
                        <p className="text-xs whitespace-pre-line mt-1">{selectedPayment.payment_method_details.account_details}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No additional details available</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Payment Proof</h4>
                <div className="border rounded-md p-2 flex justify-center bg-muted/10">
                  <img 
                    src={selectedPayment.screenshot_url} 
                    alt="Payment proof" 
                    className="max-h-[300px] rounded-md object-contain"
                  />
                </div>
                <div className="text-right">
                  <a 
                    href={selectedPayment.screenshot_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary flex items-center justify-end gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Download Image
                  </a>
                </div>
              </div>
              
              {selectedPayment.status === 'pending' && (
                <div className="space-y-2 pt-4 border-t">
                  <h4 className="text-sm font-medium">Review Decision</h4>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      onClick={() => handleReviewPayment(selectedPayment.id, 'approved')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Payment
                    </Button>
                    
                    <div className="flex-1 space-y-2">
                      <Textarea
                        placeholder="Reason for rejection..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="border-red-200 min-h-[80px]"
                      />
                      <Button
                        onClick={() => handleReviewPayment(selectedPayment.id, 'rejected')}
                        variant="destructive"
                        className="w-full"
                        disabled={!rejectionReason}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject Payment
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPaymentDetailsModal(false);
                setSelectedPayment(null);
                setRejectionReason('');
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentMethodsAdmin;
