/**
 * Protocol Mutation Hooks
 * 
 * React Query mutations for protocol operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { protocolsService } from '@/services/biostack.service';
import { biostackQueryKeys, getBiostackInvalidationKeys } from '../../constants/query-keys';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { CreateProtocolInput, ProtocolDTO } from '../../types';

/**
 * Create a new protocol
 */
export function useCreateProtocol() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (protocol: Record<string, unknown>) =>
      protocolsService.createProtocol(protocol),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: biostackQueryKeys.protocols.all });
      }
      toast.success('Protocol created successfully');
    },
    onError: (error) => {
      console.error('Error creating protocol:', error);
      toast.error('Failed to create protocol');
    },
  });
}

/**
 * Create protocol from parsed data (AI/doctor message)
 */
export function useCreateProtocolFromParsed() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
      toast.error('Failed to create protocol');
    },
  });
}

/**
 * Activate a protocol
 */
export function useActivateProtocol() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (protocolId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      return protocolsService.activateProtocol(user.id, protocolId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.protocols.all });
      toast.success('Protocol activated');
    },
    onError: (error) => {
      console.error('Error activating protocol:', error);
      toast.error('Failed to activate protocol');
    },
  });
}

/**
 * Deactivate a protocol
 */
export function useDeactivateProtocol() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (protocolId: string) =>
      protocolsService.deactivateProtocol(protocolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.protocols.all });
      toast.success('Protocol deactivated');
    },
    onError: (error) => {
      console.error('Error deactivating protocol:', error);
      toast.error('Failed to deactivate protocol');
    },
  });
}

/**
 * Toggle protocol status
 */
export function useToggleProtocol() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ protocolId, currentStatus }: { protocolId: string; currentStatus: boolean }) =>
      protocolsService.toggleProtocol(protocolId, currentStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.protocols.all });
      toast.success('Protocol status updated');
    },
    onError: (error) => {
      console.error('Error toggling protocol:', error);
      toast.error('Failed to update protocol');
    },
  });
}

/**
 * Delete a protocol
 */
export function useDeleteProtocol() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (protocolId: string) =>
      protocolsService.deleteProtocol(protocolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.protocols.all });
      toast.success('Protocol deleted');
    },
    onError: (error) => {
      console.error('Error deleting protocol:', error);
      toast.error('Failed to delete protocol');
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
