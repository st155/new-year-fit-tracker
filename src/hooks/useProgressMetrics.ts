import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { ru } from "date-fns/locale";

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
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [period, setPeriod] = useState<PeriodFilter>('30d');

  const periodDays = getPeriodDays(period);

  // Fetch unique exercises user has performed
  const { data: userExercises } = useQuery({
    queryKey: ['user-unique-exercises', userId],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('workout_logs')
        .select('exercise_name, actual_reps')
        .eq('user_id', userId)
        .gt('actual_weight', 0);
      
      if (error) throw error;
      
      // Group by exercise and find min reps (to detect 1RM)
      const exerciseMap = new Map<string, number>();
      data?.forEach(log => {
        if (!log.exercise_name) return;
        const existing = exerciseMap.get(log.exercise_name);
        if (existing === undefined || log.actual_reps < existing) {
          exerciseMap.set(log.exercise_name, log.actual_reps);
        }
      });
      
      return Array.from(exerciseMap.entries()).map(([name, minReps]) => ({
        name,
        minReps,
        value: name, // use exact name as value
        label: minReps === 1 ? `${name} (1RM)` : name
      }));
    },
    enabled: !!userId
  });

  const availableMetrics = useMemo(() => {
    return userExercises || [];
  }, [userExercises]);

  // Set default selection to first exercise when data loads
  useEffect(() => {
    if (availableMetrics.length > 0 && !selectedMetric) {
      setSelectedMetric(availableMetrics[0].value);
    }
  }, [availableMetrics, selectedMetric]);

  // Fetch workout logs for selected exercise
  const { data: workoutData } = useQuery({
    queryKey: ['exercise-progress', selectedMetric, userId, period],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!userId || !selectedMetric) return [];
      
      const startDate = subDays(new Date(), periodDays).toISOString();
      
      const { data, error } = await supabase
        .from('workout_logs')
        .select('exercise_name, actual_weight, actual_reps, performed_at')
        .eq('user_id', userId)
        .eq('exercise_name', selectedMetric)
        .gte('performed_at', startDate)
        .gt('actual_weight', 0)
        .order('performed_at', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    },
    enabled: !!userId && !!selectedMetric
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
