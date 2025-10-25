import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfileQuery } from '@/hooks/core/useProfileQuery';

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
  const { data: profile, isLoading: loading, refetch: queryRefetch } = useProfileQuery(user?.id);

  const refetch = async () => {
    await queryRefetch();
  };

  return (
    <ProfileContext.Provider value={{ profile: profile || null, loading, refetch }}>
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
