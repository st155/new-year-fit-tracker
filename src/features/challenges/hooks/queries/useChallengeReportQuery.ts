/**
 * Challenge Report Query Hook
 * Fetches comprehensive challenge report for a user
 */

import { useQuery } from '@tanstack/react-query';
import { challengeKeys } from '../keys';
import { getChallengeReport } from '../../services/challenges.service';
import type { ChallengeReportOptions } from '../../types';

export function useChallengeReportQuery(
  challengeId: string | undefined,
  userId: string | undefined,
  options?: ChallengeReportOptions
) {
  const isPreview = options?.preview ?? false;

  return useQuery({
    queryKey: challengeKeys.report(challengeId || '', userId || '', isPreview),
    queryFn: () => getChallengeReport(challengeId!, userId!, isPreview),
    enabled: !!challengeId && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
