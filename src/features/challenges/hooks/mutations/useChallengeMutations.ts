/**
 * Challenge Mutations Hook
 * Provides mutation functions for challenge operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { challengeKeys } from '../keys';
import { 
  joinChallenge, 
  leaveChallenge, 
  createChallenge, 
  updateChallenge, 
  deleteChallenge,
  extendChallenge 
} from '../../services/challenges.service';
import type { ChallengeCreateInput, ChallengeUpdateInput } from '../../types';
import { toast } from 'sonner';

export function useChallengeMutations() {
  const queryClient = useQueryClient();

  const joinChallengeMutation = useMutation({
    mutationFn: ({ 
      challengeId, 
      userId, 
      difficultyLevel 
    }: { 
      challengeId: string; 
      userId: string; 
      difficultyLevel?: number;
    }) => joinChallenge(challengeId, userId, difficultyLevel),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: challengeKeys.participants() });
      toast.success('Successfully joined challenge!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to join challenge: ${error.message}`);
    },
  });

  const leaveChallengeMutation = useMutation({
    mutationFn: ({ challengeId, userId }: { challengeId: string; userId: string }) => 
      leaveChallenge(challengeId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: challengeKeys.participants() });
      toast.success('Left challenge');
    },
    onError: (error: Error) => {
      toast.error(`Failed to leave challenge: ${error.message}`);
    },
  });

  const createChallengeMutation = useMutation({
    mutationFn: (data: ChallengeCreateInput) => createChallenge(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.all });
      toast.success('Challenge created!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create challenge: ${error.message}`);
    },
  });

  const updateChallengeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChallengeUpdateInput }) => 
      updateChallenge(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: challengeKeys.lists() });
      toast.success('Challenge updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update challenge: ${error.message}`);
    },
  });

  const deleteChallengeMutation = useMutation({
    mutationFn: (id: string) => deleteChallenge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.all });
      toast.success('Challenge deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete challenge: ${error.message}`);
    },
  });

  const extendChallengeMutation = useMutation({
    mutationFn: ({ challengeId, days }: { challengeId: string; days?: number }) => 
      extendChallenge(challengeId, days),
    onSuccess: (data, { challengeId }) => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.detail(challengeId) });
      queryClient.invalidateQueries({ queryKey: challengeKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to extend challenge: ${error.message}`);
    },
  });

  return {
    joinChallenge: joinChallengeMutation,
    leaveChallenge: leaveChallengeMutation,
    createChallenge: createChallengeMutation,
    updateChallenge: updateChallengeMutation,
    deleteChallenge: deleteChallengeMutation,
    extendChallenge: extendChallengeMutation,
  };
}
