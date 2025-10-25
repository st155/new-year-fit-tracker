import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/hooks/useAuth';
import type { DateRange } from '@/types/metrics';

/**
 * COMPOSITE: Unified metrics hook
 * 
 * Replaces:
 * - useMetricData
 * - useLatestMetrics (partial)
 * - useLatestMetric
 * 
 * Usage:
 * ```tsx
 * const { latest, history, getMetric, addMetric } = useMetrics({
 *   metricTypes: ['weight', 'body_fat'],
 *   dateRange: { start: '2025-01-01', end: '2025-10-26' }
 * });
 * ```
 */

interface UseMetricsOptions {
  metricTypes?: string[];
  dateRange?: DateRange;
  enabled?: boolean;
}

export interface MetricData {
  user_id: string;
  metric_name: string;
  value: number;
  measurement_date: string;
  source: string;
  unit: string;
  priority: number;
  created_at?: string;
}

export function useMetrics(options: UseMetricsOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { metricTypes, dateRange, enabled = true } = options;

  // ===== Latest Metrics =====
  const latest = useQuery({
    queryKey: queryKeys.metrics.latest(user?.id ?? '', metricTypes ?? []),
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('client_unified_metrics')
        .select('*')
        .eq('user_id', user.id);

      if (metricTypes && metricTypes.length > 0) {
        query = query.in('metric_name', metricTypes);
      }

      const { data, error } = await query
        .order('priority', { ascending: true })
        .order('measurement_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Deduplicate: keep only first (latest) for each metric_name
      const seen = new Set<string>();
      return (data || []).filter(metric => {
        if (seen.has(metric.metric_name)) return false;
        seen.add(metric.metric_name);
        return true;
      });
    },
    enabled: enabled && !!user?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // ===== History (if dateRange specified) =====
  const history = useQuery({
    queryKey: queryKeys.metrics.history(user?.id ?? '', { metricTypes, dateRange }),
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('client_unified_metrics')
        .select('*')
        .eq('user_id', user.id);

      if (metricTypes && metricTypes.length > 0) {
        query = query.in('metric_name', metricTypes);
      }

      if (dateRange) {
        query = query
          .gte('measurement_date', dateRange.start)
          .lte('measurement_date', dateRange.end);
      }

      const { data, error } = await query
        .order('measurement_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: enabled && !!user?.id && !!dateRange,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // ===== Helper: Get specific metric =====
  const getMetric = (metricName: string): MetricData | undefined => {
    return latest.data?.find(m => m.metric_name === metricName);
  };

  // ===== Helper: Get metric history =====
  const getMetricHistory = (metricName: string): MetricData[] => {
    if (!history.data) return [];
    return history.data.filter(m => m.metric_name === metricName);
  };

  // ===== Mutation: Add metric =====
  const addMetricMutation = useMutation({
    mutationFn: async (metric: Partial<MetricData>) => {
      const { data, error } = await supabase
        .from('client_unified_metrics')
        .insert(metric as any)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.metrics.unified(user?.id ?? ''),
      });
    },
  });

  return {
    // Data
    latest: latest.data ?? [],
    history: history.data ?? [],
    
    // Loading states
    isLoadingLatest: latest.isLoading,
    isLoadingHistory: history.isLoading,
    isLoading: latest.isLoading || (dateRange ? history.isLoading : false),
    
    // Error states
    error: latest.error || history.error,
    
    // Helpers
    getMetric,
    getMetricHistory,
    
    // Mutations
    addMetric: addMetricMutation.mutate,
    addMetricAsync: addMetricMutation.mutateAsync,
    isAddingMetric: addMetricMutation.isPending,
    
    // Refetch
    refetch: () => {
      latest.refetch();
      if (dateRange) history.refetch();
    },
  };
}

/**
 * Convenience: Latest metrics only (for dashboard widgets)
 */
export function useLatestMetricsOnly(metricTypes?: string[]) {
  return useMetrics({ metricTypes });
}

/**
 * Convenience: Metric history (for Progress charts)
 */
export function useMetricHistory(metricTypes: string[], dateRange: DateRange) {
  return useMetrics({ metricTypes, dateRange });
}

/**
 * Convenience: Single metric (for detail view)
 */
export function useSingleMetric(metricName: string) {
  const { latest, getMetric, ...rest } = useMetrics({ 
    metricTypes: [metricName] 
  });
  
  return {
    metric: getMetric(metricName),
    ...rest,
  };
}
