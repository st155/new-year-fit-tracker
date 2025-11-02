import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedDataFetcherV2 } from '@/lib/data-quality/unified-data-fetcher-v2';
import type { MetricWithConfidence } from '@/lib/data-quality';

export const metricsQueryKeys = {
  all: ['metrics'] as const,
  unified: (userId: string) => [...metricsQueryKeys.all, 'unified', userId] as const,
  filtered: (userId: string, filters: {
    metricName?: string;
    startDate?: string;
    endDate?: string;
    useV2?: boolean;
    minConfidence?: number;
  }) => [...metricsQueryKeys.unified(userId), filters] as const,
};

export interface UnifiedMetric {
  user_id: string;
  metric_name: string;
  value: number;
  measurement_date: string;
  source: string;
  unit: string;
  priority: number;
  created_at?: string;
  confidence_score?: number;
  conflict_group?: string;
  is_primary?: boolean;
}

export function useUnifiedMetricsQuery(
  userId: string | undefined,
  options?: {
    metricName?: string;
    startDate?: Date;
    endDate?: Date;
    useV2?: boolean;
    minConfidence?: number;
  }
) {
  const useV2 = options?.useV2 ?? true;

  return useQuery({
    queryKey: metricsQueryKeys.filtered(userId!, {
      metricName: options?.metricName,
      startDate: options?.startDate?.toISOString().split('T')[0],
      endDate: options?.endDate?.toISOString().split('T')[0],
      useV2,
      minConfidence: options?.minConfidence,
    }),
    queryFn: async () => {
      if (useV2) {
        // V2: Use UnifiedDataFetcherV2 with confidence scoring
        const fetcher = new UnifiedDataFetcherV2(supabase);
        const metricTypes = options?.metricName ? [options.metricName] : undefined;
        
        const metrics = await fetcher.getLatestUnifiedMetrics(userId!, metricTypes);
        
        // Apply confidence filter if specified
        const filtered = options?.minConfidence 
          ? metrics.filter(m => m.confidence >= options.minConfidence!)
          : metrics;
        
        // Convert to UnifiedMetric[] for backward compatibility
        return filtered.map(m => ({
          ...m.metric,
          confidence_score: m.confidence,
          conflict_group: m.metric.metric_name,
          is_primary: true,
        })) as UnifiedMetric[];
      } else {
        // Legacy: Direct query
        let query = supabase
          .from('unified_metrics')
          .select('*')
          .eq('user_id', userId!);

        if (options?.metricName) {
          query = query.eq('metric_name', options.metricName);
        }

        if (options?.startDate) {
          query = query.gte('measurement_date', options.startDate.toISOString().split('T')[0]);
        }

        if (options?.endDate) {
          query = query.lte('measurement_date', options.endDate.toISOString().split('T')[0]);
        }

        const { data, error } = await query
          .order('measurement_date', { ascending: false })
          .order('priority', { ascending: true })
          .order('confidence_score', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as UnifiedMetric[];
      }
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds - more aggressive refresh for real-time data
    gcTime: 5 * 60 * 1000,
  });
}
