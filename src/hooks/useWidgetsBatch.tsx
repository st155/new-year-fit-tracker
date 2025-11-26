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
      console.time('[useWidgetsBatch] Fetch');
      
      if (!userId || widgets.length === 0) {
        console.timeEnd('[useWidgetsBatch] Fetch');
        return new Map();
      }

      // Metric name aliases for backward compatibility
      const METRIC_ALIASES: Record<string, string[]> = {
        'Resting HR': ['Resting Heart Rate'],
        'Resting Heart Rate': ['Resting HR'],
        'Workout Calories': ['Active Calories'],
        'Active Calories': ['Workout Calories'],
        // Day Strain and Workout Strain are DIFFERENT metrics, not aliases!
        'Day Strain': ['Strain'],
        'Strain': ['Day Strain'],
      };

      // Собираем все уникальные метрики + их алиасы
      const metricNamesSet = new Set<string>();
      widgets.forEach(w => {
        metricNamesSet.add(w.metric_name);
        const aliases = METRIC_ALIASES[w.metric_name];
        if (aliases) {
          aliases.forEach(alias => metricNamesSet.add(alias));
        }
      });
      const metricNames = Array.from(metricNamesSet);
      
      // Create timeout promise (8 seconds)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 8000)
      );
      
      try {
        // ОПТИМИЗАЦИЯ: Выбираем только нужные поля и фильтруем сразу
        const metricsPromise = supabase
          .from('unified_metrics')
          .select('metric_name, source, value, unit, measurement_date')
          .eq('user_id', userId)
          .in('metric_name', metricNames)
          .order('measurement_date', { ascending: false })
          .limit(metricNames.length * 10); // Ограничиваем результат
        
        const confidencePromise = supabase
          .from('metric_confidence_cache')
          .select('metric_name, source, confidence_score, source_reliability, data_freshness, measurement_frequency, cross_validation')
          .eq('user_id', userId)
          .in('metric_name', metricNames);
        
        // Race against timeout
        const [metricsResult, confidenceResult] = await Promise.race([
          Promise.all([metricsPromise, confidencePromise]),
          timeoutPromise
        ]) as any;
        
        console.timeEnd('[useWidgetsBatch] Fetch');
        
        if (!metricsResult.data) return new Map();

        // Create confidence lookup map
        const confidenceMap = new Map<string, any>();
        confidenceResult.data?.forEach((c: any) => {
          const key = `${c.metric_name}-${c.source}`;
          confidenceMap.set(key, c);
        });

        // Группируем по metric_name + source (берем только ПЕРВОЕ = последнее по дате)
        const grouped = new Map<string, WidgetData>();
        
        metricsResult.data.forEach((metric: any) => {
          const key = `${metric.metric_name}-${metric.source}`;
          
          // Also create entries for aliases
          const aliases = METRIC_ALIASES[metric.metric_name] || [];
          const keysToSet = [key, ...aliases.map(alias => `${alias}-${metric.source}`)];
          
          keysToSet.forEach(k => {
            if (!grouped.has(k)) {
              const confidence = confidenceMap.get(key);
              
              grouped.set(k, {
                value: metric.value,
                unit: metric.unit,
                measurement_date: metric.measurement_date,
                source: metric.source,
                trend: undefined,
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
        });
        
        return grouped;
      } catch (error) {
        console.timeEnd('[useWidgetsBatch] Fetch');
        if (error instanceof Error && error.message === 'Query timeout') {
          console.warn('⚠️ [useWidgetsBatch] Query timeout - returning partial data');
          return new Map(); // Return empty map on timeout
        }
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 500,
    enabled: !!userId && widgets.length > 0,
  });
}
