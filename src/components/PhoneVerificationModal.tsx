import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Phone, Loader2, AlertTriangle, CheckCircle } from "lucide-react";

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerificationComplete: (phoneNumber: string) => void;
  userId: string;
}

const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerificationComplete,
  userId
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneExists, setPhoneExists] = useState(false);

  // Pakistani phone number validation
  const validatePhoneNumber = (phone: string): boolean => {
    const pakistaniPhoneRegex = /^(\+92|92|0)?[3][0-9]{9}$/;
    return pakistaniPhoneRegex.test(phone);
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Add +92 if not present and starts with 3
    if (cleaned.startsWith('3') && !cleaned.startsWith('+92')) {
      cleaned = '+92' + cleaned;
    }
    // Add +92 if starts with 0
    else if (cleaned.startsWith('0')) {
      cleaned = '+92' + cleaned.substring(1);
    }
    // Add + if missing
    else if (!cleaned.startsWith('+') && cleaned.length === 12) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  };

  const handlePhoneNumberChange = async (value: string) => {
    setPhoneNumber(value);
    setError(null);
    setPhoneExists(false);

    if (value.length >= 10) {
      const formatted = formatPhoneNumber(value);
      setPhoneNumber(formatted);

      // Check if phone exists
      setIsChecking(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('phone')
          .eq('phone', formatted)
          .maybeSingle();

        if (error) {
          console.error('Error checking phone:', error);
          return;
        }

        setPhoneExists(!!data);
      } catch (error) {
        console.error('Error checking phone existence:', error);
      } finally {
        setIsChecking(false);
      }
    }
  };

  const handleSendOTP = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid Pakistani phone number (+92XXXXXXXXXX)');
      return;
    }

    if (phoneExists) {
      setError('This phone number is already linked to another account. Please use a different number or recover your existing account.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, update the user's phone number in the database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          phone: phoneNumber,
          phone_verified: false, // Will be set to true after OTP verification
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating phone:', updateError);
        setError('Failed to save phone number. Please try again.');
        return;
      }

      // Generate a simple OTP for demo purposes (in production, use a proper SMS service)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store the OTP temporarily (in production, use Redis or similar)
      localStorage.setItem(`otp_${phoneNumber}`, otp);
      localStorage.setItem(`otp_timestamp_${phoneNumber}`, new Date().getTime().toString());

      // For demo purposes, show the OTP in console and toast
      console.log('Demo OTP for', phoneNumber, ':', otp);

      toast.success(`Demo OTP: ${otp} (Check console for OTP in real implementation)`);
      onVerificationComplete(phoneNumber);
    } catch (error: any) {
      console.error('Error in phone verification:', error);
      setError('Failed to process phone verification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async () => {
    // Check if phone is verified before allowing close
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_verified')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile?.phone_verified) {
        setPhoneNumber('');
        setError(null);
        setPhoneExists(false);
        onClose();
      } else {
        toast.error("Phone verification is required. Please complete the verification process.");
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      toast.error("Unable to verify phone status. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Phone className="h-5 w-5 text-blue-400" />
            Phone Number Verification
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-gray-300 text-sm">
              Please enter your phone number to receive a verification code
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-gray-300">
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+92XXXXXXXXXX"
              value={phoneNumber}
              onChange={(e) => handlePhoneNumberChange(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white placeholder-gray-400 focus:border-blue-500"
              disabled={isLoading}
            />
            {isChecking && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking phone number...
              </div>
            )}
          </div>

          {phoneExists && (
            <Alert className="border-red-600 bg-red-900/20">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                This phone number is already linked to another account.
                Please use a different number or recover your existing account.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="border-red-600 bg-red-900/20">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <CheckCircle className="h-4 w-4" />
              <span className="font-semibold text-sm">Why do we need your phone number?</span>
            </div>
            <div className="text-xs text-gray-300 space-y-1">
              <p>• Verify your identity and prevent fake accounts</p>
              <p>• Enable secure communication with service providers</p>
              <p>• Send booking confirmations and updates</p>
              <p>• One account per phone number for security</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 border-slate-600 text-gray-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendOTP}
              disabled={isLoading || !phoneNumber || phoneExists || isChecking}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2" />
                  Send OTP
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhoneVerificationModal;