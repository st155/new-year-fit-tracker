/**
 * Challenge Detail Query Hook
 * Fetches a single challenge by ID
 */

import { useQuery } from '@tanstack/react-query';
import { challengeKeys } from '../keys';
import { getChallengeById } from '../../services/challenges.service';

export function useChallengeDetailQuery(challengeId?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: challengeKeys.detail(challengeId || ''),
    queryFn: () => getChallengeById(challengeId!),
    enabled: !!challengeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    challenge: data,
    isLoading,
    error,
  };
}
