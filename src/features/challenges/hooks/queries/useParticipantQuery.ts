/**
 * Participant Query Hook
 * Checks if user is a participant in a challenge
 */

import { useQuery } from '@tanstack/react-query';
import { challengeKeys } from '../keys';
import { isParticipant } from '../../services/challenges.service';

export function useParticipantQuery(challengeId?: string, userId?: string) {
  return useQuery({
    queryKey: challengeKeys.participant(challengeId || '', userId || ''),
    queryFn: () => isParticipant(challengeId!, userId!),
    enabled: !!challengeId && !!userId,
    staleTime: 0, // Always fetch fresh data
  });
}
