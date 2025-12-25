/**
 * Logs Query Hooks
 * 
 * React Query hooks for fetching supplement logs and adherence data
 */

import { useQuery } from '@tanstack/react-query';
import { biostackQueryKeys } from '../../constants/query-keys';
import { logsService } from '@/services/biostack.service';
import type { AdherenceStatsDTO, BiostackQueryOptions } from '../../types';

/**
 * Fetch today's schedule
 */
export function useTodayScheduleQuery(
  userId: string | undefined,
  options?: BiostackQueryOptions
) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return useQuery({
    queryKey: biostackQueryKeys.logs.today(userId || '', todayStart.toISOString()),
    queryFn: () => logsService.fetchTodaySchedule(userId!),
    enabled: !!userId && (options?.enabled !== false),
  });
}

/**
 * Fetch adherence stats
 */
export function useAdherenceStatsQuery(
  userId: string | undefined,
  options?: BiostackQueryOptions
) {
  return useQuery({
    queryKey: biostackQueryKeys.logs.adherenceStats(userId || ''),
    queryFn: () => logsService.fetchAdherenceStats(userId!),
    enabled: !!userId && (options?.enabled !== false),
  });
}

/**
 * Combined hook for logs data (matches legacy useSupplementLogs)
 */
export function useSupplementLogsQuery(userId: string | undefined) {
  const scheduleQuery = useTodayScheduleQuery(userId);
  const adherenceQuery = useAdherenceStatsQuery(userId);

  return {
    todaySchedule: scheduleQuery.data,
    adherenceStats: adherenceQuery.data,
    isLoading: scheduleQuery.isLoading,
  };
}
