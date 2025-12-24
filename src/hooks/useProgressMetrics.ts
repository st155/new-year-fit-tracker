import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { ru } from "date-fns/locale";

// Mapping exercise names from dropdown to actual exercise names in DB
const EXERCISE_MAPPING: Record<string, string[]> = {
  bench_press: ['Bench Press', 'Bench press', 'bench press', 'Жим лежа', 'жим лежа', 'Bench incline press', 'Bench incline'],
  squat: ['Squat', 'squat', 'Squats', 'Приседания', 'приседания', 'Back Squat'],
  deadlift: ['Deadlift', 'deadlift', 'Становая тяга', 'становая тяга', 'Romanian Deadlift'],
  overhead_press: ['Overhead Press', 'overhead press', 'Overhead press barbell', 'Жим стоя', 'жим стоя', 'Military Press'],
  lunges: ['Lunges', 'lunges', 'Lunges alternating', 'Выпады'],
  biceps: ['Biceps', 'biceps', 'Biceps dumbbell', 'Biceps cable', 'Bicep Curl', 'Подъем на бицепс'],
  dips: ['Dips', 'dips', 'Отжимания на брусьях'],
};

export type PeriodFilter = '7d' | '30d' | '90d' | 'all';

// Calculate estimated 1RM using Epley formula: 1RM = weight × (1 + reps/30)
function calculateEstimated1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

function getPeriodDays(period: PeriodFilter): number {
  switch (period) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case 'all': return 365;
    default: return 60;
  }
}

export function useProgressMetrics(userId?: string) {
  const [selectedMetric, setSelectedMetric] = useState("overhead_press");
  const [period, setPeriod] = useState<PeriodFilter>('30d');

  const availableMetrics = [
    { value: "overhead_press", label: "Overhead Press (1RM)" },
    { value: "bench_press", label: "Bench Press (1RM)" },
    { value: "squat", label: "Squat (1RM)" },
    { value: "deadlift", label: "Deadlift (1RM)" },
    { value: "lunges", label: "Lunges (1RM)" },
    { value: "biceps", label: "Biceps (1RM)" },
    { value: "dips", label: "Dips (1RM)" },
  ];

  const periodDays = getPeriodDays(period);

  // Fetch workout logs for selected exercise
  const { data: workoutData } = useQuery({
    queryKey: ['exercise-progress', selectedMetric, userId, period],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!userId) return [];
      
      const exerciseNames = EXERCISE_MAPPING[selectedMetric] || [];
      if (exerciseNames.length === 0) return [];
      
      const startDate = subDays(new Date(), periodDays).toISOString();
      
      const { data, error } = await supabase
        .from('workout_logs')
        .select('exercise_name, actual_weight, actual_reps, performed_at')
        .eq('user_id', userId)
        .gte('performed_at', startDate)
        .gt('actual_weight', 0)
        .order('performed_at', { ascending: true });
      
      if (error) throw error;
      
      // Filter to matching exercises (case-insensitive partial match)
      const filtered = (data || []).filter(log => 
        exerciseNames.some(name => 
          log.exercise_name?.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(log.exercise_name?.toLowerCase() || '')
        )
      );
      
      return filtered;
    },
    enabled: !!userId
  });

  // Transform data for chart - group by date and take best 1RM per day
  const chartData = useMemo(() => {
    if (!workoutData || workoutData.length === 0) {
      return [];
    }

    // Group by date and calculate max estimated 1RM per day
    const byDate: Record<string, { date: Date; maxWeight: number; maxReps: number; estimated1RM: number }> = {};
    
    for (const log of workoutData) {
      if (!log.performed_at) continue;
      
      const dateKey = format(new Date(log.performed_at), 'yyyy-MM-dd');
      const estimated1RM = calculateEstimated1RM(log.actual_weight, log.actual_reps);
      
      if (!byDate[dateKey] || estimated1RM > byDate[dateKey].estimated1RM) {
        byDate[dateKey] = {
          date: new Date(log.performed_at),
          maxWeight: log.actual_weight,
          maxReps: log.actual_reps,
          estimated1RM
        };
      }
    }
    
    // Convert to array and sort by date
    const sorted = Object.values(byDate).sort((a, b) => a.date.getTime() - b.date.getTime());
    
    return sorted.map(d => ({
      date: format(d.date, 'd MMM', { locale: ru }),
      value: d.estimated1RM,
      weight: d.maxWeight,
      reps: d.maxReps
    }));
  }, [workoutData]);

  const metrics = useMemo(() => {
    if (chartData.length === 0) {
      return { start: 0, current: 0, min: 0, max: 0, avg: 0, change: 0, changePercent: 0 };
    }
    
    const values = chartData.map(d => d.value);
    const start = values[0];
    const current = values[values.length - 1];
    const change = current - start;
    const changePercent = start > 0 ? Math.round((change / start) * 100) : 0;
    
    return {
      start,
      current,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      change,
      changePercent
    };
  }, [chartData]);

  return {
    selectedMetric,
    setSelectedMetric,
    availableMetrics,
    chartData,
    metrics,
    hasData: chartData.length > 0,
    period,
    setPeriod
  };
}
