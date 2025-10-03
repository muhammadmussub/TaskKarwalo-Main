import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Upload, X, Check, Info, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

interface CommissionReminderProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
  completedJobsCount: number;
  providerName: string;
}

interface PaymentMethod {
  id: string;
  method_name: string;
  display_name: string;
  account_details: string;
  instructions?: string;
  is_active: boolean;
}

// Default payment methods
const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: '1',
    method_name: 'bank_transfer',
    display_name: 'Bank Transfer',
    account_details: 'Account Name: TaskKarwalo\nAccount Number: 123456789\nBank: Example Bank',
    instructions: 'Please include your provider ID in the transfer description',
    is_active: true
  },
  {
    id: '2',
    method_name: 'easypaisa',
    display_name: 'EasyPaisa',
    account_details: 'Account Number: 03001234567\nAccount Title: TaskKarwalo Services',
    is_active: true
  },
  {
    id: '3',
    method_name: 'jazzcash',
    display_name: 'JazzCash',
    account_details: 'Account Number: 03011234567\nAccount Title: TaskKarwalo Services',
    is_active: true
  }
];

const CommissionReminder: React.FC<CommissionReminderProps> = ({
  isOpen,
  onClose,
  providerId,
  completedJobsCount,
  providerName
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);

  // Fetch payment methods when component mounts
  useEffect(() => {
    if (isOpen) {
      fetchPaymentMethods();
    }
  }, [isOpen]);

  // Fetch payment methods from the database
  const fetchPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);

      const { data, error } = await (supabase as any)
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setPaymentMethods(data);
      } else {
        // Fallback to default methods if no methods found in database
        setPaymentMethods(DEFAULT_PAYMENT_METHODS);
        toast.error('No payment methods found in database, using defaults');
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      // Fallback to default methods
      setPaymentMethods(DEFAULT_PAYMENT_METHODS);
      toast.error('Failed to load payment methods, using defaults');
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  // Update selected payment method when payment method changes
  useEffect(() => {
    if (paymentMethod && paymentMethods.length > 0) {
      const method = paymentMethods.find(m => m.method_name === paymentMethod);
      setSelectedPaymentMethod(method || null);
    } else {
      setSelectedPaymentMethod(null);
    }
  }, [paymentMethod, paymentMethods]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard');
    }).catch(err => {
      toast.error('Failed to copy');
      console.error('Could not copy text: ', err);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFileError('Please upload a valid image file (JPG, PNG, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size should be less than 5MB');
      return;
    }

    setFileError(null);
    setSelectedFile(file);

    // Create preview URL
    const fileUrl = URL.createObjectURL(file);
    setPreviewUrl(fileUrl);
  };

  const handleSubmit = async () => {
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!selectedFile) {
      toast.error('Please upload a payment screenshot');
      return;
    }

    setIsUploading(true);
    try {
      // Upload screenshot to Supabase Storage
      const timestamp = Date.now();
      const fileName = `proof_${timestamp}.${selectedFile.name.split('.').pop()}`;
      const filePath = `commissions/${providerId}/${fileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('commission-screenshots')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('commission-screenshots')
        .getPublicUrl(filePath);

      // Save commission payment record
      const { error: insertError } = await supabase
        .from('commission_payments')
        .insert({
          provider_id: providerId,
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          screenshot_url: publicUrlData?.publicUrl,
          booking_count: completedJobsCount,
          status: 'pending',
          submitted_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      toast.success('Commission payment proof submitted successfully');
      onClose();
    } catch (error) {
      console.error('Error submitting commission payment:', error);
      toast.error('Failed to submit commission payment. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    // Clean up preview URL when closing
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setPaymentMethod('');
    setAmount('');
    setFileError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Commission Payment Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You've completed {completedJobsCount} tasks since your last commission payment.
              Please submit your commission payment now to continue receiving new bookings.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method</Label>
              {loadingPaymentMethods ? (
                <div className="h-10 bg-gray-100 animate-pulse rounded"></div>
              ) : (
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.method_name}>
                        {method.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedPaymentMethod && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-medium text-blue-800">{selectedPaymentMethod.display_name} Details</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 text-blue-600"
                      onClick={() => copyToClipboard(selectedPaymentMethod.account_details)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-blue-800 whitespace-pre-line">
                    {selectedPaymentMethod.account_details}
                  </div>
                  {selectedPaymentMethod.instructions && (
                    <div className="text-xs text-blue-700 pt-2 border-t border-blue-200">
                      <p className="font-medium mb-1">Instructions:</p>
                      {selectedPaymentMethod.instructions}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">Amount Paid (PKR)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow numbers and decimal point
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setAmount(value);
                  }
                }}
              />
              <p className="text-xs text-gray-500">
                Expected: PKR {((completedJobsCount * 1000) * 0.05).toFixed(2)} (5% of cycle earnings)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="screenshot">Payment Screenshot</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 transition cursor-pointer">
                <input
                  id="screenshot"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <label htmlFor="screenshot" className="cursor-pointer">
                  {previewUrl ? (
                    <div className="relative mx-auto">
                      <img 
                        src={previewUrl} 
                        alt="Payment screenshot" 
                        className="max-h-[200px] mx-auto rounded-lg shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedFile(null);
                          if (previewUrl) {
                            URL.revokeObjectURL(previewUrl);
                          }
                          setPreviewUrl(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4">
                      <Upload className="h-10 w-10 text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-700">Click to upload a screenshot</p>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG or WebP (max 5MB)</p>
                    </div>
                  )}
                </label>
              </div>
              {fileError && (
                <p className="text-sm text-red-500 mt-1">{fileError}</p>
              )}
            </div>

            <div className="flex items-start bg-blue-50 text-blue-800 rounded-lg p-3 text-sm">
              <Info className="h-5 w-5 mr-2 flex-shrink-0" />
              <p>
                Commission payments are verified by our admin team. Your booking capability will be restored once your payment is verified.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isUploading || !selectedFile || !paymentMethod || !amount}
            className="bg-[hsl(210,100%,65%)] text-white hover:bg-[hsl(210,100%,70%)]"
          >
            {isUploading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                Submitting...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Submit Payment Proof
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CommissionReminder;