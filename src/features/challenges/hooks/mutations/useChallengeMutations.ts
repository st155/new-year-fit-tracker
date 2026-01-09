/**
 * Challenge Mutations Hook
 * Provides mutation functions for challenge operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('challenges');

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
      toast.success(t('toast.joinedSuccess'));
    },
    onError: (error: Error) => {
      toast.error(t('toast.joinFailed', { error: error.message }));
    },
  });

  const leaveChallengeMutation = useMutation({
    mutationFn: ({ challengeId, userId }: { challengeId: string; userId: string }) => 
      leaveChallenge(challengeId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: challengeKeys.participants() });
      toast.success(t('toast.leftChallenge'));
    },
    onError: (error: Error) => {
      toast.error(t('toast.leaveFailed', { error: error.message }));
    },
  });

  const createChallengeMutation = useMutation({
    mutationFn: (data: ChallengeCreateInput) => createChallenge(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.all });
      toast.success(t('toast.challengeCreated'));
    },
    onError: (error: Error) => {
      toast.error(t('toast.createFailed', { error: error.message }));
    },
  });

  const updateChallengeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChallengeUpdateInput }) => 
      updateChallenge(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: challengeKeys.lists() });
      toast.success(t('toast.challengeUpdated'));
    },
    onError: (error: Error) => {
      toast.error(t('toast.updateFailed', { error: error.message }));
    },
  });

  const deleteChallengeMutation = useMutation({
    mutationFn: (id: string) => deleteChallenge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.all });
      toast.success(t('toast.challengeDeleted'));
    },
    onError: (error: Error) => {
      toast.error(t('toast.deleteFailed', { error: error.message }));
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
      toast.error(t('toast.extendFailed', { error: error.message }));
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
