import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ViewMode = 'unified' | 'by_device';
export type DeviceFilter = 'all' | 'whoop' | 'withings' | 'garmin' | 'ultrahuman';

interface UnifiedMetric {
  unified_metric_name: string;
  unified_category: string;
  unified_unit: string;
  aggregated_value: number;
  measurement_date: string;
  source_count: number;
  sources: string[];
  source_values: any; // Json type from Supabase
}

interface UseUnifiedMetricsOptions {
  startDate?: string;
  endDate?: string;
  metricName?: string;
}

export function useUnifiedMetrics(options: UseUnifiedMetricsOptions = {}) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<UnifiedMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setMetrics([]);
      setLoading(false);
      return;
    }

    const fetchUnifiedMetrics = async () => {
      try {
        setLoading(true);
        const { data, error: rpcError } = await supabase.rpc('get_unified_metrics', {
          p_user_id: user.id,
          p_start_date: options.startDate || null,
          p_end_date: options.endDate || null,
          p_unified_metric_name: options.metricName || null,
        });

        if (rpcError) throw rpcError;
        setMetrics(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching unified metrics:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchUnifiedMetrics();
  }, [user, options.startDate, options.endDate, options.metricName]);

  return { metrics, loading, error };
}

// Хук для получения последних значений по каждой метрике
export function useLatestUnifiedMetrics() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Record<string, UnifiedMetric>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMetrics({});
      setLoading(false);
      return;
    }

    const fetchLatestMetrics = async () => {
      try {
        setLoading(true);
        
        // Получаем самое последнее значение для каждой метрики напрямую из metric_values
        const { data: metricsData, error } = await supabase
          .from('user_metrics')
          .select(`
            id,
            metric_name,
            source,
            unit,
            metric_category
          `)
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (error) throw error;

        const latestMetrics: Record<string, any> = {};
        
        // Для каждой метрики получаем последнее значение
        for (const metric of metricsData || []) {
          const { data: valueData } = await supabase
            .from('metric_values')
            .select('value, measurement_date, created_at')
            .eq('metric_id', metric.id)
            .eq('user_id', user.id)
            .order('measurement_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (valueData) {
            const key = metric.metric_name;
            // Сохраняем только если это более свежее значение или метрики еще нет
            if (!latestMetrics[key] || 
                new Date(valueData.measurement_date) > new Date(latestMetrics[key].measurement_date) ||
                (new Date(valueData.measurement_date).getTime() === new Date(latestMetrics[key].measurement_date).getTime() &&
                 new Date(valueData.created_at) > new Date(latestMetrics[key].created_at))) {
              latestMetrics[key] = {
                metric_name: metric.metric_name,
                value: valueData.value,
                unit: metric.unit,
                source: metric.source,
                category: metric.metric_category,
                measurement_date: valueData.measurement_date,
                created_at: valueData.created_at,
              };
            }
          }
        }

        setMetrics(latestMetrics);
      } catch (err) {
        console.error('Error fetching latest unified metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestMetrics();
  }, [user]);

  return { metrics, loading };
}

// Хук для получения метрик по конкретному источнику
export function useDeviceMetrics(device: DeviceFilter) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || device === 'all') {
      setMetrics({});
      setLoading(false);
      return;
    }

    const fetchDeviceMetrics = async () => {
      try {
        setLoading(true);
        
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Получаем метрики только для выбранного источника
          const { data, error } = await supabase
            .from('metric_values')
            .select(`
              value,
              measurement_date,
              user_metrics!inner(metric_name, source, unit, metric_category)
            `)
            .eq('user_id', user.id)
            .eq('user_metrics.source', device)
            .gte('measurement_date', weekAgo)
            .lte('measurement_date', today)
            .order('measurement_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Группируем по метрике
        const groupedMetrics: Record<string, any> = {};
        (data || []).forEach((item: any) => {
          const metricName = item.user_metrics.metric_name;
          if (!groupedMetrics[metricName]) {
            groupedMetrics[metricName] = {
              name: metricName,
              value: item.value,
              unit: item.user_metrics.unit,
              category: item.user_metrics.metric_category,
              source: device,
              date: item.measurement_date,
            };
          }
        });

        setMetrics(groupedMetrics);
      } catch (err) {
        console.error('Error fetching device metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeviceMetrics();
  }, [user, device]);

  return { metrics, loading };
}
