/**
 * Hook to fetch all available metrics from unified_metrics
 * Returns unique metrics with data point counts, sorted by count descending
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AvailableMetric {
  metric_name: string;
  data_points: number;
  latest_date: string | null;
}

export const availableMetricsKeys = {
  all: ['available-metrics'] as const,
  byUser: (userId: string) => ['available-metrics', userId] as const,
};

export function useAvailableMetrics(userId: string | undefined) {
  return useQuery({
    queryKey: availableMetricsKeys.byUser(userId || ''),
    queryFn: async (): Promise<AvailableMetric[]> => {
      if (!userId) return [];

      // Query to get distinct metrics with counts
      const { data, error } = await supabase
        .from('unified_metrics')
        .select('metric_name, measurement_date')
        .eq('user_id', userId);

      if (error) {
        console.error('[useAvailableMetrics] Error fetching metrics:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Aggregate by metric_name
      const metricMap = new Map<string, { count: number; latestDate: string | null }>();
      
      for (const row of data) {
        const existing = metricMap.get(row.metric_name);
        if (existing) {
          existing.count++;
          if (row.measurement_date && (!existing.latestDate || row.measurement_date > existing.latestDate)) {
            existing.latestDate = row.measurement_date;
          }
        } else {
          metricMap.set(row.metric_name, {
            count: 1,
            latestDate: row.measurement_date,
          });
        }
      }

      // Convert to array and sort by count descending
      const result: AvailableMetric[] = Array.from(metricMap.entries())
        .map(([metric_name, { count, latestDate }]) => ({
          metric_name,
          data_points: count,
          latest_date: latestDate,
        }))
        .sort((a, b) => b.data_points - a.data_points);

      return result;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}
