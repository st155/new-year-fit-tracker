import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Widget } from './useWidgetsQuery';

// Приоритеты метрик (чем меньше, тем важнее)
const METRIC_PRIORITY: Record<string, number> = {
  'Recovery Score': 1,
  'Day Strain': 2,
  'Sleep Duration': 3,
  'Sleep Efficiency': 4,
  'HRV RMSSD': 5,
  'Steps': 6,
  'Active Calories': 7,
  'Resting Heart Rate': 8,
  'Weight': 9,
  'Body Fat Percentage': 10,
  'Max Heart Rate': 11,
  'VO2Max': 12,
  'Training Readiness': 13,
  'Sleep Performance': 14,
  'Average Heart Rate': 15,
  'Workout Calories': 16,
  'BMR': 17,
  'Muscle Mass': 18,
};

export interface AIWidgetSuggestion {
  metric_name: string;
  priority: number;
  dataPoints: number;
}

export function useAIWidgetSuggestions(userId: string | undefined, currentWidgets: Widget[]) {
  return useQuery({
    queryKey: ['ai-widget-suggestions', userId],
    queryFn: async (): Promise<AIWidgetSuggestion[]> => {
      if (!userId) return [];

      // Получаем метрики за последние 7 дней
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dateStr = sevenDaysAgo.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('unified_metrics')
        .select('metric_name')
        .eq('user_id', userId)
        .gte('measurement_date', dateStr);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Считаем количество точек данных для каждой метрики
      const metricCounts: Record<string, number> = {};
      data.forEach((row) => {
        metricCounts[row.metric_name] = (metricCounts[row.metric_name] || 0) + 1;
      });

      // Текущие виджеты пользователя
      const currentMetrics = new Set(currentWidgets.map(w => w.metric_name));

      // Фильтруем и сортируем по приоритету
      const suggestions: AIWidgetSuggestion[] = Object.entries(metricCounts)
        .filter(([metric]) => 
          METRIC_PRIORITY[metric] !== undefined && // Только известные метрики
          !currentMetrics.has(metric) // Исключаем уже добавленные
        )
        .map(([metric, count]) => ({
          metric_name: metric,
          priority: METRIC_PRIORITY[metric],
          dataPoints: count,
        }))
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 8); // Максимум 8 рекомендаций

      return suggestions;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}
