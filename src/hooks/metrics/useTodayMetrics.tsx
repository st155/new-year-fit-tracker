import { useMemo } from 'react';
import { useUnifiedMetricsQuery } from './useUnifiedMetricsQuery';

export interface TodayMetrics {
  steps: number;
  sleepHours: number;
  workouts: number;
  recovery: number;
  strain: number;
  hrv: number;
  rhr: number;
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

    // Fallback for workout count: count unique workouts if "Workout Count" metric is missing
    let workoutCount = grouped.get('Workout Count')?.value || 0;
    if (workoutCount === 0) {
      // Simple fallback: if we have any workout-related metrics, assume at least 1 workout
      const hasWorkoutMetrics = metrics.some(m => 
        m.metric_name === 'Workout Strain' || m.metric_name === 'Workout Calories'
      );
      workoutCount = hasWorkoutMetrics ? 1 : 0;
    }

    return {
      steps: grouped.get('Steps')?.value || 0,
      sleepHours: grouped.get('Sleep Duration')?.value || 0,
      workouts: workoutCount,
      recovery: grouped.get('Recovery Score')?.value || 0,
      strain: grouped.get('Day Strain')?.value || 0,
      hrv: grouped.get('HRV RMSSD')?.value || grouped.get('Sleep HRV RMSSD')?.value || 0,
      rhr: grouped.get('Resting Heart Rate')?.value || 0
    };
  }, [metrics]);

  return { metrics: todayMetrics, loading: isLoading, error };
}
