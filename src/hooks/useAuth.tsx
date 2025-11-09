import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { useQuery } from '@tanstack/react-query';

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
    let mounted = true;
    let sessionTimeout: NodeJS.Timeout;
    
    console.log('🔐 [AuthProvider] Initializing...');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('🔐 [AuthProvider] Auth state change:', event, session?.user?.email);
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
        
        // Handle token refresh
        if (event === 'TOKEN_REFRESHED') {
          console.log('✅ Token refreshed successfully');
        }
        
        // Handle sign out
        if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
        }
      }
    );

    // Safety timeout: if getSession hangs > 5 seconds, force loading=false
    sessionTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('⚠️ [AuthProvider] Session check timeout (5s), forcing ready state');
        setLoading(false);
      }
    }, 5000);

    // THEN check for existing session with error handling
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;
        
        clearTimeout(sessionTimeout);
        
        if (error) {
          console.error('❌ [AuthProvider] Session check error:', error);
          setLoading(false);
          return;
        }
        
        console.log('✅ [AuthProvider] Initial session check:', session?.user?.email || 'no user');
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        if (!mounted) return;
        clearTimeout(sessionTimeout);
        console.error('❌ [AuthProvider] Session check failed:', error);
        setLoading(false);
      });

    return () => {
      mounted = false;
      clearTimeout(sessionTimeout);
      subscription.unsubscribe();
      console.log('🔐 [AuthProvider] Cleanup');
    };
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
      
      // Log failed login attempt for security audit
      if (user?.id) {
        const { logAuthAttempt } = await import('@/lib/security-audit');
        logAuthAttempt(user.id, 'email', false, error.message);
      }
    } else {
      // Log successful login
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { logAuthAttempt } = await import('@/lib/security-audit');
        logAuthAttempt(authUser.id, 'email', true);
      }
    }

    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      console.log('🔐 [Google OAuth] Initiating...');
      
      // Use production URL for better OAuth compatibility
      const baseUrl = window.location.origin;
      const redirectTo = `${baseUrl}/`;
      const supabaseCallbackUrl = 'https://ueykmmzmguzjppdudvef.supabase.co/auth/v1/callback';
      
      console.log('🔐 [Google OAuth] Redirect URL:', redirectTo);
      console.log('🔐 [Google OAuth] Expected callback URL:', supabaseCallbackUrl);
      
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
        console.error('❌ [Google OAuth] Error:', error);
        
        // Log failed OAuth attempt
        if (user?.id) {
          const { logAuthAttempt } = await import('@/lib/security-audit');
          logAuthAttempt(user.id, 'google', false, error.message);
        }
        
        // Handle specific error cases with actionable messages
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('redirect_uri_mismatch') || errorMsg.includes('redirect uri')) {
          console.error('❌ [Google OAuth] redirect_uri_mismatch detected!');
          console.error('📝 Add this URL to Google Cloud Console → OAuth 2.0 Client ID → Authorized redirect URIs:');
          console.error(`   ${supabaseCallbackUrl}`);
          
          toast.error(
            "Google OAuth not configured. Please add the Supabase callback URL to your Google Cloud Console. Check browser console for details.",
            { duration: 6000 }
          );
        } else if (errorMsg.includes('requested path is invalid') || 
                   errorMsg.includes('signature is invalid') ||
                   errorMsg.includes('invalid token')) {
          toast.error("OAuth Configuration Error. Need to configure Site URL and Redirect URLs in Supabase panel. Contact administrator.");
        } else if (errorMsg.includes('network')) {
          toast.error("Network error. Check your internet connection and try again");
        } else {
          toast.error(`Google sign in error: ${error.message}`);
        }
      } else {
        console.log('✅ [Google OAuth] Initiated successfully');
      }

      return { data, error };
    } catch (err: any) {
      console.error('💥 [Google OAuth] Catch error:', err);
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

/**
 * PRIMITIVE: Authentication hook with role helpers
 * 
 * Replaces: useUserRole (merged into this hook)
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    if (import.meta.env.DEV) {
      console.error('💥 [useAuth] Called outside AuthProvider!');
    }
    // Return safe defaults to prevent white screen
    return {
      user: null,
      session: null,
      loading: false,
      signUp: async () => ({ error: new Error('Auth not initialized') }),
      signIn: async () => ({ error: new Error('Auth not initialized') }),
      signInWithGoogle: async () => ({ error: new Error('Auth not initialized') }),
      signOut: async () => ({ error: new Error('Auth not initialized') }),
      role: 'client' as const,
      roles: ['client'] as const,
      rolesLoading: false,
      isTrainer: false,
      isAdmin: false,
      isClient: true,
    };
  }
  
  const [forceLoaded, setForceLoaded] = useState(false);
  
  // Get user role from user_roles table with graceful fallback
  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles', context.user?.id],
    queryFn: async () => {
      if (!context.user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', context.user.id);
      
      // On error, return default client role
      if (error) {
        console.warn('⚠️ [useAuth] Failed to fetch roles:', error);
        return [{ role: 'client' }];
      }
      
      // If no roles found, return default client role
      if (!data || data.length === 0) {
        console.warn('⚠️ [useAuth] No roles found, using default');
        return [{ role: 'client' }];
      }
      
      return data;
    },
    enabled: !!context.user?.id,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    retryDelay: 500,
  });
  
  // Add timeout to prevent infinite loading
  useEffect(() => {
    if (context.user?.id && rolesLoading) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ [useAuth] Roles loading timeout, forcing default role');
        setForceLoaded(true);
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [context.user?.id, rolesLoading]);
  
  // Use effective loading state with timeout
  const effectiveRolesLoading = rolesLoading && !forceLoaded;
  
  // Get highest priority role with fallback
  const roles = userRoles?.map(r => r.role) || ['client'];
  const role = roles.includes('admin') ? 'admin' : 
               roles.includes('trainer') ? 'trainer' : 
               'client';
  
  return {
    ...context,
    
    // Role helpers
    role,
    roles,
    rolesLoading: effectiveRolesLoading,
    isTrainer: roles.includes('trainer') || roles.includes('admin'),
    isAdmin: roles.includes('admin'),
    isClient: !roles.includes('trainer') && !roles.includes('admin'),
  };
};