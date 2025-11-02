/**
 * Challenge Progress Hook
 * Fetches user's challenge participation and rankings
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useChallengeProgress(userId?: string) {
  return useQuery({
    queryKey: ['challenge-progress', userId],
    queryFn: async () => {
      if (!userId) return [];

      // For now, return empty array as challenge tables may not have expected schema
      // This can be implemented when challenge feature schema is finalized
      return [];

      // TODO: Implement when challenge_participants schema is confirmed
      // const { data: participations, error } = await supabase
      //   .from('challenge_participants')
      //   .select(`
      //     id,
      //     user_id,
      //     challenge_id,
      //     challenges (
      //       id,
      //       title,
      //       description
      //     )
      //   `)
      //   .eq('user_id', userId);
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
}
