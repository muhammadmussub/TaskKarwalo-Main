import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Loader2, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerificationSuccess: () => void;
  phoneNumber: string;
  userId: string;
}

const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerificationSuccess,
  phoneNumber,
  userId
}) => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleOtpChange = (value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '');
    setOtp(digitsOnly);
    setError(null);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // For demo purposes, check against localStorage OTP
      const storedOTP = localStorage.getItem(`otp_${phoneNumber}`);
      const otpTimestamp = localStorage.getItem(`otp_timestamp_${phoneNumber}`);
      const currentTime = new Date().getTime();

      // Check if OTP is valid and not expired (5 minutes)
      if (!storedOTP || !otpTimestamp || (currentTime - parseInt(otpTimestamp)) > 300000) {
        setError('OTP has expired. Please request a new one.');
        return;
      }

      if (storedOTP !== otp) {
        setError('Invalid OTP. Please check and try again.');
        return;
      }

      // OTP is valid, update user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          phone: phoneNumber,
          phone_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        setError('Failed to update profile. Please contact support.');
        return;
      }

      // Clean up stored OTP
      localStorage.removeItem(`otp_${phoneNumber}`);
      localStorage.removeItem(`otp_timestamp_${phoneNumber}`);

      toast.success('Phone number verified successfully!');
      onVerificationSuccess();
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    setResendCooldown(60); // 60 seconds cooldown
    setCanResend(false);
    setError(null);

    try {
      // Generate a new OTP for demo purposes
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store the new OTP
      localStorage.setItem(`otp_${phoneNumber}`, newOtp);
      localStorage.setItem(`otp_timestamp_${phoneNumber}`, new Date().getTime().toString());

      // Show the OTP in console and toast
      console.log('New Demo OTP for', phoneNumber, ':', newOtp);

      toast.success(`Demo OTP: ${newOtp} (Check console for OTP in real implementation)`);
    } catch (error: any) {
      console.error('Error resending OTP:', error);
      setError('Failed to resend OTP. Please try again.');
      setResendCooldown(0);
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
        setOtp('');
        setError(null);
        setResendCooldown(0);
        setCanResend(false);
        onClose();
      } else {
        toast.error("Please complete phone verification to continue.");
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      toast.error("Unable to verify phone status. Please try again.");
    }
  };

  const handleBack = async () => {
    // Check if phone is verified before allowing back navigation
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_verified')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile?.phone_verified) {
        onClose(); // This will go back to phone verification screen
      } else {
        toast.error("Please complete phone verification to continue.");
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
            <Shield className="h-5 w-5 text-green-400" />
            Enter Verification Code
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-gray-300 text-sm mb-2">
              We've sent a 6-digit verification code to
            </p>
            <p className="text-white font-semibold">{phoneNumber}</p>
          </div>

          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => handleOtpChange(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white text-center text-2xl tracking-widest focus:border-green-500"
              maxLength={6}
              disabled={isLoading}
            />
          </div>

          {error && (
            <Alert className="border-red-600 bg-red-900/20">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-green-900/20 border border-green-600 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <CheckCircle className="h-4 w-4" />
              <span className="font-semibold text-sm">Verification Benefits</span>
            </div>
            <div className="text-xs text-gray-300 space-y-1">
              <p>• Secure your account with phone verification</p>
              <p>• Receive booking confirmations via SMS</p>
              <p>• Enable direct communication with providers</p>
              <p>• Prevent unauthorized account access</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleVerifyOTP}
              disabled={isLoading || otp.length !== 6}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Verify Phone Number
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="text-xs text-gray-400 mb-2">
                Didn't receive the code?
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendOTP}
                disabled={!canResend || isLoading}
                className="text-blue-400 hover:text-blue-300 disabled:text-gray-500"
              >
                {resendCooldown > 0 ? (
                  `Resend OTP in ${resendCooldown}s`
                ) : (
                  'Resend OTP'
                )}
              </Button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isLoading}
              className="flex-1 border-slate-600 text-gray-300 hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OTPVerificationModal;