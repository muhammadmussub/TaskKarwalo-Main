import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, ArrowRight } from "lucide-react";

interface PhoneVerificationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
}

const PhoneVerificationSuccessModal: React.FC<PhoneVerificationSuccessModalProps> = ({
  isOpen,
  onClose,
  phoneNumber
}) => {
  const handleContinue = () => {
    onClose();
    // Navigation to dashboard will be handled by the parent component
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-600 rounded-full flex items-center justify-center relative overflow-hidden">
            <CheckCircle className="h-8 w-8 text-white" />
            <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-transparent animate-pulse"></div>
          </div>
          <DialogTitle className="text-2xl text-white mb-2">
            🎉 Congratulations!
          </DialogTitle>
          <p className="text-gray-300 text-lg">
            Your phone number has been verified successfully!
          </p>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-400 mb-3">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold">You're now ready to explore TaskKarwalo!</span>
            </div>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Secure account with phone verification</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Browse and book services from verified providers</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Receive SMS notifications for bookings</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Direct communication with service providers</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-400" />
              What's Next?
            </h4>
            <div className="text-sm text-gray-300 space-y-1">
              <p>• Browse available services in your area</p>
              <p>• View provider profiles and ratings</p>
              <p>• Book services with instant confirmation</p>
              <p>• Track your bookings in real-time</p>
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Verified Phone:</span>
              <span className="text-white font-semibold">{phoneNumber}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-300">Account Status:</span>
              <span className="text-green-400 font-semibold">Fully Verified</span>
            </div>
          </div>

          <Button
            onClick={handleContinue}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3"
          >
            Start Exploring TaskKarwalo
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>

          <div className="text-center">
            <p className="text-xs text-gray-400">
              Welcome to TaskKarwalo! Your trusted platform for local services.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhoneVerificationSuccessModal;