import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/hooks/useAuth';
import type { DateRange } from '@/types/metrics';
import { UnifiedDataFetcherV2, type MetricWithConfidence } from '@/lib/data-quality';

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
  minConfidence?: number;    // NEW: Filter by minimum confidence
  withQuality?: boolean;      // NEW: Return MetricWithConfidence
  userId?: string;            // NEW: Override user ID for viewing other profiles
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
  const { metricTypes, dateRange, enabled = true, minConfidence = 0, withQuality = false, userId: overrideUserId } = options;
  const fetcher = new UnifiedDataFetcherV2(supabase);
  
  // Use override userId if provided, otherwise use authenticated user
  const effectiveUserId = overrideUserId ?? user?.id;

  // ===== Latest Metrics (with quality if requested) =====
  const latest = useQuery({
    queryKey: [...queryKeys.metrics.latest(effectiveUserId ?? '', metricTypes ?? []), 'with-quality', withQuality],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      if (withQuality) {
        // Use enhanced fetcher with confidence scoring
        const metricsWithConfidence = await fetcher.getLatestUnifiedMetrics(
          effectiveUserId,
          metricTypes
        );
        
        // Filter by min confidence
        return minConfidence > 0
          ? metricsWithConfidence.filter(m => m.confidence >= minConfidence)
          : metricsWithConfidence;
      }

      // Direct query to unified_metrics
      let query = supabase
        .from('unified_metrics')
        .select('*')
        .eq('user_id', effectiveUserId);

      if (metricTypes && metricTypes.length > 0) {
        query = query.in('metric_name', metricTypes);
      }

      const { data, error } = await query
        .order('metric_name')
        .order('measurement_date', { ascending: false })
        .order('priority', { ascending: true })
        .order('confidence_score', { ascending: false });

      if (error) throw error;

      // Deduplicate: keep only first (latest) for each metric_name
      const seen = new Set<string>();
      return (data || []).filter(metric => {
        if (seen.has(metric.metric_name)) return false;
        seen.add(metric.metric_name);
        return true;
      });
    },
    enabled: enabled && !!effectiveUserId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // ===== History (if dateRange specified) =====
  const history = useQuery({
    queryKey: queryKeys.metrics.history(effectiveUserId ?? '', { metricTypes, dateRange }),
    queryFn: async () => {
      if (!effectiveUserId) return [];

      let query = supabase
        .from('unified_metrics')
        .select('*')
        .eq('user_id', effectiveUserId);

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
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: enabled && !!effectiveUserId && !!dateRange,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // ===== Helper: Get specific metric =====
  const getMetric = (metricName: string): MetricData | undefined => {
    if (!latest.data) return undefined;
    
    if (withQuality) {
      const metricWithQuality = (latest.data as MetricWithConfidence[]).find(
        m => m.metric.metric_name === metricName
      );
      if (!metricWithQuality) return undefined;
      
      // Convert to MetricData format
      return {
        user_id: metricWithQuality.metric.user_id,
        metric_name: metricWithQuality.metric.metric_name,
        value: metricWithQuality.metric.value,
        measurement_date: metricWithQuality.metric.measurement_date,
        source: metricWithQuality.metric.source as string,
        unit: metricWithQuality.metric.unit,
        priority: metricWithQuality.metric.priority || 0,
        created_at: metricWithQuality.metric.created_at,
      };
    }
    
    return (latest.data as any[])?.find((m: any) => m.metric_name === metricName);
  };

  // ===== Helper: Get metric history =====
  const getMetricHistory = (metricName: string): MetricData[] => {
    if (!history.data) return [];
    return (history.data as any[]).filter((m: any) => m.metric_name === metricName);
  };

  // ===== Mutation: Add metric =====
  const addMetricMutation = useMutation({
    mutationFn: async (metric: Partial<MetricData>) => {
      const { data, error } = await supabase
        .from('unified_metrics')
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

  // ===== NEW: Quality helpers =====
  const getMetricWithQuality = (metricName: string): MetricWithConfidence | undefined => {
    if (!withQuality) return undefined;
    return (latest.data as MetricWithConfidence[])?.find(m => m.metric.metric_name === metricName);
  };

  const hasGoodQuality = (metricName: string): boolean => {
    const metric = getMetricWithQuality(metricName);
    return metric ? metric.confidence >= 70 : false;
  };

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
    
    // NEW: Quality helpers
    getMetricWithQuality,
    hasGoodQuality,
    qualitySummary: withQuality ? (latest.data as MetricWithConfidence[])?.map(m => ({
      metricName: m.metric.metric_name,
      confidence: m.confidence,
      source: m.metric.source,
      factors: m.factors,
    })) : undefined,
    
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
export function useMetricHistory(metricTypes: string[], dateRange: DateRange, userId?: string) {
  return useMetrics({ metricTypes, dateRange, userId });
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
