/**
 * Library Query Hooks
 * 
 * React Query hooks for fetching supplement library data
 */

import { useQuery } from '@tanstack/react-query';
import { biostackQueryKeys } from '../../constants/query-keys';
import { libraryService } from '@/services/biostack.service';
import { useAuth } from '@/hooks/useAuth';
import type { LibraryEntryDTO, LibraryStatsDTO, BiostackQueryOptions } from '../../types';

/**
 * Fetch user's supplement library
 */
export function useSupplementLibraryQuery(options?: BiostackQueryOptions) {
  const { user } = useAuth();

  return useQuery({
    queryKey: biostackQueryKeys.library.list(user?.id),
    queryFn: () => libraryService.fetchLibrary(user!.id),
    enabled: !!user?.id && (options?.enabled !== false),
    staleTime: options?.staleTime ?? 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch library stats
 */
export function useLibraryStatsQuery(options?: BiostackQueryOptions) {
  const { user } = useAuth();

  return useQuery({
    queryKey: biostackQueryKeys.library.stats(user?.id),
    queryFn: () => libraryService.fetchLibraryStats(user!.id),
    enabled: !!user?.id && (options?.enabled !== false),
  });
}
