/**
 * Preferred Challenge Query Hook
 * Gets the user's currently preferred/active challenge
 */

import { useQuery } from '@tanstack/react-query';
import { challengeKeys } from '../keys';
import { supabase } from '@/integrations/supabase/client';

async function getPreferredChallenge(userId: string) {
  // Get challenges where user is a participant
  const { data: participations, error: partError } = await supabase
    .from('challenge_participants')
    .select(`
      challenge_id,
      joined_at,
      challenges (
        id,
        title,
        description,
        start_date,
        end_date,
        is_active
      )
    `)
    .eq('user_id', userId);

  if (partError) throw partError;

  // Filter active challenges
  const now = new Date().toISOString().split('T')[0];
  const activeChallenges = participations
    ?.filter(p => {
      const challenge = p.challenges as any;
      return (
        challenge?.is_active && 
        challenge?.start_date <= now && 
        challenge?.end_date >= now
      );
    })
    .map(p => p.challenges) || [];

  // Return the first active challenge (most recently joined)
  if (activeChallenges.length > 0) {
    return activeChallenges[0];
  }

  // If no active participation, get any active challenge
  const { data: anyChallenge, error: anyError } = await supabase
    .from('challenges')
    .select('*')
    .eq('is_active', true)
    .lte('start_date', now)
    .gte('end_date', now)
    .limit(1)
    .maybeSingle();

  if (anyError) throw anyError;

  return anyChallenge;
}

export function usePreferredChallengeQuery(userId?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: challengeKeys.preferred(userId || ''),
    queryFn: () => getPreferredChallenge(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    challenge: data,
    isLoading,
    error,
    refetch,
  };
}
