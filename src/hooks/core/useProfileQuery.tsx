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
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // Profile rarely changes
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });
}
