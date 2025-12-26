/**
 * Trainer Challenges Query Hook
 * Fetches challenges where user is creator or assigned trainer
 */

import { useQuery } from '@tanstack/react-query';
import { challengeKeys } from '../keys';
import { getTrainerChallenges } from '../../services/challenges.service';

export function useTrainerChallengesQuery(trainerId?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: challengeKeys.trainer(trainerId || ''),
    queryFn: () => getTrainerChallenges(trainerId!),
    enabled: !!trainerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    challenges: data || [],
    isLoading,
    error,
    refetch,
  };
}
