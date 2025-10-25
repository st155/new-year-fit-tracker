import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  trainer_role: boolean;
  [key: string]: any;
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );

      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const { data, error: dbError } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

      if (dbError) {
        throw dbError;
      }
      
      setProfile(data);
      setError(null);
    } catch (err) {
      const error = err as Error;
      if (import.meta.env.DEV) {
        console.error('💥 [ProfileProvider] Error:', error.message);
      }
      setProfile(null);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  return (
    <ProfileContext.Provider value={{ profile, loading, refetch: fetchProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  
  if (context === undefined) {
    if (import.meta.env.DEV) {
      console.error('💥 [useProfile] Called outside ProfileProvider!');
    }
    return {
      profile: null,
      loading: false,
      refetch: async () => {}
    };
  }
  
  return context;
}
