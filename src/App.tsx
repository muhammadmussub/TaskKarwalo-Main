import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AuthRedirect from "@/components/AuthRedirect";
import PageTransition from "@/components/PageTransition";
import TaskCycleLoader from "@/components/TaskCycleLoader";
import { ToDoProvider, ToDoButton } from "@/components/user/ToDoList";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import UserDashboard from "./pages/UserDashboard";
import ProviderDashboard from "./pages/ProviderDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProviderOverview from "./pages/ProviderOverview";
import AdminUserCreator from "./components/AdminUserCreator";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import ThemeShowcase from "./pages/ThemeShowcase";
import RatingsHistory from "./pages/RatingsHistory";
import EmailConfirmed from "./pages/EmailConfirmed";
import NotificationPermission from "./components/NotificationPermission";

const queryClient = new QueryClient();

const AppContent = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Reduce loading time to 1 second instead of 3 seconds
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000); // 1 second loading time

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <TaskCycleLoader isLoading={isLoading} />
      <BrowserRouter>
        <AuthRedirect />
        <PageTransition>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/user-dashboard" element={
              <ToDoProvider userId={user?.id || ''}>
                <UserDashboard />
              </ToDoProvider>
            } />
            <Route path="/provider-dashboard" element={<ProviderDashboard />} />
            <Route path="/provider-overview" element={<ProviderOverview />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/ratings-history" element={<RatingsHistory />} />
            <Route path="/create-admin" element={<AdminUserCreator />} />
            <Route path="/theme-showcase" element={<ThemeShowcase />} />
            <Route path="/email-confirmed" element={<EmailConfirmed />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageTransition>
        {/* Floating ToDo Button - only show when user is logged in */}
        {isAuthenticated && user && (
          <ToDoProvider userId={user.id}>
            <ToDoButton />
          </ToDoProvider>
        )}

        {/* Notification Permission Prompt */}
        <NotificationPermission />
      </BrowserRouter>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppContent />
            </TooltipProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;