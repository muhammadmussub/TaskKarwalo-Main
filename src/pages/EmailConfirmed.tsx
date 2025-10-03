import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const EmailConfirmed = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the access token and refresh token from URL parameters
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const type = searchParams.get('type');

        if (type === 'signup' && accessToken && refreshToken) {
          // Set the session with the tokens from the email confirmation
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('Error setting session:', error);
            setStatus('error');
            setMessage('Failed to confirm email. Please try again or contact support.');
            return;
          }

          if (data.user) {
            setStatus('success');
            setMessage('Email confirmed successfully! Your account is now active.');
            toast.success('Email confirmed successfully!');

            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
              navigate('/provider-dashboard');
            }, 3000);
          }
        } else {
          setStatus('error');
          setMessage('Invalid confirmation link. Please try signing up again.');
        }
      } catch (error) {
        console.error('Error during email confirmation:', error);
        setStatus('error');
        setMessage('An error occurred during email confirmation. Please try again.');
      }
    };

    handleEmailConfirmation();
  }, [searchParams, navigate]);

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-white flex items-center justify-center gap-2">
            {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-6 w-6 text-green-500" />}
            {status === 'error' && <XCircle className="h-6 w-6 text-red-500" />}
            Email Confirmation
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-300">{message}</p>

          {status === 'success' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                You will be redirected to your dashboard shortly...
              </p>
              <Button onClick={handleGoHome} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <Button onClick={handleGoHome} className="w-full">
                Go to Home
              </Button>
              <Button
                onClick={() => navigate('/login')}
                variant="outline"
                className="w-full"
              >
                Try Login
              </Button>
            </div>
          )}

          {status === 'loading' && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfirmed;