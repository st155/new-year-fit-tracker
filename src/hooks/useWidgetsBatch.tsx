import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { widgetKeys } from '@/hooks/useWidgetsQuery';

interface Widget {
  id: string;
  metric_name: string;
  source: string;
}

interface WidgetData {
  value: number;
  unit: string;
  measurement_date: string;
  source: string;
  trend?: number;
  confidence?: number;
  factors?: {
    sourceReliability: number;
    dataFreshness: number;
    measurementFrequency: number;
    crossValidation: number;
  };
}

export function useWidgetsBatch(userId: string | undefined, widgets: Widget[]) {
  return useQuery({
    queryKey: [...widgetKeys.all, 'batch', userId, widgets.map(w => w.id)],
    queryFn: async () => {
      if (!userId || widgets.length === 0) return new Map();

      // Собираем все уникальные метрики
      const metricNames = [...new Set(widgets.map(w => w.metric_name))];
      
      // ОДИН SQL запрос для всех виджетов + JOIN confidence cache
      const { data: metricsData } = await supabase
        .from('client_unified_metrics')
        .select('*')
        .eq('user_id', userId)
        .in('metric_name', metricNames)
        .order('measurement_date', { ascending: false });
      
      if (!metricsData) return new Map();

      // Fetch confidence data in one query
      const { data: confidenceData } = await supabase
        .from('metric_confidence_cache')
        .select('*')
        .eq('user_id', userId)
        .in('metric_name', metricNames);
      
      // Create confidence lookup map
      const confidenceMap = new Map<string, any>();
      confidenceData?.forEach(c => {
        const key = `${c.metric_name}-${c.source}`;
        confidenceMap.set(key, c);
      });

      // Группируем по metric_name + source (берем только ПЕРВОЕ = последнее по дате)
      const grouped = new Map<string, WidgetData>();
      
      metricsData.forEach(metric => {
        const key = `${metric.metric_name}-${metric.source}`;
        if (!grouped.has(key)) {
          const confidence = confidenceMap.get(key);
          
          // Берем только первое (самое свежее) значение для каждой метрики+источника
          grouped.set(key, {
            value: metric.value,
            unit: metric.unit,
            measurement_date: metric.measurement_date,
            source: metric.source,
            trend: undefined, // TODO: Calculate trend from historical data
            confidence: confidence?.confidence_score,
            factors: confidence ? {
              sourceReliability: confidence.source_reliability,
              dataFreshness: confidence.data_freshness,
              measurementFrequency: confidence.measurement_frequency,
              crossValidation: confidence.cross_validation,
            } : undefined,
          });
        }
      });
      
      return grouped;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!userId && widgets.length > 0,
  });
}
