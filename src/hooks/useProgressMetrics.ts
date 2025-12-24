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

// Body metrics from unified_metrics (body composition + health metrics)
const BODY_METRICS = [
  // Состав тела
  { name: 'Weight', label: 'Вес', unit: 'кг' },
  { name: 'Body Fat Percentage', label: 'Процент жира', unit: '%' },
  { name: 'Muscle Mass', label: 'Мышечная масса', unit: 'кг' },
  // Метрики здоровья
  { name: 'Recovery Score', label: 'Восстановление', unit: '%' },
  { name: 'Sleep Duration', label: 'Продолжительность сна', unit: 'ч' },
  { name: 'HRV', label: 'Вариабельность пульса (HRV)', unit: 'мс' },
  { name: 'Resting Heart Rate', label: 'Пульс покоя', unit: 'уд/мин' },
  { name: 'Sleep Efficiency', label: 'Эффективность сна', unit: '%' },
];
// Wellness activities from workouts table (Whoop activity types)
const WELLNESS_ACTIVITY_TYPES: Record<string, { label: string; icon: string }> = {
  'Массаж': { label: 'Массаж', icon: '💆' },
  'Медитация': { label: 'Медитация', icon: '🧘' },
  '125': { label: 'Массаж', icon: '💆' },
  '45': { label: 'Медитация', icon: '🧘' },
  '70': { label: 'Медитация', icon: '🧘' },
  '88': { label: 'Ледяная ванна', icon: '🧊' },
  '43': { label: 'Пилатес', icon: '🏃' },
  '44': { label: 'Йога', icon: '🧘' },
  '233': { label: 'Растяжка', icon: '🤸' },
  '237': { label: 'Сауна', icon: '🧖' },
};

const WELLNESS_ACTIVITY_CODES = Object.keys(WELLNESS_ACTIVITY_TYPES);

export function useProgressMetrics(userId?: string) {
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [category, setCategory] = useState<MetricCategory>('strength');

  const periodDays = getPeriodDays(period);

  // Fetch unique exercises user has performed (for strength category)
  // Now counts data points per exercise to select the best one by default
  const { data: userExercises } = useQuery({
    queryKey: ['user-unique-exercises', userId],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('workout_logs')
        .select('exercise_name, actual_reps, performed_at')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Group by exercise: count unique dates and find min reps (to detect 1RM)
      const exerciseMap = new Map<string, { minReps: number; uniqueDates: Set<string> }>();
      data?.forEach(log => {
        if (!log.exercise_name) return;
        const dateKey = log.performed_at.split('T')[0];
        const existing = exerciseMap.get(log.exercise_name);
        
        if (!existing) {
          exerciseMap.set(log.exercise_name, { 
            minReps: log.actual_reps || 0, 
            uniqueDates: new Set([dateKey]) 
          });
        } else {
          existing.uniqueDates.add(dateKey);
          if (log.actual_reps && log.actual_reps < existing.minReps) {
            existing.minReps = log.actual_reps;
          }
        }
      });
      
      // Convert to array and sort by data points count (descending)
      const exercises = Array.from(exerciseMap.entries())
        .map(([name, { minReps, uniqueDates }]) => ({
          name,
          minReps,
          value: name,
          dataPoints: uniqueDates.size,
          label: `${name}${minReps === 1 ? ' (1RM)' : ''} (${uniqueDates.size})`,
          category: 'strength' as const
        }))
        .sort((a, b) => b.dataPoints - a.dataPoints);
      
      return exercises;
    },
    enabled: !!userId
  });


  // Fetch available wellness activities from workouts
  const { data: wellnessActivities } = useQuery({
    queryKey: ['user-wellness-activities', userId],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('workouts')
        .select('workout_type')
        .eq('user_id', userId)
        .in('workout_type', WELLNESS_ACTIVITY_CODES);
      
      if (error) throw error;
      
      const uniqueTypes = [...new Set(data?.map(d => d.workout_type).filter(Boolean) || [])];
      return uniqueTypes.map(type => {
        const meta = WELLNESS_ACTIVITY_TYPES[type];
        return {
          name: type,
          value: `activity:${type}`,
          label: meta?.label || type,
          icon: meta?.icon || '🏃',
          unit: 'мин',
          category: 'wellness' as const,
          isActivity: true
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
        // Only wellness activities (massage, meditation, yoga, etc.)
        return wellnessActivities || [];
      case 'body':
        return bodyMetrics || [];
      default:
        return [];
    }
  }, [category, userExercises, wellnessActivities, bodyMetrics]);

  // Set default selection when category or metrics change
  useEffect(() => {
    if (availableMetrics.length > 0) {
      setSelectedMetric(availableMetrics[0].value);
    } else {
      setSelectedMetric("");
    }
  }, [availableMetrics]);

  // Check if selected metric is a wellness activity
  const isWellnessActivity = selectedMetric.startsWith('activity:');
  const activityType = isWellnessActivity ? selectedMetric.replace('activity:', '') : null;

  // Fetch data based on category
  const { data: workoutData } = useQuery({
    queryKey: ['exercise-progress', selectedMetric, userId, period, category],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!userId || !selectedMetric) return [];
      
      const startDate = subDays(new Date(), periodDays).toISOString();
      
      if (category === 'strength') {
        // Fetch from workout_logs for strength exercises (including bodyweight)
        const { data, error } = await supabase
          .from('workout_logs')
          .select('exercise_name, actual_weight, actual_reps, performed_at')
          .eq('user_id', userId)
          .eq('exercise_name', selectedMetric)
          .gte('performed_at', startDate)
          .order('performed_at', { ascending: true });
        
        if (error) throw error;
        return data || [];
      } else if (isWellnessActivity && activityType) {
        // Fetch from workouts table for wellness activities
        const { data, error } = await supabase
          .from('workouts')
          .select('workout_type, start_time, duration_minutes')
          .eq('user_id', userId)
          .eq('workout_type', activityType)
          .gte('start_time', startDate)
          .order('start_time', { ascending: true });
        
        if (error) throw error;
        return data || [];
      } else {
        // Fetch from unified_metrics for wellness/body metrics
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
      // Group by date and calculate max value per day
      // For weighted exercises: use estimated 1RM
      // For bodyweight exercises (weight = 0): use max reps
      const byDate: Record<string, { date: Date; maxWeight: number; maxReps: number; value: number; isBodyweight: boolean }> = {};
      
      for (const log of workoutData as { performed_at: string; actual_weight: number; actual_reps: number }[]) {
        if (!log.performed_at) continue;
        
        const dateKey = format(new Date(log.performed_at), 'yyyy-MM-dd');
        const isBodyweight = !log.actual_weight || log.actual_weight === 0;
        
        // For bodyweight: use reps as value; for weighted: use estimated 1RM
        const value = isBodyweight 
          ? log.actual_reps 
          : calculateEstimated1RM(log.actual_weight, log.actual_reps);
        
        if (!byDate[dateKey] || value > byDate[dateKey].value) {
          byDate[dateKey] = {
            date: new Date(log.performed_at),
            maxWeight: log.actual_weight || 0,
            maxReps: log.actual_reps,
            value,
            isBodyweight
          };
        }
      }
      
      const sorted = Object.values(byDate).sort((a, b) => a.date.getTime() - b.date.getTime());
      
      return sorted.map(d => ({
        date: format(d.date, 'd MMM', { locale: ru }),
        value: d.value,
        weight: d.maxWeight,
        reps: d.maxReps,
        isBodyweight: d.isBodyweight
      }));
    } else if (isWellnessActivity) {
      // For wellness activities - group by date and sum duration
      const byDate: Record<string, { date: Date; totalMinutes: number; count: number }> = {};
      
      for (const log of workoutData as { start_time: string; duration_minutes: number }[]) {
        if (!log.start_time) continue;
        
        const dateKey = format(new Date(log.start_time), 'yyyy-MM-dd');
        if (!byDate[dateKey]) {
          byDate[dateKey] = { date: new Date(log.start_time), totalMinutes: 0, count: 0 };
        }
        byDate[dateKey].totalMinutes += log.duration_minutes || 0;
        byDate[dateKey].count += 1;
      }
      
      const sorted = Object.values(byDate).sort((a, b) => a.date.getTime() - b.date.getTime());
      
      return sorted.map(d => ({
        date: format(d.date, 'd MMM', { locale: ru }),
        value: Math.round(d.totalMinutes),
        count: d.count
      }));
    } else {
      // For wellness/body metrics - group by date and take average per day
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
  }, [workoutData, category, isWellnessActivity]);

  const metrics = useMemo(() => {
    if (chartData.length === 0) {
      return { start: 0, current: 0, min: 0, max: 0, avg: 0, change: 0, changePercent: 0, totalSessions: 0, totalMinutes: 0 };
    }
    
    const values = chartData.map(d => d.value);
    const start = values[0];
    const current = values[values.length - 1];
    const change = current - start;
    const changePercent = start > 0 ? Math.round((change / start) * 100) : 0;
    
    // For wellness activities, calculate total sessions and total minutes
    let totalSessions = 0;
    let totalMinutes = 0;
    if (isWellnessActivity) {
      totalSessions = chartData.reduce((sum, d: any) => sum + (d.count || 1), 0);
      totalMinutes = chartData.reduce((sum, d) => sum + d.value, 0);
    }
    
    return {
      start,
      current,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      change,
      changePercent,
      totalSessions,
      totalMinutes
    };
  }, [chartData, isWellnessActivity]);

  // Check if current exercise is bodyweight based on chart data
  const isBodyweightExercise = useMemo(() => {
    if (category !== 'strength' || chartData.length === 0) return false;
    return chartData.every((d: any) => d.isBodyweight === true);
  }, [chartData, category]);

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
    setCategory,
    isBodyweightExercise
  };
}
