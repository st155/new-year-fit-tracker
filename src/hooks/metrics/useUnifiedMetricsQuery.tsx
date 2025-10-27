import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const metricsQueryKeys = {
  all: ['metrics'] as const,
  unified: (userId: string) => [...metricsQueryKeys.all, 'unified', userId] as const,
  filtered: (userId: string, filters: {
    metricName?: string;
    startDate?: string;
    endDate?: string;
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
}

export function useUnifiedMetricsQuery(
  userId: string | undefined,
  options?: {
    metricName?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  return useQuery({
    queryKey: metricsQueryKeys.filtered(userId!, {
      metricName: options?.metricName,
      startDate: options?.startDate?.toISOString().split('T')[0],
      endDate: options?.endDate?.toISOString().split('T')[0],
    }),
    queryFn: async () => {
      let query = supabase
        .from('client_unified_metrics')
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
        .order('created_at', { ascending: false })
        .order('priority', { ascending: true });

      if (error) throw error;
      return data as UnifiedMetric[];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
  });
}
