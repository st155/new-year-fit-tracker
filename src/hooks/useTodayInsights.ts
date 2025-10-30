import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

interface TodayInsights {
  metrics: {
    today: number;
    history: Array<{ date: string; value: number }>;
  };
  sources: {
    today: number;
    history: Array<{ date: string; value: number }>;
  };
  goals: {
    active: number;
    history: Array<{ date: string; value: number }>;
  };
  habits: {
    active: number;
    history: Array<{ date: string; value: number }>;
  };
}

export function useTodayInsights(userId: string | undefined) {
  return useQuery({
    queryKey: ['today-insights', userId],
    queryFn: async (): Promise<TodayInsights> => {
      if (!userId) throw new Error('User ID required');

      const today = format(new Date(), 'yyyy-MM-dd');
      const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd');

      // Fetch metrics for last 7 days
      const { data: metricsData } = await supabase
        .from('unified_metrics')
        .select('measurement_date, metric_name, source')
        .eq('user_id', userId)
        .gte('measurement_date', sevenDaysAgo)
        .lte('measurement_date', today);

      // Count active goals - bypass type checking to avoid deep instantiation error
      const goalsResponse = await (supabase as any)
        .from('goals')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active');
      const goalsCount = goalsResponse?.data?.length || 0;

      // Count active habits - bypass type checking to avoid deep instantiation error
      const habitsResponse = await (supabase as any)
        .from('habits')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true);
      const habitsCount = habitsResponse?.data?.length || 0;

      // Process metrics by date
      const metricsByDate = new Map<string, Set<string>>();
      const sourcesByDate = new Map<string, Set<string>>();

      metricsData?.forEach(metric => {
        const date = metric.measurement_date;
        
        if (!metricsByDate.has(date)) {
          metricsByDate.set(date, new Set());
        }
        metricsByDate.get(date)!.add(metric.metric_name);

        if (!sourcesByDate.has(date)) {
          sourcesByDate.set(date, new Set());
        }
        sourcesByDate.get(date)!.add(metric.source);
      });

      // Build history arrays for last 7 days
      const metricsHistory: Array<{ date: string; value: number }> = [];
      const sourcesHistory: Array<{ date: string; value: number }> = [];

      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        metricsHistory.push({
          date,
          value: metricsByDate.get(date)?.size || 0,
        });
        sourcesHistory.push({
          date,
          value: sourcesByDate.get(date)?.size || 0,
        });
      }

      const activeGoalsCount = goalsCount || 0;
      const activeHabitsCount = habitsCount || 0;

      return {
        metrics: {
          today: metricsByDate.get(today)?.size || 0,
          history: metricsHistory,
        },
        sources: {
          today: sourcesByDate.get(today)?.size || 0,
          history: sourcesHistory,
        },
        goals: {
          active: activeGoalsCount,
          history: Array.from({ length: 7 }, (_, i) => ({
            date: format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'),
            value: activeGoalsCount,
          })),
        },
        habits: {
          active: activeHabitsCount,
          history: Array.from({ length: 7 }, (_, i) => ({
            date: format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'),
            value: activeHabitsCount,
          })),
        },
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
