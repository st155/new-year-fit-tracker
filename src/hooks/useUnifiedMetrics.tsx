import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UnifiedMetric {
  user_id: string;
  metric_name: string;
  value: number;
  measurement_date: string;
  source: string;
  unit: string;
  priority: number;
}

export const useUnifiedMetrics = (userId: string | undefined, metricName?: string, startDate?: Date, endDate?: Date) => {
  const [metrics, setMetrics] = useState<UnifiedMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMetrics = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('client_unified_metrics')
        .select('*')
        .eq('user_id', userId);

      if (metricName) {
        query = query.eq('metric_name', metricName);
      }

      if (startDate) {
        query = query.gte('measurement_date', startDate.toISOString().split('T')[0]);
      }

      if (endDate) {
        query = query.lte('measurement_date', endDate.toISOString().split('T')[0]);
      }

      const { data, error: queryError } = await query.order('measurement_date', { ascending: false });

      if (queryError) throw queryError;
      setMetrics(data || []);
      setError(null);
    } catch (err) {
      console.error('Error loading unified metrics:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [userId, metricName, startDate?.toISOString(), endDate?.toISOString()]);

  return { metrics, loading, error, refetch: loadMetrics };
};

// Hook for getting latest value of a specific metric
export const useLatestMetric = (userId: string | undefined, metricName: string) => {
  const { metrics, loading, error } = useUnifiedMetrics(userId, metricName);
  
  return {
    value: metrics[0]?.value,
    source: metrics[0]?.source,
    unit: metrics[0]?.unit,
    date: metrics[0]?.measurement_date,
    loading,
    error
  };
};
