/**
 * Challenge Progress Query Hook
 * Fetches user's challenge participation and progress
 */

import { useQuery } from '@tanstack/react-query';
import { challengeKeys } from '../keys';
import { getChallengeProgress } from '../../services/challenges.service';

export function useChallengeProgressQuery(userId?: string) {
  return useQuery({
    queryKey: challengeKeys.progress(userId || ''),
    queryFn: () => getChallengeProgress(userId!),
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
}
