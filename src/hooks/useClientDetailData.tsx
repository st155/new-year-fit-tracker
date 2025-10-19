import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Goal {
  id: string;
  goal_name: string;
  target_value: number;
  target_unit: string;
  goal_type: string;
  current_value?: number;
  progress_percentage?: number;
}

interface Measurement {
  id: string;
  value: number;
  measurement_date: string;
  goal_name: string;
  unit: string;
  source?: string;
}

interface HealthData {
  date: string;
  steps?: number;
  weight?: number;
  heart_rate_avg?: number;
  active_calories?: number;
  sleep_hours?: number;
  recovery_score?: number;
  day_strain?: number;
  // Oura-specific metrics
  sleep_efficiency?: number;
  deep_sleep_duration?: number;
  light_sleep_duration?: number;
  rem_sleep_duration?: number;
  hrv?: number;
  respiratory_rate?: number;
}

interface WhoopSummary {
  recoveryScore: {
    avg: number;
    min: number;
    max: number;
    count: number;
  };
  sleep: {
    durationAvg: number;
    durationMin: number;
    durationMax: number;
    efficiencyAvg: number;
    performanceAvg: number;
    count: number;
  };
  strain: {
    dayStrainAvg: number;
    dayStrainMin: number;
    dayStrainMax: number;
    workoutCount: number;
    workoutStrainAvg: number;
  };
}

interface OuraSummary {
  sleep: {
    durationAvg: number;
    efficiencyAvg: number;
    deepSleepAvg: number;
    remSleepAvg: number;
    count: number;
  };
  hrv: {
    avg: number;
    min: number;
    max: number;
    count: number;
  };
  respiratoryRate: {
    avg: number;
    count: number;
  };
}

export function useClientDetailData(clientUserId: string) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [healthData, setHealthData] = useState<HealthData[]>([]);
  const [aiHistory, setAiHistory] = useState<any[]>([]);
  const [whoopSummary, setWhoopSummary] = useState<WhoopSummary | null>(null);
  const [ouraSummary, setOuraSummary] = useState<OuraSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadClientData();
  }, [clientUserId]);

  const mergeHealthData = (summaryData: any[], unifiedData: any[]): HealthData[] => {
    const dataMap = new Map<string, HealthData>();

    // First process unified metrics (Whoop, Withings, etc.) - they have priority
    unifiedData?.forEach(metric => {
      const date = metric.measurement_date;
      const existing = dataMap.get(date) || {
        date,
        steps: undefined,
        weight: undefined,
        heart_rate_avg: undefined,
        active_calories: undefined,
        sleep_hours: undefined,
        recovery_score: undefined,
        day_strain: undefined,
        sleep_efficiency: undefined,
        deep_sleep_duration: undefined,
        light_sleep_duration: undefined,
        rem_sleep_duration: undefined,
        hrv: undefined,
        respiratory_rate: undefined
      };

      switch (metric.metric_name) {
        case 'Steps':
          existing.steps = metric.value;
          break;
        case 'Average Heart Rate':
        case 'Resting Heart Rate':
          if (!existing.heart_rate_avg) {
            existing.heart_rate_avg = metric.value;
          }
          break;
        case 'Weight':
          if (!existing.weight) {
            existing.weight = metric.value;
          }
          break;
        case 'Sleep Duration':
          existing.sleep_hours = metric.value;
          break;
        case 'Recovery Score':
          existing.recovery_score = metric.value;
          break;
        case 'Day Strain':
          existing.day_strain = metric.value;
          break;
        case 'Workout Calories':
          existing.active_calories = metric.value;
          break;
        // Oura-specific metrics
        case 'Sleep Efficiency':
          existing.sleep_efficiency = metric.value;
          break;
        case 'Deep Sleep Duration':
          existing.deep_sleep_duration = metric.value;
          break;
        case 'Light Sleep Duration':
          existing.light_sleep_duration = metric.value;
          break;
        case 'REM Sleep Duration':
          existing.rem_sleep_duration = metric.value;
          break;
        case 'Sleep HRV RMSSD':
          existing.hrv = metric.value;
          break;
        case 'Respiratory Rate':
          existing.respiratory_rate = metric.value;
          break;
      }

      dataMap.set(date, existing);
    });

    // Then supplement with daily_health_summary (Apple Health, etc.)
    summaryData.forEach(item => {
      const existing = dataMap.get(item.date) || {
        date: item.date,
        steps: undefined,
        weight: undefined,
        heart_rate_avg: undefined,
        active_calories: undefined,
        sleep_hours: undefined,
        recovery_score: undefined,
        day_strain: undefined,
        sleep_efficiency: undefined,
        deep_sleep_duration: undefined,
        light_sleep_duration: undefined,
        rem_sleep_duration: undefined,
        hrv: undefined,
        respiratory_rate: undefined
      };

      // Fill only fields that don't exist yet (unified metrics have priority)
      existing.steps = existing.steps ?? item.steps;
      existing.weight = existing.weight ?? item.weight;
      existing.heart_rate_avg = existing.heart_rate_avg ?? item.heart_rate_avg;
      existing.active_calories = existing.active_calories ?? item.active_calories;
      existing.sleep_hours = existing.sleep_hours ?? item.sleep_hours;

      dataMap.set(item.date, existing);
    });

    return Array.from(dataMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const calculateWhoopSummary = (unifiedData: any[]): WhoopSummary | null => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentData = unifiedData.filter(d => 
      new Date(d.measurement_date) >= sevenDaysAgo && d.source === 'whoop'
    );

    if (recentData.length === 0) return null;

    const recoveryScores = recentData.filter(d => d.metric_name === 'Recovery Score');
    const sleepDurations = recentData.filter(d => d.metric_name === 'Sleep Duration');
    const sleepEfficiency = recentData.filter(d => d.metric_name === 'Sleep Efficiency');
    const sleepPerformance = recentData.filter(d => d.metric_name === 'Sleep Performance');
    const dayStrains = recentData.filter(d => d.metric_name === 'Day Strain');
    const workoutStrains = recentData.filter(d => d.metric_name === 'Workout Strain');

    const avg = (arr: any[]) => arr.length > 0 ? arr.reduce((sum, d) => sum + d.value, 0) / arr.length : 0;
    const min = (arr: any[]) => arr.length > 0 ? Math.min(...arr.map(d => d.value)) : 0;
    const max = (arr: any[]) => arr.length > 0 ? Math.max(...arr.map(d => d.value)) : 0;

    return {
      recoveryScore: {
        avg: Math.round(avg(recoveryScores)),
        min: Math.round(min(recoveryScores)),
        max: Math.round(max(recoveryScores)),
        count: recoveryScores.length
      },
      sleep: {
        durationAvg: parseFloat(avg(sleepDurations).toFixed(1)),
        durationMin: parseFloat(min(sleepDurations).toFixed(1)),
        durationMax: parseFloat(max(sleepDurations).toFixed(1)),
        efficiencyAvg: Math.round(avg(sleepEfficiency)),
        performanceAvg: Math.round(avg(sleepPerformance)),
        count: sleepDurations.length
      },
      strain: {
        dayStrainAvg: parseFloat(avg(dayStrains).toFixed(1)),
        dayStrainMin: parseFloat(min(dayStrains).toFixed(1)),
        dayStrainMax: parseFloat(max(dayStrains).toFixed(1)),
        workoutCount: workoutStrains.length,
        workoutStrainAvg: parseFloat(avg(workoutStrains).toFixed(1))
      }
    };
  };

  const calculateOuraSummary = (unifiedData: any[]): OuraSummary | null => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentData = unifiedData.filter(d => 
      new Date(d.measurement_date) >= sevenDaysAgo && d.source === 'oura'
    );

    if (recentData.length === 0) return null;

    const sleepDurations = recentData.filter(d => d.metric_name === 'Sleep Duration');
    const sleepEfficiency = recentData.filter(d => d.metric_name === 'Sleep Efficiency');
    const deepSleep = recentData.filter(d => d.metric_name === 'Deep Sleep Duration');
    const remSleep = recentData.filter(d => d.metric_name === 'REM Sleep Duration');
    const hrvData = recentData.filter(d => d.metric_name === 'Sleep HRV RMSSD');
    const respRate = recentData.filter(d => d.metric_name === 'Respiratory Rate');

    const avg = (arr: any[]) => arr.length > 0 ? arr.reduce((sum, d) => sum + d.value, 0) / arr.length : 0;
    const min = (arr: any[]) => arr.length > 0 ? Math.min(...arr.map(d => d.value)) : 0;
    const max = (arr: any[]) => arr.length > 0 ? Math.max(...arr.map(d => d.value)) : 0;

    return {
      sleep: {
        durationAvg: parseFloat(avg(sleepDurations).toFixed(1)),
        efficiencyAvg: Math.round(avg(sleepEfficiency)),
        deepSleepAvg: parseFloat(avg(deepSleep).toFixed(1)),
        remSleepAvg: parseFloat(avg(remSleep).toFixed(1)),
        count: sleepDurations.length
      },
      hrv: {
        avg: Math.round(avg(hrvData)),
        min: Math.round(min(hrvData)),
        max: Math.round(max(hrvData)),
        count: hrvData.length
      },
      respiratoryRate: {
        avg: parseFloat(avg(respRate).toFixed(1)),
        count: respRate.length
      }
    };
  };

  const loadClientData = async () => {
    try {
      setLoading(true);
      setError(null);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();
      const thirtyDaysAgoDate = thirtyDaysAgo.toISOString().split('T')[0];

      // Оптимизированный запрос: загружаем все данные параллельно
      const [
        goalsResult,
        measurementsResult,
        unifiedMeasurementsResult,
        healthSummaryResult,
        unifiedMetricsResult,
        aiLogsResult
      ] = await Promise.all([
        // Загружаем цели с последними измерениями одним запросом
        supabase
          .from('goals')
          .select(`
            id,
            goal_name,
            target_value,
            target_unit,
            goal_type,
            measurements(
              value,
              measurement_date
            )
          `)
          .eq('user_id', clientUserId)
          .order('measurement_date', { 
            referencedTable: 'measurements', 
            ascending: false 
          })
          .limit(1, { referencedTable: 'measurements' }),

        // Измерения за последние 30 дней (ручные)
        supabase
          .from('measurements')
          .select(`
            id,
            value,
            measurement_date,
            goals!inner(goal_name, target_unit)
          `)
          .eq('user_id', clientUserId)
          .gte('measurement_date', thirtyDaysAgoISO)
          .order('measurement_date', { ascending: false }),

        // Unified metrics (автоматические от интеграций)
        supabase
          .from('client_unified_metrics')
          .select('*')
          .eq('user_id', clientUserId)
          .gte('measurement_date', thirtyDaysAgoDate)
          .in('metric_name', [
            'Recovery Score', 'Day Strain', 'Sleep Duration', 
            'Workout Calories', 'Average Heart Rate', 'Max Heart Rate',
            'Sleep Efficiency', 'Sleep Performance', 'Resting Heart Rate',
            'Body Battery', 'Stress Level', 'VO2 Max',
            'Deep Sleep Duration', 'Light Sleep Duration', 'REM Sleep Duration',
            'Sleep HRV RMSSD', 'Respiratory Rate'
          ])
          .order('measurement_date', { ascending: false }),

        // Данные здоровья
        supabase
          .from('daily_health_summary')
          .select('*')
          .eq('user_id', clientUserId)
          .gte('date', thirtyDaysAgoDate)
          .order('date', { ascending: true }),

        // Unified метрики
        supabase
          .from('client_unified_metrics')
          .select('*')
          .eq('user_id', clientUserId)
          .in('metric_name', ['Steps', 'Average Heart Rate', 'Resting Heart Rate', 'Weight', 'Sleep Duration', 'Recovery Score', 'Day Strain', 'Workout Calories', 'Sleep Efficiency', 'Deep Sleep Duration', 'Light Sleep Duration', 'REM Sleep Duration', 'Sleep HRV RMSSD', 'Respiratory Rate'])
          .gte('measurement_date', thirtyDaysAgoDate)
          .order('measurement_date', { ascending: true }),

        // AI история
        supabase
          .from('ai_action_logs')
          .select('*')
          .eq('client_id', clientUserId)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      if (goalsResult.error) throw goalsResult.error;
      if (measurementsResult.error) throw measurementsResult.error;
      if (unifiedMeasurementsResult.error) throw unifiedMeasurementsResult.error;
      if (healthSummaryResult.error) throw healthSummaryResult.error;
      if (aiLogsResult.error) throw aiLogsResult.error;

      // Обрабатываем цели
      const goalsWithProgress = (goalsResult.data || []).map(goal => {
        const latestMeasurement = goal.measurements?.[0];
        let currentValue = latestMeasurement?.value || 0;
        
        // If no manual measurements, try to find from unified metrics
        if (!currentValue && unifiedMeasurementsResult.data) {
          const matchingMetric = unifiedMeasurementsResult.data.find(m => 
            m.metric_name === goal.goal_name || m.metric_name === goal.goal_type
          );
          currentValue = matchingMetric?.value || 0;
        }
        
        const progressPercentage = goal.target_value 
          ? Math.min(100, Math.round((currentValue / goal.target_value) * 100))
          : 0;

        return {
          id: goal.id,
          goal_name: goal.goal_name,
          target_value: goal.target_value,
          target_unit: goal.target_unit,
          goal_type: goal.goal_type,
          current_value: currentValue,
          progress_percentage: progressPercentage
        };
      });

      // Обрабатываем ручные измерения
      const manualMeasurements = (measurementsResult.data || []).map(m => ({
        id: m.id,
        value: m.value,
        measurement_date: m.measurement_date,
        goal_name: m.goals?.goal_name || 'Неизвестная цель',
        unit: m.goals?.target_unit || '',
        source: 'manual'
      }));

      // Обрабатываем автоматические измерения из unified metrics
      const autoMeasurements = (unifiedMeasurementsResult.data || []).map(um => ({
        id: `${um.user_id}-${um.measurement_date}-${um.metric_name}`,
        value: um.value,
        measurement_date: um.measurement_date,
        goal_name: um.metric_name,
        unit: um.unit || '',
        source: um.source
      }));

      // Объединяем и сортируем по дате
      const processedMeasurements = [...manualMeasurements, ...autoMeasurements]
        .sort((a, b) => new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime());

      // Объединяем данные здоровья
      const mergedHealthData = mergeHealthData(
        healthSummaryResult.data || [], 
        unifiedMetricsResult.data || []
      );

      // Рассчитываем Whoop summary
      const whoopData = calculateWhoopSummary(unifiedMetricsResult.data || []);
      
      // Рассчитываем Oura summary
      const ouraData = calculateOuraSummary(unifiedMetricsResult.data || []);

      setGoals(goalsWithProgress);
      setMeasurements(processedMeasurements);
      setHealthData(mergedHealthData);
      setAiHistory(aiLogsResult.data || []);
      setWhoopSummary(whoopData);
      setOuraSummary(ouraData);

    } catch (err) {
      console.error('Error loading client data:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return {
    goals,
    measurements,
    healthData,
    aiHistory,
    whoopSummary,
    ouraSummary,
    loading,
    error,
    refetch: loadClientData
  };
}
