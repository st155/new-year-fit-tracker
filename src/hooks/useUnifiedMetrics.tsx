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
        
        // Оптимизированный запрос - получаем все данные одним запросом
        const { data: metricsData, error } = await supabase
          .from('metric_values')
          .select(`
            value,
            measurement_date,
            created_at,
            user_metrics!inner(
              metric_name,
              source,
              unit,
              metric_category
            )
          `)
          .eq('user_id', user.id)
          .gte('measurement_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('measurement_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;

        console.log('[useLatestUnifiedMetrics] Fetched metric_values:', metricsData?.length || 0);

        const latestMetrics: Record<string, any> = {};
        
        // Проходим по всем метрикам и берем самое свежее значение для каждого metric_name
        for (const item of metricsData || []) {
          const metricName = (item.user_metrics as any).metric_name;
          const currentDate = new Date(item.measurement_date);
          const currentCreated = new Date(item.created_at);
          
          // Сохраняем только если это более свежее значение или метрики еще нет
          if (!latestMetrics[metricName]) {
            latestMetrics[metricName] = {
              metric_name: metricName,
              value: item.value,
              unit: (item.user_metrics as any).unit,
              source: (item.user_metrics as any).source,
              category: (item.user_metrics as any).metric_category,
              measurement_date: item.measurement_date,
              created_at: item.created_at,
            };
          } else {
            const existingDate = new Date(latestMetrics[metricName].measurement_date);
            const existingCreated = new Date(latestMetrics[metricName].created_at);
            
            // Обновляем если дата новее или при равной дате - время создания новее
            if (currentDate > existingDate || 
                (currentDate.getTime() === existingDate.getTime() && currentCreated > existingCreated)) {
              latestMetrics[metricName] = {
                metric_name: metricName,
                value: item.value,
                unit: (item.user_metrics as any).unit,
                source: (item.user_metrics as any).source,
                category: (item.user_metrics as any).metric_category,
                measurement_date: item.measurement_date,
                created_at: item.created_at,
              };
            }
          }
        }

        console.log('[useLatestUnifiedMetrics] Latest metrics:', Object.keys(latestMetrics));
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
