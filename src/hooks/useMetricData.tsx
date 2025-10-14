import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseMetricDataOptions {
  userId?: string;
  metricName?: string;
  metricCategory?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

interface MetricData {
  value: number;
  measurement_date: string;
  source?: string;
  [key: string]: any;
}

export function useMetricData({
  userId,
  metricName,
  metricCategory,
  startDate,
  endDate,
  limit = 100,
}: UseMetricDataOptions) {
  const [data, setData] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchMetricData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query
        let query = supabase
          .from('metric_values')
          .select(`
            *,
            user_metrics!inner (
              metric_name,
              metric_category,
              source,
              unit
            )
          `)
          .eq('user_id', userId)
          .order('measurement_date', { ascending: false })
          .limit(limit);

        // Add filters
        if (metricName) {
          query = query.eq('user_metrics.metric_name', metricName);
        }

        if (metricCategory) {
          query = query.eq('user_metrics.metric_category', metricCategory);
        }

        if (startDate) {
          query = query.gte('measurement_date', startDate.toISOString().split('T')[0]);
        }

        if (endDate) {
          query = query.lte('measurement_date', endDate.toISOString().split('T')[0]);
        }

        const { data: metrics, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setData(metrics || []);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching metric data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetricData();
  }, [userId, metricName, metricCategory, startDate, endDate, limit]);

  return { data, loading, error };
}
