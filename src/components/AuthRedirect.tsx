import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const AuthRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Disable automatic redirects to allow users to navigate freely
    // Users can manually go to their dashboards via navigation or direct links
    console.log('AuthRedirect: Current path:', location.pathname);
    console.log('AuthRedirect: User authenticated:', isAuthenticated);
    console.log('AuthRedirect: User type:', user?.user_type);
    
    // Only redirect in specific cases, not automatically from home page
    // This allows "Back to Home" navigation to work properly
  }, [user, isAuthenticated, loading, navigate, location.pathname]);

  return null; // This component doesn't render anything
};

export default AuthRedirect;