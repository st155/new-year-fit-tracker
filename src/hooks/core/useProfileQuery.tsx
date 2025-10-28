import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const profileQueryKeys = {
  all: ['profiles'] as const,
  profile: (userId: string) => [...profileQueryKeys.all, userId] as const,
};

export function useProfileQuery(userId: string | undefined) {
  return useQuery({
    queryKey: profileQueryKeys.profile(userId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId!)
        .single();
      
      if (error) {
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
      return data;
    },
    enabled: !!userId,
    throwOnError: false, // ✅ Don't throw error during rendering
    staleTime: 10 * 60 * 1000, // Profile rarely changes
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });
}
