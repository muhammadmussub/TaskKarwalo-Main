import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Settings, Users, Clock } from "lucide-react";
import NotificationDropdown from "@/components/NotificationDropdown";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";

interface NavigationProps {
  onOpenAuth: () => void;
}

const Navigation = ({ onOpenAuth }: NavigationProps) => {
  const [activeSection, setActiveSection] = useState("home");
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeUsers, setActiveUsers] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActiveUsers = async () => {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('updated_at', fiveMinutesAgo);
        
        if (error) {
          console.error('Error fetching active users:', error);
          setActiveUsers(0);
        } else {
          setActiveUsers(count || 0);
        }
        
        setLastUpdated(new Date());
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching active users:', error);
        setActiveUsers(0);
        setIsLoading(false);
      }
    };
    
    fetchActiveUsers();
    
    const channel = supabase
      .channel('nav-active-users')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        () => fetchActiveUsers()
      )
      .subscribe();
    
    const interval = setInterval(fetchActiveUsers, 60000);
    
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const scrollToSection = (sectionId: string) => {
    // Prevent admin users from navigating to home page sections
    if (user?.user_type === 'admin') {
      return; // Block navigation for admin users
    }
    
    setActiveSection(sectionId);
    // If user is on a dashboard page, navigate to home first
    if (window.location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        if (sectionId === "home") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          const element = document.getElementById(sectionId);
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
          }
        }
      }, 100);
    } else {
      if (sectionId === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  };

  const getRedirectPath = (userType: string) => {
    switch (userType) {
      case 'provider':
        return '/provider-dashboard';
      case 'admin':
        return '/admin-dashboard';
      default:
        return '/user-dashboard';
    }
  };

   const handleDashboard = () => {
     if (user?.user_type) {
       navigate(getRedirectPath(user.user_type));
     }
   };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  // Format time since last update
  const getTimeSinceUpdate = () => {
    const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
    
    if (seconds < 60) {
      return 'just now';
    } else if (seconds < 120) {
      return '1 minute ago';
    } else {
      return `${Math.floor(seconds / 60)} minutes ago`;
    }
  };

  // Add CSS for navigation animations
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes pulse-glow-nav {
        0%, 100% {
          box-shadow: 0 0 5px hsl(210, 100%, 65%);
        }
        50% {
          box-shadow: 0 0 15px hsl(210, 100%, 65%), 0 0 25px hsl(210, 100%, 65%, 0.8);
        }
      }
      
      .nav-users-glow {
        animation: pulse-glow-nav 2s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    // Updated navigation bar with improved theme support
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo with theme-aware text */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-primary cursor-pointer" onClick={() => scrollToSection("home")}>
              TaskKarwalo
            </h1>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {user?.user_type !== 'admin' && [
                { id: "home", label: "Home" },
                { id: "services", label: "Services" },
                { id: "about", label: "About" },
                { id: "theme-showcase", label: "Theme Showcase" }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === "theme-showcase") {
                      navigate("/theme-showcase");
                    } else {
                      scrollToSection(item.id);
                    }
                  }}
                  className={`px-3 py-2 text-sm font-medium transition-colors hover:text-primary-hover ${
                    activeSection === item.id ? "text-primary" : "text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {user?.user_type === 'admin' && (
                <div className="text-sm font-medium text-primary">
                  Admin Panel
                </div>
              )}
            </div>
          </div>
        
          {/* Active users & Last updated - New section */}
          <div className="hidden md:flex items-center space-x-4 mr-4">
            <div className="flex items-center text-sm bg-muted px-3 py-1 rounded-full hover:bg-accent transition-colors">
              <Users className="h-3.5 w-3.5 text-primary mr-1.5" />
              <span className="font-medium text-foreground">
                {isLoading ? "..." : activeUsers} users online
              </span>
            </div>
          
          <div className="flex items-center text-sm text-foreground bg-muted px-3 py-1 rounded-full hover:bg-accent transition-colors">
            <Clock className="h-3.5 w-3.5 mr-1.5 text-primary" />
            <span>Updated {getTimeSinceUpdate()}</span>
          </div>
        </div>

        {/* Auth Section */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {isAuthenticated && <NotificationDropdown />}
          
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-10 hover:bg-accent">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback>{user?.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-foreground">{user?.full_name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border-border">
                <DropdownMenuItem 
                  onClick={handleDashboard}
                  className="text-foreground hover:bg-accent focus:bg-accent"
                >
                  <User className="mr-2 h-4 w-4 text-primary" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem className="text-foreground hover:bg-accent focus:bg-accent">
                  <Settings className="mr-2 h-4 w-4 text-primary" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-foreground hover:bg-accent focus:bg-accent"
                >
                  <LogOut className="mr-2 h-4 w-4 text-primary" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // Updated Sign Up button with theme-aware styling
            <Button 
              onClick={onOpenAuth}
              className="bg-primary text-primary-foreground hover:bg-primary-hover glow-effect"
            >
              Sign Up
            </Button>
          )}
        </div>
      </div>
    </div>
  </nav>
);
};

export default Navigation;