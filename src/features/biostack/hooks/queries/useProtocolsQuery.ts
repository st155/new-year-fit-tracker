/**
 * Protocol Query Hooks
 * 
 * React Query hooks for fetching protocol data
 */

import { useQuery } from '@tanstack/react-query';
import { biostackQueryKeys } from '../../constants/query-keys';
import { protocolsService } from '@/services/biostack.service';
import type { ProtocolDTO, ActiveProtocolDTO, BiostackQueryOptions } from '../../types';

/**
 * Fetch active protocols with progress (user_stack based)
 */
export function useActiveProtocolsQuery(
  userId: string | undefined,
  options?: BiostackQueryOptions
) {
  return useQuery({
    queryKey: biostackQueryKeys.protocols.active(userId || ''),
    queryFn: () => protocolsService.fetchActiveProtocols(userId!),
    enabled: !!userId && (options?.enabled !== false),
    staleTime: options?.staleTime ?? 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch active protocol (protocols table based)
 */
export function useActiveProtocolV2Query(
  userId: string | undefined,
  options?: BiostackQueryOptions
) {
  return useQuery({
    queryKey: biostackQueryKeys.protocols.activeV2(userId || ''),
    queryFn: () => protocolsService.fetchActiveProtocolV2(userId!),
    enabled: !!userId && (options?.enabled !== false),
    staleTime: 0, // Always refetch
  });
}

/**
 * Fetch protocol history
 */
export function useProtocolHistoryQuery(
  userId: string | undefined,
  options?: BiostackQueryOptions
) {
  return useQuery({
    queryKey: biostackQueryKeys.protocols.history(userId || ''),
    queryFn: () => protocolsService.fetchProtocolHistory(userId!),
    enabled: !!userId && (options?.enabled !== false),
    staleTime: 0,
  });
}

/**
 * Fetch protocols for management
 */
export function useProtocolManagementQuery(
  userId: string | undefined,
  options?: BiostackQueryOptions
) {
  return useQuery({
    queryKey: biostackQueryKeys.protocols.management(userId || ''),
    queryFn: () => protocolsService.fetchProtocolsForManagement(userId!),
    enabled: !!userId && (options?.enabled !== false),
  });
}

/**
 * Combined hook for protocol data (matches legacy useSupplementProtocol)
 */
export function useSupplementProtocolQuery(userId: string | undefined) {
  const activeProtocolQuery = useActiveProtocolV2Query(userId);
  const historyQuery = useProtocolHistoryQuery(userId);

  return {
    activeProtocol: activeProtocolQuery.data ?? null,
    protocolHistory: historyQuery.data ?? [],
    isLoading: activeProtocolQuery.isLoading || historyQuery.isLoading,
    isLoadingActive: activeProtocolQuery.isLoading,
    isLoadingHistory: historyQuery.isLoading,
    errorActive: activeProtocolQuery.error,
    errorHistory: historyQuery.error,
    refetchAll: async () => {
      await Promise.all([
        activeProtocolQuery.refetch(),
        historyQuery.refetch(),
      ]);
    },
  };
}
