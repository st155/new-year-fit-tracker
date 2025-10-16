import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle successful OAuth login
        if (event === 'SIGNED_IN' && session?.user) {
          // Check if this is a new user (first login)
          const isNewUser = !session.user.email_confirmed_at || 
                           (session.user.created_at && 
                            new Date(session.user.created_at).getTime() > Date.now() - 60000); // Less than 1 min old
          
          if (isNewUser) {
            localStorage.setItem(`new_user_${session.user.id}`, 'true');
          }
          
          toast.success(`Signed in as ${session.user.email}`);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []); // Empty dependency array - auth state listener should only run once

  const signUp = async (email: string, password: string, username: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username,
          full_name: username
        }
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error("User already registered. Try signing in instead of signing up.");
      } else if (error.message.includes('Invalid email')) {
        toast.error("Invalid email. Please check your email address");
      } else if (error.message.includes('Password')) {
        toast.error("Password too simple. Password must be at least 6 characters");
      } else {
        toast.error(`Registration error: ${error.message}`);
      }
    } else {
      // Mark this user as a new user for onboarding
      if (data.user) {
        localStorage.setItem(`new_user_${data.user.id}`, 'true');
      }
      
      toast("Check your email. We sent you a confirmation link. If you don't see it, check your spam folder.");
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      toast.error(`Sign in error: ${error.message}`);
    }

    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      console.log('Initiating Google OAuth...');
      
      // Use production URL for better OAuth compatibility
      const baseUrl = window.location.origin;
      const redirectTo = `${baseUrl}/`;
      
      console.log('Redirect URL:', redirectTo);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          }
        }
      });

      if (error) {
        console.error('Google auth error:', error);
        
        // Handle specific error cases
        if (error.message.includes('requested path is invalid') || 
            error.message.includes('signature is invalid') ||
            error.message.includes('Invalid token')) {
          toast.error("OAuth Configuration Error. Need to configure Site URL and Redirect URLs in Supabase panel. Contact administrator.");
        } else if (error.message.includes('Network')) {
          toast.error("Network error. Check your internet connection and try again");
        } else {
          toast.error(`Google sign in error: ${error.message}`);
        }
      } else {
        console.log('Google OAuth initiated successfully');
      }

      return { data, error };
    } catch (err: any) {
      console.error('Google auth catch error:', err);
      toast.error("Google sign in error. Try again later or use email sign in");
      return { error: err };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast.error(`Sign out error: ${error.message}`);
    } else {
      toast.success("You have successfully signed out");
    }

    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};