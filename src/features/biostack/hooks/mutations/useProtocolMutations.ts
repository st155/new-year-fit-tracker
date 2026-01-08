/**
 * Protocol Mutation Hooks
 * 
 * React Query mutations for protocol operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { protocolsService } from '@/services/biostack.service';
import { biostackQueryKeys } from '../../constants/query-keys';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { CreateProtocolInput } from '../../types';

/**
 * Create a new protocol
 */
export function useCreateProtocol() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation('biostack');

  return useMutation({
    mutationFn: (protocol: Record<string, unknown>) =>
      protocolsService.createProtocol(protocol),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: biostackQueryKeys.protocols.all });
      }
      toast.success(t('toast.protocolCreatedSuccess'));
    },
    onError: (error) => {
      console.error('Error creating protocol:', error);
      toast.error(t('toast.failedCreateProtocol'));
    },
  });
}

/**
 * Create protocol from parsed data (AI/doctor message)
 */
export function useCreateProtocolFromParsed() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation('biostack');

  return useMutation({
    mutationFn: (input: CreateProtocolInput) => {
      if (!user?.id) throw new Error('Not authenticated');
      return protocolsService.createProtocolFromParsed(user.id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.protocols.all });
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.library.all });
    },
    onError: (error) => {
      console.error('Error creating protocol from parsed data:', error);
      toast.error(t('toast.failedCreateProtocol'));
    },
  });
}

/**
 * Activate a protocol
 */
export function useActivateProtocol() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation('biostack');

  return useMutation({
    mutationFn: (protocolId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      return protocolsService.activateProtocol(user.id, protocolId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.protocols.all });
      toast.success(t('toast.protocolActivated'));
    },
    onError: (error) => {
      console.error('Error activating protocol:', error);
      toast.error(t('toast.failedActivateProtocol'));
    },
  });
}

/**
 * Deactivate a protocol
 */
export function useDeactivateProtocol() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('biostack');

  return useMutation({
    mutationFn: (protocolId: string) =>
      protocolsService.deactivateProtocol(protocolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.protocols.all });
      toast.success(t('toast.protocolDeactivated'));
    },
    onError: (error) => {
      console.error('Error deactivating protocol:', error);
      toast.error(t('toast.failedDeactivateProtocol'));
    },
  });
}

/**
 * Toggle protocol status
 */
export function useToggleProtocol() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('biostack');

  return useMutation({
    mutationFn: ({ protocolId, currentStatus }: { protocolId: string; currentStatus: boolean }) =>
      protocolsService.toggleProtocol(protocolId, currentStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.protocols.all });
      toast.success(t('toast.protocolStatusUpdated'));
    },
    onError: (error) => {
      console.error('Error toggling protocol:', error);
      toast.error(t('toast.failedUpdateProtocol'));
    },
  });
}

/**
 * Delete a protocol
 */
export function useDeleteProtocol() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('biostack');

  return useMutation({
    mutationFn: (protocolId: string) =>
      protocolsService.deleteProtocol(protocolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.protocols.all });
      toast.success(t('toast.protocolDeleted'));
    },
    onError: (error) => {
      console.error('Error deleting protocol:', error);
      toast.error(t('toast.failedDeleteProtocol'));
    },
  });
}

/**
 * Combined mutations hook (matches legacy useSupplementProtocol)
 */
export function useProtocolMutations() {
  return {
    createProtocol: useCreateProtocol(),
    createProtocolFromParsed: useCreateProtocolFromParsed(),
    activateProtocol: useActivateProtocol(),
    deactivateProtocol: useDeactivateProtocol(),
    toggleProtocol: useToggleProtocol(),
    deleteProtocol: useDeleteProtocol(),
  };
}
