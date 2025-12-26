import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  syncHistoricalToEcho11, 
  HistoricalDayData 
} from '@/utils/elite10Connector';

interface SyncProgress {
  current: number;
  total: number;
  status: 'idle' | 'loading' | 'syncing' | 'done' | 'error';
  message: string;
}

interface SyncResult {
  success: number;
  failed: number;
  errors: string[];
}

export function useSyncHistoricalData() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<SyncProgress>({
    current: 0,
    total: 0,
    status: 'idle',
    message: ''
  });
  const [result, setResult] = useState<SyncResult | null>(null);

  const syncLastNDays = useCallback(async (days: number = 7) => {
    if (!user?.id) {
      setProgress({ current: 0, total: 0, status: 'error', message: 'Пользователь не авторизован' });
      return;
    }

    const syncSecret = import.meta.env.VITE_ELITE10_SYNC_SECRET;
    if (!syncSecret) {
      setProgress({ current: 0, total: 0, status: 'error', message: 'ELITE10_SYNC_SECRET не настроен' });
      return;
    }

    setProgress({ current: 0, total: days, status: 'loading', message: 'Загрузка данных...' });
    setResult(null);

    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Fetch unified_metrics for sleep and recovery
      const { data: metricsData, error: metricsError } = await supabase
        .from('unified_metrics')
        .select('metric_name, value, measurement_date, source')
        .eq('user_id', user.id)
        .gte('measurement_date', startDateStr)
        .lte('measurement_date', endDateStr)
        .in('metric_name', ['Recovery Score', 'Sleep Efficiency', 'Sleep Duration', 'Sleep Score'])
        .order('measurement_date', { ascending: true });

      if (metricsError) {
        console.error('Error fetching metrics:', metricsError);
        setProgress({ current: 0, total: days, status: 'error', message: 'Ошибка загрузки метрик' });
        return;
      }

      // Fetch workout_logs for workout types
      const { data: workoutData, error: workoutError } = await supabase
        .from('workout_logs')
        .select('exercise_name, actual_rpe, performed_at, exercise_category')
        .eq('user_id', user.id)
        .gte('performed_at', startDateStr)
        .lte('performed_at', endDateStr + 'T23:59:59')
        .order('performed_at', { ascending: true });

      if (workoutError) {
        console.error('Error fetching workouts:', workoutError);
      }

      // Group data by date
      const dataByDate = new Map<string, {
        sleep_quality: number[];
        recovery_score: number[];
        workout_types: string[];
        workout_intensities: number[];
      }>();

      // Initialize all days in range
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dataByDate.set(dateStr, {
          sleep_quality: [],
          recovery_score: [],
          workout_types: [],
          workout_intensities: []
        });
      }

      // Process metrics
      metricsData?.forEach(metric => {
        const dateStr = metric.measurement_date;
        const dayData = dataByDate.get(dateStr);
        if (!dayData) return;

        if (metric.metric_name === 'Recovery Score') {
          dayData.recovery_score.push(metric.value);
        } else if (['Sleep Efficiency', 'Sleep Score'].includes(metric.metric_name)) {
          dayData.sleep_quality.push(metric.value);
        }
      });

      // Process workouts
      workoutData?.forEach(workout => {
        const dateStr = workout.performed_at.split('T')[0];
        const dayData = dataByDate.get(dateStr);
        if (!dayData) return;

        // Use exercise_category if available, otherwise map from name
        let workoutType = workout.exercise_category || 'General';
        
        if (!workout.exercise_category) {
          const exerciseName = workout.exercise_name.toLowerCase();
          if (exerciseName.includes('bench') || exerciseName.includes('press') || exerciseName.includes('curl') || exerciseName.includes('fly')) {
            workoutType = 'Upper Body';
          } else if (exerciseName.includes('squat') || exerciseName.includes('leg') || exerciseName.includes('lunge') || exerciseName.includes('deadlift')) {
            workoutType = 'Leg Day';
          } else if (exerciseName.includes('run') || exerciseName.includes('row') || exerciseName.includes('bike') || exerciseName.includes('cardio')) {
            workoutType = 'Cardio';
          } else if (exerciseName.includes('plank') || exerciseName.includes('crunch') || exerciseName.includes('core')) {
            workoutType = 'Core';
          }
        }

        dayData.workout_types.push(workoutType);
        if (workout.actual_rpe) {
          dayData.workout_intensities.push(workout.actual_rpe);
        }
      });

      // Build historical data array
      const historicalData: HistoricalDayData[] = [];

      dataByDate.forEach((data, date) => {
        // Calculate averages
        const sleepQuality = data.sleep_quality.length > 0
          ? Math.round(data.sleep_quality.reduce((a, b) => a + b, 0) / data.sleep_quality.length)
          : 70; // Default if no data

        const recoveryScore = data.recovery_score.length > 0
          ? Math.round(data.recovery_score.reduce((a, b) => a + b, 0) / data.recovery_score.length)
          : 60; // Default if no data

        // Determine workout type (most common or Rest)
        const workoutType = data.workout_types.length > 0
          ? getMostCommon(data.workout_types)
          : 'Rest';

        // Determine intensity from RPE or default
        let intensity: 'Low' | 'Medium' | 'High' | 'Extreme' = 'Low';
        if (data.workout_intensities.length > 0) {
          const avgRpe = data.workout_intensities.reduce((a, b) => a + b, 0) / data.workout_intensities.length;
          if (avgRpe >= 9) intensity = 'Extreme';
          else if (avgRpe >= 7) intensity = 'High';
          else if (avgRpe >= 5) intensity = 'Medium';
          else intensity = 'Low';
        } else if (workoutType !== 'Rest') {
          intensity = 'Medium'; // Default for workouts without RPE
        }

        historicalData.push({
          date,
          sleep_quality: sleepQuality,
          recovery_score: recoveryScore,
          workout_type: workoutType,
          workout_intensity: intensity,
          nutrition_status: 'Maintenance' // Default
        });
      });

      if (historicalData.length === 0) {
        setProgress({ current: 0, total: 0, status: 'error', message: 'Нет данных для синхронизации' });
        return;
      }

      // Start syncing
      setProgress({ 
        current: 0, 
        total: historicalData.length, 
        status: 'syncing', 
        message: `Синхронизация 0/${historicalData.length}...` 
      });

      const syncResult = await syncHistoricalToEcho11(
        user.id,
        historicalData,
        syncSecret,
        (current, total) => {
          setProgress({
            current,
            total,
            status: 'syncing',
            message: `Синхронизация ${current}/${total}...`
          });
        }
      );

      setResult({
        success: syncResult.success,
        failed: syncResult.failed,
        errors: syncResult.errors
      });

      setProgress({
        current: historicalData.length,
        total: historicalData.length,
        status: 'done',
        message: syncResult.failed === 0 
          ? `Успешно синхронизировано ${syncResult.success} дней`
          : `Синхронизировано ${syncResult.success}, ошибок: ${syncResult.failed}`
      });

    } catch (error) {
      console.error('Sync error:', error);
      setProgress({
        current: 0,
        total: 0,
        status: 'error',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  }, [user?.id]);

  const reset = useCallback(() => {
    setProgress({ current: 0, total: 0, status: 'idle', message: '' });
    setResult(null);
  }, []);

  return {
    syncLastNDays,
    progress,
    result,
    reset,
    isLoading: progress.status === 'loading' || progress.status === 'syncing'
  };
}

// Helper function to get most common element
function getMostCommon(arr: string[]): string {
  const counts = new Map<string, number>();
  arr.forEach(item => counts.set(item, (counts.get(item) || 0) + 1));
  let maxCount = 0;
  let maxItem = arr[0];
  counts.forEach((count, item) => {
    if (count > maxCount) {
      maxCount = count;
      maxItem = item;
    }
  });
  return maxItem;
}
