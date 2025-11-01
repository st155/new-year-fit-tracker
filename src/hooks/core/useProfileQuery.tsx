import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const profileQueryKeys = {
  all: ['profiles'] as const,
  profile: (userId: string) => [...profileQueryKeys.all, userId] as const,
};

export function useProfileQuery(userId: string | undefined) {
  return useQuery({
    queryKey: profileQueryKeys.profile(userId || ''),
    queryFn: async () => {
      // ✅ Early return for empty userId
      if (!userId) return null;
      
      console.log('🔄 [useProfileQuery] Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('❌ [useProfileQuery] Error details:', error);
        
        // Handle "not found" gracefully - return null instead of throwing
        if (error.code === 'PGRST116' || error.message?.includes('406')) {
          if (import.meta.env.DEV) {
            console.warn('⚠️ [useProfileQuery] Profile not found for user:', userId);
          }
          return null;
        }
        
        // Handle RLS permission denied (403)
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          if (import.meta.env.DEV) {
            console.error('🔒 [useProfileQuery] Permission denied for user:', userId);
          }
          return null;
        }
        
        // Log other errors only in dev
        if (import.meta.env.DEV) {
          console.error('❌ [useProfileQuery] Error loading profile:', error);
        }
        throw error;
      }
      
      console.log('✅ [useProfileQuery] Profile loaded:', data);
      return data;
    },
    enabled: !!userId,
    throwOnError: false, // ✅ Don't throw error during rendering
    staleTime: 0, // ✅ Always refetch for fresh data
    gcTime: 5 * 60 * 1000, // ✅ Reduced from 30 to 5 minutes
    refetchOnMount: 'always', // ✅ Force refetch on mount
    retry: 3, // ✅ Increased retries
  });
}
