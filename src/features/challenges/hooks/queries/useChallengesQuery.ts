/**
 * Challenges Query Hook
 * Fetches all active challenges with participation status
 */

import { useQuery } from '@tanstack/react-query';
import { challengeKeys } from '../keys';
import { getChallenges } from '../../services/challenges.service';

export function useChallengesQuery(userId?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: challengeKeys.list(userId || ''),
    queryFn: () => getChallenges(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    challenges: data,
    isLoading,
    error,
    refetch,
  };
}
