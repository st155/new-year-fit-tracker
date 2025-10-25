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
  console.log('🔧 [ProfileProvider] Initializing');
  
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = async () => {
    console.log('👤 [ProfileProvider] Fetching profile', { 
      userId: user?.id,
      timestamp: new Date().toISOString() 
    });

    if (!user) {
      console.log('⚠️ [ProfileProvider] No user, skipping profile fetch');
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
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
        console.error('❌ [ProfileProvider] Database error:', dbError);
        throw dbError;
      }

      console.log('✅ [ProfileProvider] Profile fetched successfully', { 
        username: data?.username,
        trainerRole: data?.trainer_role 
      });
      
      setProfile(data);
      setError(null);
    } catch (err) {
      const error = err as Error;
      console.error('💥 [ProfileProvider] Error fetching profile:', {
        message: error.message,
        stack: error.stack,
        userId: user.id
      });
      
      setProfile(null);
      setError(error);
    } finally {
      setLoading(false);
      console.log('🏁 [ProfileProvider] Fetch completed');
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  if (error && !profile) {
    console.warn('⚠️ [ProfileProvider] Rendering with error state, providing fallback');
  }

  return (
    <ProfileContext.Provider value={{ profile, loading, refetch: fetchProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  
  if (context === undefined) {
    console.error('💥 [useProfile] Called outside ProfileProvider! Returning fallback');
    
    // Return fallback instead of throwing
    return {
      profile: null,
      loading: false,
      refetch: async () => {
        console.warn('⚠️ [useProfile] Fallback refetch called - ProfileProvider not available');
      }
    };
  }
  
  return context;
}
