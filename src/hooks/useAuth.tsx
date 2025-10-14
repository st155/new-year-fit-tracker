import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
  // toast imported directly - no hook needed

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
          
          toast({
            title: "Welcome!",
            description: `Signed in as ${session.user.email}`,
          });
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
        toast({
          title: "User already registered",
          description: "Try signing in instead of signing up",
          variant: "destructive"
        });
      } else if (error.message.includes('Invalid email')) {
        toast({
          title: "Invalid email",
          description: "Please check your email address",
          variant: "destructive"
        });
      } else if (error.message.includes('Password')) {
        toast({
          title: "Password too simple",
          description: "Password must be at least 6 characters",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Registration error",
          description: error.message,
          variant: "destructive"
        });
      }
    } else {
      // Mark this user as a new user for onboarding
      if (data.user) {
        localStorage.setItem(`new_user_${data.user.id}`, 'true');
      }
      
      toast({
        title: "Check your email",
        description: "We sent you a confirmation link. If you don't see it, check your spam folder."
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      toast({
        title: "Sign in error",
        description: error.message,
        variant: "destructive"
      });
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
          toast({
            title: "OAuth Configuration Error",
            description: "Need to configure Site URL and Redirect URLs in Supabase panel. Contact administrator.",
            variant: "destructive"
          });
        } else if (error.message.includes('Network')) {
          toast({
            title: "Network error",
            description: "Check your internet connection and try again",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Google sign in error",
            description: error.message,
            variant: "destructive"
          });
        }
      } else {
        console.log('Google OAuth initiated successfully');
      }

      return { data, error };
    } catch (err: any) {
      console.error('Google auth catch error:', err);
      toast({
        title: "Google sign in error", 
        description: "Try again later or use email sign in",
        variant: "destructive"
      });
      return { error: err };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast({
        title: "Sign out error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Goodbye!",
        description: "You have successfully signed out"
      });
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