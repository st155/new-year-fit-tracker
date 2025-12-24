import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { ru } from "date-fns/locale";

export type PeriodFilter = '7d' | '30d' | '90d' | 'all';
export type MetricCategory = 'strength' | 'wellness' | 'body';

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

// Wellness metrics from unified_metrics
const WELLNESS_METRICS = [
  { name: 'Recovery Score', label: 'Восстановление', unit: '%' },
  { name: 'Sleep Duration', label: 'Продолжительность сна', unit: 'ч' },
  { name: 'HRV', label: 'Вариабельность пульса (HRV)', unit: 'мс' },
  { name: 'Resting Heart Rate', label: 'Пульс покоя', unit: 'уд/мин' },
  { name: 'Sleep Efficiency', label: 'Эффективность сна', unit: '%' },
];

// Body metrics from unified_metrics
const BODY_METRICS = [
  { name: 'Weight', label: 'Вес', unit: 'кг' },
  { name: 'Body Fat Percentage', label: 'Процент жира', unit: '%' },
  { name: 'Muscle Mass', label: 'Мышечная масса', unit: 'кг' },
];

export function useProgressMetrics(userId?: string) {
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [category, setCategory] = useState<MetricCategory>('strength');

  const periodDays = getPeriodDays(period);

  // Fetch unique exercises user has performed (for strength category)
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
        value: name,
        label: minReps === 1 ? `${name} (1RM)` : name,
        category: 'strength' as const
      }));
    },
    enabled: !!userId
  });

  // Fetch available wellness metrics
  const { data: wellnessMetrics } = useQuery({
    queryKey: ['user-wellness-metrics', userId],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('unified_metrics')
        .select('metric_name')
        .eq('user_id', userId)
        .in('metric_name', WELLNESS_METRICS.map(m => m.name));
      
      if (error) throw error;
      
      const uniqueMetrics = [...new Set(data?.map(d => d.metric_name) || [])];
      return uniqueMetrics.map(name => {
        const meta = WELLNESS_METRICS.find(m => m.name === name);
        return {
          name,
          value: name,
          label: meta?.label || name,
          unit: meta?.unit || '',
          category: 'wellness' as const
        };
      });
    },
    enabled: !!userId
  });

  // Fetch available body metrics
  const { data: bodyMetrics } = useQuery({
    queryKey: ['user-body-metrics', userId],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('unified_metrics')
        .select('metric_name')
        .eq('user_id', userId)
        .in('metric_name', BODY_METRICS.map(m => m.name));
      
      if (error) throw error;
      
      const uniqueMetrics = [...new Set(data?.map(d => d.metric_name) || [])];
      return uniqueMetrics.map(name => {
        const meta = BODY_METRICS.find(m => m.name === name);
        return {
          name,
          value: name,
          label: meta?.label || name,
          unit: meta?.unit || '',
          category: 'body' as const
        };
      });
    },
    enabled: !!userId
  });

  // Combine all metrics based on category
  const availableMetrics = useMemo(() => {
    switch (category) {
      case 'strength':
        return userExercises || [];
      case 'wellness':
        return wellnessMetrics || [];
      case 'body':
        return bodyMetrics || [];
      default:
        return [];
    }
  }, [category, userExercises, wellnessMetrics, bodyMetrics]);

  // Set default selection when category or metrics change
  useEffect(() => {
    if (availableMetrics.length > 0) {
      setSelectedMetric(availableMetrics[0].value);
    } else {
      setSelectedMetric("");
    }
  }, [availableMetrics]);

  // Fetch data based on category
  const { data: workoutData } = useQuery({
    queryKey: ['exercise-progress', selectedMetric, userId, period, category],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!userId || !selectedMetric) return [];
      
      const startDate = subDays(new Date(), periodDays).toISOString();
      
      if (category === 'strength') {
        // Fetch from workout_logs for strength exercises
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
      } else {
        // Fetch from unified_metrics for wellness/body
        const { data, error } = await supabase
          .from('unified_metrics')
          .select('metric_name, value, measurement_date, unit')
          .eq('user_id', userId)
          .eq('metric_name', selectedMetric)
          .gte('measurement_date', startDate.split('T')[0])
          .order('measurement_date', { ascending: true });
        
        if (error) throw error;
        return data || [];
      }
    },
    enabled: !!userId && !!selectedMetric
  });

  // Transform data for chart - group by date
  const chartData = useMemo(() => {
    if (!workoutData || workoutData.length === 0) {
      return [];
    }

    if (category === 'strength') {
      // Group by date and calculate max estimated 1RM per day
      const byDate: Record<string, { date: Date; maxWeight: number; maxReps: number; estimated1RM: number }> = {};
      
      for (const log of workoutData as { performed_at: string; actual_weight: number; actual_reps: number }[]) {
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
      
      const sorted = Object.values(byDate).sort((a, b) => a.date.getTime() - b.date.getTime());
      
      return sorted.map(d => ({
        date: format(d.date, 'd MMM', { locale: ru }),
        value: d.estimated1RM,
        weight: d.maxWeight,
        reps: d.maxReps
      }));
    } else {
      // For wellness/body - group by date and take average per day
      const byDate: Record<string, { date: Date; values: number[] }> = {};
      
      for (const log of workoutData as { measurement_date: string; value: number }[]) {
        if (!log.measurement_date) continue;
        
        const dateKey = log.measurement_date;
        if (!byDate[dateKey]) {
          byDate[dateKey] = { date: new Date(log.measurement_date), values: [] };
        }
        byDate[dateKey].values.push(log.value);
      }
      
      const sorted = Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([_, d]) => ({
          date: format(d.date, 'd MMM', { locale: ru }),
          value: Math.round(d.values.reduce((a, b) => a + b, 0) / d.values.length * 10) / 10
        }));
      
      return sorted;
    }
  }, [workoutData, category]);

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
    setPeriod,
    category,
    setCategory
  };
}
