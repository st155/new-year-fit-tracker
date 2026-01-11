import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HealthData } from "@/components/trainer/health-data/types";
import i18n from "@/i18n";

interface Goal {
  id: string;
  goal_name: string;
  target_value: number;
  target_unit: string;
  goal_type: string;
  current_value: number;
  progress_percentage: number;
  last_measurement_date: string | null;
  measurements_count: number;
}

interface Measurement {
  id: string;
  goal_id: string;
  value: number;
  measurement_date: string;
  goal_name: string;
  unit: string;
  source?: string;
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

export function useClientDetailData(clientUserId?: string) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [healthData, setHealthData] = useState<HealthData[]>([]);
  const [whoopSummary, setWhoopSummary] = useState<WhoopSummary | null>(null);
  const [ouraSummary, setOuraSummary] = useState<OuraSummary | null>(null);
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (clientUserId) {
      loadClientData();
    } else {
      setLoading(false);
    }
  }, [clientUserId]);

  const mergeHealthData = (summaryData: any[], unifiedData: any[]): HealthData[] => {
    const dataMap = new Map<string, HealthData>();

    // Process unified metrics
    unifiedData?.forEach(metric => {
      const date = metric.measurement_date;
      const existing = dataMap.get(date) || { date } as HealthData;

      const entry = existing;
      
      switch (metric.metric_name) {
        // Activity
        case 'Steps':
          entry.steps = metric.value;
          entry.steps_source = metric.source;
          break;
        case 'Active Calories':
          entry.active_calories = metric.value;
          entry.active_calories_source = metric.source;
          break;
        case 'Distance':
          entry.distance = metric.value;
          entry.distance_source = metric.source;
          break;
        case 'Avg Speed':
          entry.avg_speed = metric.value;
          entry.avg_speed_source = metric.source;
          break;
        case 'Max Speed':
          entry.max_speed = metric.value;
          entry.max_speed_source = metric.source;
          break;
        case 'Elevation Gain':
          entry.elevation_gain = metric.value;
          entry.elevation_gain_source = metric.source;
          break;
        case 'Workout Time':
          entry.workout_time = metric.value;
          entry.workout_time_source = metric.source;
          break;
          
        // Heart
        case 'Average Heart Rate':
          entry.heart_rate_avg = metric.value;
          entry.heart_rate_avg_source = metric.source;
          break;
        case 'Resting Heart Rate':
          entry.resting_heart_rate = metric.value;
          entry.resting_heart_rate_source = metric.source;
          break;
        case 'Max Heart Rate':
          entry.max_heart_rate = metric.value;
          entry.max_heart_rate_source = metric.source;
          break;
        case 'HRV RMSSD':
          entry.hrv = metric.value;
          entry.hrv_source = metric.source;
          break;
        case 'Sleep HRV RMSSD':
          entry.sleep_hrv = metric.value;
          entry.sleep_hrv_source = metric.source;
          break;
        case 'HR Zones 1-3 (Weekly)':
          entry.hr_zones_low = metric.value;
          entry.hr_zones_low_source = metric.source;
          break;
        case 'HR Zones 4-5 (Weekly)':
          entry.hr_zones_high = metric.value;
          entry.hr_zones_high_source = metric.source;
          break;
          
        // Sleep
        case 'Sleep Duration':
          // Prioritize WHOOP over other sources, and longest sleep duration
          {
            const isWhoop = metric.source.toUpperCase() === 'WHOOP';
            const existingIsWhoop = entry.sleep_hours_source?.toUpperCase() === 'WHOOP';
            
            if (!entry.sleep_hours) {
              // No existing value, take this one
              entry.sleep_hours = metric.value;
              entry.sleep_hours_source = metric.source;
            } else if (isWhoop && !existingIsWhoop) {
              // WHOOP overrides non-WHOOP
              entry.sleep_hours = metric.value;
              entry.sleep_hours_source = metric.source;
            } else if (isWhoop === existingIsWhoop) {
              // Same source priority, take longest sleep
              if (metric.value > entry.sleep_hours) {
                entry.sleep_hours = metric.value;
                entry.sleep_hours_source = metric.source;
              }
            }
            // else: existing is WHOOP, new is not, keep existing
          }
          break;
        case 'Sleep Efficiency':
          // Prioritize WHOOP over other sources
          {
            const isWhoop = metric.source.toUpperCase() === 'WHOOP';
            const existingIsWhoop = entry.sleep_efficiency_source?.toUpperCase() === 'WHOOP';
            
            if (!entry.sleep_efficiency) {
              entry.sleep_efficiency = metric.value;
              entry.sleep_efficiency_source = metric.source;
            } else if (isWhoop && !existingIsWhoop) {
              entry.sleep_efficiency = metric.value;
              entry.sleep_efficiency_source = metric.source;
            } else if (isWhoop === existingIsWhoop && metric.value > entry.sleep_efficiency) {
              entry.sleep_efficiency = metric.value;
              entry.sleep_efficiency_source = metric.source;
            }
          }
          break;
        case 'Sleep Performance':
          entry.sleep_performance = metric.value;
          entry.sleep_performance_source = metric.source;
          break;
        case 'Deep Sleep Duration':
          entry.deep_sleep_duration = metric.value;
          entry.deep_sleep_duration_source = metric.source;
          break;
        case 'Light Sleep Duration':
          entry.light_sleep_duration = metric.value;
          entry.light_sleep_duration_source = metric.source;
          break;
        case 'REM Sleep Duration':
          entry.rem_sleep_duration = metric.value;
          entry.rem_sleep_duration_source = metric.source;
          break;
        case 'Respiratory Rate':
          entry.respiratory_rate = metric.value;
          entry.respiratory_rate_source = metric.source;
          break;
          
        // Body Composition
        case 'Weight':
          entry.weight = metric.value;
          entry.weight_source = metric.source;
          break;
        case 'Body Fat Percentage':
        case 'Процент жира':
          entry.body_fat = metric.value;
          entry.body_fat_source = metric.source;
          break;
        case 'Мышечная масса':
          entry.muscle_mass = metric.value;
          entry.muscle_mass_source = metric.source;
          break;
        case 'Процент мышц':
          entry.muscle_percent = metric.value;
          entry.muscle_percent_source = metric.source;
          break;
          
        // Recovery
        case 'Recovery Score':
          entry.recovery_score = metric.value;
          entry.recovery_score_source = metric.source;
          break;
        case 'Day Strain':
          entry.day_strain = metric.value;
          entry.day_strain_source = metric.source;
          break;
        case 'Workout Strain':
          entry.workout_strain = metric.value;
          entry.workout_strain_source = metric.source;
          break;
        case 'Body Battery':
          entry.body_battery = metric.value;
          entry.body_battery_source = metric.source;
          break;
        case 'Stress Level':
          entry.stress_level = metric.value;
          entry.stress_level_source = metric.source;
          break;
          
        // Workouts
        case 'Workout Calories':
          entry.workout_calories = metric.value;
          entry.workout_calories_source = metric.source;
          break;
          
        // Health Metrics
        case 'VO2 Max':
        case 'VO2Max':
          entry.vo2_max = metric.value;
          entry.vo2_max_source = metric.source;
          break;
        case 'Пульсовое давление':
          entry.blood_pressure = metric.value;
          entry.blood_pressure_source = metric.source;
          break;
      }

      dataMap.set(date, entry);
    });

    // Supplement with daily_health_summary
    summaryData.forEach(item => {
      const existing = dataMap.get(item.date) || { date: item.date } as HealthData;

      existing.steps = existing.steps ?? item.steps;
      existing.weight = existing.weight ?? item.weight;
      existing.heart_rate_avg = existing.heart_rate_avg ?? item.heart_rate_avg;
      existing.active_calories = existing.active_calories ?? item.active_calories;
      existing.sleep_hours = existing.sleep_hours ?? item.sleep_hours;

      dataMap.set(item.date, existing);
    });

    return Array.from(dataMap.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const calculateWhoopSummary = (unifiedData: any[]): WhoopSummary | null => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentData = unifiedData.filter(d => 
      new Date(d.measurement_date) >= sevenDaysAgo && d.source?.toLowerCase() === 'whoop'
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
      new Date(d.measurement_date) >= sevenDaysAgo && d.source?.toLowerCase() === 'oura'
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

      // Use new optimized RPC function - fetches all data in one call
      const { data: rawData, error: rpcError } = await supabase
        .rpc('get_client_detailed_data', {
          p_client_id: clientUserId,
          p_days: 30
        });

      if (rpcError) throw rpcError;

      // Parse JSONB response
      const parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      setClientData(parsedData);

      if (!parsedData) {
        setGoals([]);
        setMeasurements([]);
        setHealthData([]);
        setWhoopSummary(null);
        setOuraSummary(null);
        setLoading(false);
        return;
      }

      // Fetch goals with progress using new RPC
      const { data: goalsWithProgress, error: goalsError } = await supabase
        .rpc('get_client_goals_with_progress', { p_user_id: clientUserId });

      if (goalsError) {
        console.error('Error fetching goals with progress:', goalsError);
      }

      const goalsData = (goalsWithProgress || []).map((g: any) => ({
        id: g.id,
        goal_name: g.goal_name,
        target_value: g.target_value,
        target_unit: g.target_unit,
        goal_type: g.goal_type,
        current_value: g.current_value,
        progress_percentage: g.progress_percentage,
        last_measurement_date: g.last_measurement_date,
        measurements_count: g.measurements_count
      }));

      // Process measurements
      const measurementsData = (parsedData.measurements || []).map((m: any) => ({
        id: m.id,
        goal_id: m.goal_id || '',
        value: m.value,
        measurement_date: m.measurement_date,
        goal_name: m.goal_name,
        unit: m.unit,
        source: m.source
      }));

      // Process unified metrics with proper format
      const unifiedMetricsData = (parsedData.unified_metrics || []).map((m: any) => ({
        user_id: clientUserId,
        metric_name: m.metric_name,
        value: m.value,
        measurement_date: m.measurement_date,
        source: m.source,
        unit: m.unit,
        priority: 1
      }));

      // Merge health data
      const mergedHealth = mergeHealthData(
        parsedData.health_summary || [],
        unifiedMetricsData
      );

      // Calculate summaries
      const whoopSum = calculateWhoopSummary(unifiedMetricsData);
      const ouraSum = calculateOuraSummary(unifiedMetricsData);

      setGoals(goalsData);
      setMeasurements(measurementsData);
      setHealthData(mergedHealth);
      setWhoopSummary(whoopSum);
      setOuraSummary(ouraSum);
      setError(null);

    } catch (err) {
      console.error('Error loading client data:', err);
      
      // Create more informative error messages using i18n
      let errorMessage = i18n.t('trainerDashboard:clientErrors.unknown');
      
      if (err instanceof Error) {
        const message = err.message.toLowerCase();
        
        if (message.includes('permission') || message.includes('access denied') || message.includes('unauthorized')) {
          errorMessage = i18n.t('trainerDashboard:clientErrors.accessDenied');
        } else if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
          errorMessage = i18n.t('trainerDashboard:clientErrors.networkError');
        } else if (message.includes('not found') || message.includes('no rows')) {
          errorMessage = i18n.t('trainerDashboard:clientErrors.notFound');
        } else if (message.includes('timeout')) {
          errorMessage = i18n.t('trainerDashboard:clientErrors.timeout');
        } else {
          errorMessage = i18n.t('trainerDashboard:clientErrors.loadError', { message: err.message });
        }
        
        setError(new Error(errorMessage));
      } else {
        setError(new Error(errorMessage));
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    goals,
    measurements,
    healthData,
    whoopSummary,
    ouraSummary,
    loading,
    error,
    refetch: loadClientData,
    // Export unified metrics for workout analysis, including workouts
    unifiedMetrics: [
      ...(clientData?.unified_metrics || []),
      ...(clientData?.workouts || []).map((w: any) => ({
        user_id: clientUserId,
        metric_name: 'Workout Type',
        value: w.workout_type,
        measurement_date: w.measurement_date || w.start_time?.split('T')?.[0],
        source: w.source,
        unit: 'activity',
        priority: 1,
        // Store complete workout data
        workout: w
      }))
    ]
  };
}

export const formatSourceName = (source: string): string => {
  const sourceMap: Record<string, string> = {
    'whoop': 'Whoop',
    'garmin': 'Garmin',
    'oura': 'Oura',
    'apple_health': 'Apple Health',
    'withings': 'Withings',
    'terra': 'Terra',
    'manual': 'Ручной ввод',
    'ultrahuman': 'Ultrahuman'
  };
  return sourceMap[source.toLowerCase()] || source;
};

