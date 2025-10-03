import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mail, User, Lock, ArrowRight, Check, Facebook, Github, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import PhoneVerificationModal from "./PhoneVerificationModal";
import OTPVerificationModal from "./OTPVerificationModal";
import PhoneVerificationSuccessModal from "./PhoneVerificationSuccessModal";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  // State for auth forms
  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'forgot-password'>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [userType, setUserType] = useState<"customer" | "provider" | "admin">("customer");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phone verification states
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  // Get auth methods from context
  const { login, signup, resetPassword } = useAuth();

  // Login handler
  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Login successful!");
        onClose();
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Signup handler
  const handleSignup = async () => {
    if (!email || !password || !fullName) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signup(email, password, { full_name: fullName, user_type: userType });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Account created! Please complete phone verification to continue.");
        // Show phone verification modal instead of closing
        setShowPhoneVerification(true);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Phone verification handlers
  const handlePhoneVerificationComplete = (phoneNumber: string) => {
    setPendingPhoneNumber(phoneNumber);
    setShowPhoneVerification(false);
    setShowOTPVerification(true);
  };

  const handleOTPVerificationSuccess = () => {
    setShowOTPVerification(false);
    setShowSuccessModal(true);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    onClose();
    // Reset all states
    setEmail("");
    setPassword("");
    setFullName("");
    setPendingPhoneNumber("");
    setCurrentUserId("");
  };
  
  // Reset password handler
  const handleResetPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const result = await resetPassword(email);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Password reset email sent! Please check your inbox.");
        setActiveTab('login');
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Testimonial and image content for the right side
  const testimonials = [
    {
      quote: "TaskKarwalo made finding a reliable cleaner so easy! My home has never looked better.",
      author: "Sarah J.",
      role: "Homeowner",
    },
    {
      quote: "As a service provider, this platform has connected me with clients I wouldn't have found otherwise.",
      author: "Raza K.",
      role: "Professional Cleaner",
    },
    {
      quote: "The quality of work and reliability of professionals on this platform is exceptional!",
      author: "Ayesha M.",
      role: "Business Owner",
    },
  ];
  
  // Randomly select a testimonial
  const randomTestimonial = testimonials[Math.floor(Math.random() * testimonials.length)];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] p-0 rounded-xl overflow-hidden">
        <div className="flex flex-col md:flex-row w-full">
          {/* Left Side - Auth Form */}
          <div className="w-full md:w-[400px] p-6 md:p-8 bg-white">
            {/* Back button for forgot password */}
            {activeTab === 'forgot-password' && (
              <button 
                onClick={() => setActiveTab('login')}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 mb-4 transition-colors"
              >
                <ArrowRight className="h-3 w-3 mr-1 rotate-180" />
                Back to login
              </button>
            )}
            
            {/* Form Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {activeTab === 'login' && 'Welcome back'}
                {activeTab === 'signup' && 'Create an account'}
                {activeTab === 'forgot-password' && 'Reset your password'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {activeTab === 'login' && 'Sign in to your account to continue'}
                {activeTab === 'signup' && 'Join TaskKarwalo to get started'}
                {activeTab === 'forgot-password' && 'Enter your email to receive a reset link'}
              </p>
            </div>
            
            {/* Login Form */}
            {activeTab === 'login' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 border-gray-300 focus:border-blue-500 h-12"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <button 
                      type="button" 
                      onClick={() => setActiveTab('forgot-password')}
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 border-gray-300 focus:border-blue-500 h-12"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleLogin} 
                  disabled={isSubmitting}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </Button>
                
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or continue with</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-11 border-gray-300">
                    <Facebook className="h-4 w-4 mr-2" />
                    Facebook
                  </Button>
                  <Button variant="outline" className="h-11 border-gray-300">
                    <Github className="h-4 w-4 mr-2" />
                    Github
                  </Button>
                </div>
                
                <div className="text-center text-sm mt-6">
                  <span className="text-gray-500">Don't have an account? </span>
                  <button 
                    onClick={() => setActiveTab('signup')} 
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Sign up
                  </button>
                </div>
              </div>
            )}
            
            {/* Sign Up Form */}
            {activeTab === 'signup' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Account Type</Label>
                  <RadioGroup 
                    value={userType} 
                    onValueChange={(value) => setUserType(value as "customer" | "provider")}
                    className="grid grid-cols-2 gap-3"
                  >
                    <div className={`border rounded-md p-3 cursor-pointer transition-colors ${
                      userType === 'customer' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
                    }`}>
                      <RadioGroupItem value="customer" id="customer" className="sr-only" />
                      <Label htmlFor="customer" className="cursor-pointer flex flex-col items-center">
                        <User className={`h-5 w-5 mb-1 ${userType === 'customer' ? 'text-blue-600' : 'text-gray-500'}`} />
                        <span className={`text-sm ${userType === 'customer' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                          Customer
                        </span>
                      </Label>
                    </div>
                    <div className={`border rounded-md p-3 cursor-pointer transition-colors ${
                      userType === 'provider' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
                    }`}>
                      <RadioGroupItem value="provider" id="provider" className="sr-only" />
                      <Label htmlFor="provider" className="cursor-pointer flex flex-col items-center">
                        <User className={`h-5 w-5 mb-1 ${userType === 'provider' ? 'text-blue-600' : 'text-gray-500'}`} />
                        <span className={`text-sm ${userType === 'provider' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                          Provider
                        </span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Smith"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 border-gray-300 focus:border-blue-500 h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 border-gray-300 focus:border-blue-500 h-12"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 border-gray-300 focus:border-blue-500 h-12"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleSignup} 
                  disabled={isSubmitting}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
                
                <div className="text-center text-sm mt-6">
                  <span className="text-gray-500">Already have an account? </span>
                  <button 
                    onClick={() => setActiveTab('login')} 
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Sign in
                  </button>
                </div>
              </div>
            )}
            
            {/* Forgot Password Form */}
            {activeTab === 'forgot-password' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 border-gray-300 focus:border-blue-500 h-12"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleResetPassword} 
                  disabled={isSubmitting}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </Button>
              </div>
            )}
          </div>
          
          {/* Right Side - Image and Quote */}
          <div className="hidden md:block md:w-[500px] bg-gradient-to-br from-blue-500 to-blue-700 p-8 text-white">
            <div className="h-full flex flex-col justify-between">
              {/* Top section with logo */}
              <div className="flex items-center">
                <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-lg">T</span>
                </div>
                <h2 className="ml-3 text-xl font-bold">TaskKarwalo</h2>
              </div>
              
              {/* Center section with image */}
              <div className="my-10 relative">
                <img 
                  src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80" 
                  alt="Professional cleaning service" 
                  className="rounded-lg shadow-lg w-full h-64 object-cover"
                />
                
                {/* Overlapping feature cards */}
                <div className="absolute -bottom-6 -left-6 bg-white text-blue-800 p-4 rounded-lg shadow-lg max-w-[200px]">
                  <div className="flex items-start">
                    <div className="bg-blue-100 p-2 rounded-full mr-3">
                      <Check className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Verified Professionals</h4>
                      <p className="text-xs text-gray-600 mt-1">All service providers are background checked</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Bottom section with testimonial */}
              <div className="mt-auto">
                <blockquote className="italic text-lg">"{ randomTestimonial.quote }"</blockquote>
                <div className="mt-4 flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center">
                    <span className="font-medium text-sm">
                      {randomTestimonial.author.charAt(0)}
                    </span>
                  </div>
                  <div className="ml-3">
                    <h4 className="font-medium">{ randomTestimonial.author }</h4>
                    <p className="text-sm opacity-80">{ randomTestimonial.role }</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Phone Verification Modals */}
      <PhoneVerificationModal
        isOpen={showPhoneVerification}
        onClose={() => setShowPhoneVerification(false)}
        onVerificationComplete={handlePhoneVerificationComplete}
        userId={currentUserId}
      />

      <OTPVerificationModal
        isOpen={showOTPVerification}
        onClose={() => setShowOTPVerification(false)}
        onVerificationSuccess={handleOTPVerificationSuccess}
        phoneNumber={pendingPhoneNumber}
        userId={currentUserId}
      />

      <PhoneVerificationSuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        phoneNumber={pendingPhoneNumber}
      />
    </Dialog>
  );
};

export default AuthModal;