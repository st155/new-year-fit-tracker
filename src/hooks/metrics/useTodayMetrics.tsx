import { useMemo } from 'react';
import { useUnifiedMetricsQuery } from './useUnifiedMetricsQuery';

export interface TodayMetrics {
  steps: number;
  sleepHours: number;
  workouts: number;
  recovery: number;
  strain: number;
}

export function useTodayMetrics(userId: string | undefined) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data: metrics = [], isLoading, error } = useUnifiedMetricsQuery(userId, {
    startDate: today,
    endDate: new Date()
  });

  const todayMetrics = useMemo(() => {
    // Group by metric_name and take highest priority (lowest number)
    const grouped = new Map<string, { value: number; priority: number }>();
    
    metrics.forEach(m => {
      const existing = grouped.get(m.metric_name);
      if (!existing || m.priority < existing.priority) {
        grouped.set(m.metric_name, { value: m.value, priority: m.priority });
      }
    });

    return {
      steps: grouped.get('Steps')?.value || 0,
      sleepHours: (grouped.get('Sleep Duration')?.value || 0) / 60, // Convert minutes to hours
      workouts: grouped.get('Workout Count')?.value || 0,
      recovery: grouped.get('Recovery Score')?.value || 0,
      strain: grouped.get('Day Strain')?.value || 0
    };
  }, [metrics]);

  return { metrics: todayMetrics, loading: isLoading, error };
}
