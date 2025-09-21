import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  console.log('AuthProvider rendering...');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  console.log('AuthProvider: user =', user, 'loading =', loading);

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
          toast({
            title: "Добро пожаловать!",
            description: `Вы вошли как ${session.user.email}`,
          });

          // Deferred Whoop sync after login
          setTimeout(async () => {
            try {
              const raw = localStorage.getItem('whoop_pending_code');
              if (raw) {
                const { code } = JSON.parse(raw);
                if (code) {
                  const { data: { session: current } } = await supabase.auth.getSession();
                  const { error } = await supabase.functions.invoke('whoop-integration', {
                    body: { action: 'sync', code },
                    headers: current?.access_token ? { Authorization: `Bearer ${current.access_token}` } : undefined
                  });

                  if (!error) {
                    localStorage.removeItem('whoop_pending_code');
                    toast({
                      title: 'Whoop подключен!',
                      description: 'Данные Whoop синхронизируются.'
                    });
                    setTimeout(() => { window.location.assign('/progress'); }, 500);
                  } else {
                    console.error('Whoop sync after login failed:', error);
                  }
                }
              }
            } catch (e) {
              console.error('Deferred post-login task error:', e);
            }
          }, 0);
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
  }, [toast]);

  const signUp = async (email: string, password: string, username: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
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
      toast({
        title: "Ошибка регистрации",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Проверьте почту",
        description: "Мы отправили вам ссылку для подтверждения"
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
        title: "Ошибка входа",
        description: error.message,
        variant: "destructive"
      });
    }

    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      console.log('Initiating Google OAuth...');
      
      // Use current URL origin for better compatibility
      const baseUrl = window.location.origin;
      const redirectTo = `${baseUrl}/`;
      
      console.log('Redirect URL:', redirectTo);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('Google auth error:', error);
        
        // Handle specific error cases
        if (error.message.includes('requested path is invalid')) {
          toast({
            title: "Ошибка конфигурации",
            description: "Проверьте настройки Site URL и Redirect URLs в Supabase Authentication > URL Configuration",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Ошибка входа через Google",
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
        title: "Ошибка входа через Google", 
        description: "Убедитесь, что Site URL и Redirect URLs настроены правильно в Supabase",
        variant: "destructive"
      });
      return { error: err };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast({
        title: "Ошибка выхода",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "До свидания!",
        description: "Вы успешно вышли из системы"
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
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};