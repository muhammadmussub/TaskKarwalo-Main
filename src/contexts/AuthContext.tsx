import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  user_type: "customer" | "provider" | "admin";
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, userData: { full_name: string; user_type: string }) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string; success?: boolean }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session?.user) {
          // Defer profile fetching to avoid blocking auth state changes
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profile) {
      setUser({
        id: profile.user_id,
        email: profile.email,
        full_name: profile.full_name,
        phone: profile.phone || '',
        user_type: profile.user_type as "customer" | "provider" | "admin",
        avatar_url: profile.avatar_url
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        return { error: error.message };
      }

      console.log('Login successful:', data);
      return { error: undefined };
    } catch (error: any) {
      console.error('Unexpected login error:', error);
      return { error: 'An unexpected error occurred during login' };
    }
  };

  const signup = async (email: string, password: string, userData: { full_name: string; user_type: string }) => {
    try {
      console.log('Attempting signup for:', email, 'with user type:', userData.user_type);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            ...userData,
            email_confirm_required: true
          },
          emailRedirectTo: `${window.location.origin}/email-confirmed`
        }
      });

      if (error) {
        console.error('Signup error:', error);
        return { error: error.message };
      }

      console.log('Signup successful:', data);

      // If user is created immediately (no email confirmation required)
      if (data.user && !data.user.email_confirmed_at) {
        console.log('User created but email confirmation required');
        return {
          error: undefined,
          message: 'Please check your email and click the confirmation link to activate your account.'
        };
      }

      return { error: undefined };
    } catch (error: any) {
      console.error('Unexpected signup error:', error);
      return { error: 'An unexpected error occurred during signup' };
    }
  };
  
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { 
      error: error?.message, 
      success: error ? false : true 
    };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isAuthenticated = !!user && !!session;

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      login, 
      signup,
      resetPassword,
      logout, 
      isAuthenticated,
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};