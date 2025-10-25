import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { widgetKeys } from '@/hooks/useWidgetsQuery';

interface Widget {
  id: string;
  metric_name: string;
  source: string;
}

export function useWidgetsBatch(userId: string | undefined, widgets: Widget[]) {
  return useQuery({
    queryKey: [...widgetKeys.all, 'batch', userId, widgets.map(w => w.id)],
    queryFn: async () => {
      if (!userId || widgets.length === 0) return new Map();

      // Собираем все уникальные метрики
      const metricNames = [...new Set(widgets.map(w => w.metric_name))];
      
      // ОДИН SQL запрос для всех виджетов
      const { data } = await supabase
        .from('client_unified_metrics')
        .select('*')
        .eq('user_id', userId)
        .in('metric_name', metricNames)
        .order('measurement_date', { ascending: false });
      
      if (!data) return new Map();

      // Группируем по metric_name + source
      const grouped = new Map<string, any>();
      
      data.forEach(metric => {
        const key = `${metric.metric_name}-${metric.source}`;
        if (!grouped.has(key)) {
          // Берем только последнее значение для каждой метрики
          grouped.set(key, {
            value: metric.value,
            unit: metric.unit,
            date: metric.measurement_date,
            trend: undefined, // Тренд будем вычислять отдельно
          });
        }
      });
      
      return grouped;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!userId && widgets.length > 0,
  });
}
