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

export interface HealthData {
  date: string;
  
  // Activity
  steps?: number;
  steps_source?: string;
  active_calories?: number;
  active_calories_source?: string;
  distance?: number;
  distance_source?: string;
  avg_speed?: number;
  avg_speed_source?: string;
  max_speed?: number;
  max_speed_source?: string;
  elevation_gain?: number;
  elevation_gain_source?: string;
  workout_time?: number;
  workout_time_source?: string;
  
  // Heart
  heart_rate_avg?: number;
  heart_rate_avg_source?: string;
  resting_heart_rate?: number;
  resting_heart_rate_source?: string;
  max_heart_rate?: number;
  max_heart_rate_source?: string;
  hrv?: number;
  hrv_source?: string;
  sleep_hrv?: number;
  sleep_hrv_source?: string;
  hr_zones_low?: number;
  hr_zones_low_source?: string;
  hr_zones_high?: number;
  hr_zones_high_source?: string;
  
  // Sleep
  sleep_hours?: number;
  sleep_hours_source?: string;
  sleep_efficiency?: number;
  sleep_efficiency_source?: string;
  sleep_performance?: number;
  sleep_performance_source?: string;
  deep_sleep_duration?: number;
  deep_sleep_duration_source?: string;
  light_sleep_duration?: number;
  light_sleep_duration_source?: string;
  rem_sleep_duration?: number;
  rem_sleep_duration_source?: string;
  respiratory_rate?: number;
  respiratory_rate_source?: string;
  
  // Body Composition
  weight?: number;
  weight_source?: string;
  body_fat?: number;
  body_fat_source?: string;
  muscle_mass?: number;
  muscle_mass_source?: string;
  muscle_percent?: number;
  muscle_percent_source?: string;
  
  // Recovery
  recovery_score?: number;
  recovery_score_source?: string;
  day_strain?: number;
  day_strain_source?: string;
  workout_strain?: number;
  workout_strain_source?: string;
  body_battery?: number;
  body_battery_source?: string;
  stress_level?: number;
  stress_level_source?: string;
  
  // Workouts
  workout_calories?: number;
  workout_calories_source?: string;
  
  // Health Metrics
  vo2_max?: number;
  vo2_max_source?: string;
  blood_pressure?: number;
  blood_pressure_source?: string;
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
          entry.sleep_hours = metric.value;
          entry.sleep_hours_source = metric.source;
          break;
        case 'Sleep Efficiency':
          entry.sleep_efficiency = metric.value;
          entry.sleep_efficiency_source = metric.source;
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

      const [
        goalsResult,
        measurementsResult,
        unifiedMeasurementsResult,
        healthSummaryResult,
        unifiedMetricsResult,
        aiLogsResult
      ] = await Promise.all([
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

        supabase
          .from('client_unified_metrics')
          .select('*')
          .eq('user_id', clientUserId)
          .gte('measurement_date', thirtyDaysAgoDate)
          .in('metric_name', [
            'Recovery Score', 'Day Strain', 'Sleep Duration', 
            'Workout Calories', 'Active Calories', 'Average Heart Rate', 'Max Heart Rate',
            'Sleep Efficiency', 'Sleep Performance', 'Resting Heart Rate',
            'Body Battery', 'Stress Level', 'VO2 Max',
            'Deep Sleep Duration', 'Light Sleep Duration', 'REM Sleep Duration',
            'Sleep HRV RMSSD', 'Respiratory Rate', 'Steps'
          ])
          .order('measurement_date', { ascending: false }),

        supabase
          .from('daily_health_summary')
          .select('*')
          .eq('user_id', clientUserId)
          .gte('date', thirtyDaysAgoDate)
          .order('date', { ascending: true }),

        supabase
          .from('client_unified_metrics')
          .select('*')
          .eq('user_id', clientUserId)
          .in('metric_name', [
            // Activity
            'Steps', 'Active Calories', 'Distance', 'Avg Speed', 
            'Max Speed', 'Elevation Gain', 'Workout Time',
            
            // Heart
            'Average Heart Rate', 'Resting Heart Rate', 'Max Heart Rate',
            'HRV RMSSD', 'Sleep HRV RMSSD', 'HR Zones 1-3 (Weekly)', 
            'HR Zones 4-5 (Weekly)',
            
            // Sleep
            'Sleep Duration', 'Sleep Efficiency', 'Sleep Performance',
            'Deep Sleep Duration', 'Light Sleep Duration', 'REM Sleep Duration',
            'Respiratory Rate',
            
            // Body Composition
            'Weight', 'Body Fat Percentage', 'Мышечная масса', 
            'Процент мышц', 'Процент жира',
            
            // Recovery
            'Recovery Score', 'Day Strain', 'Workout Strain',
            'Body Battery', 'Stress Level',
            
            // Workouts
            'Workout Calories',
            
            // Health Metrics
            'VO2 Max', 'VO2Max', 'Пульсовое давление'
          ])
          .gte('measurement_date', thirtyDaysAgoDate)
          .order('measurement_date', { ascending: true }),

        supabase
          .from('ai_action_logs')
          .select('*')
          .eq('client_id', clientUserId)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      if (goalsResult.error) {
        console.error('Error loading goals:', goalsResult.error);
        throw goalsResult.error;
      }
      if (measurementsResult.error) {
        console.error('Error loading measurements:', measurementsResult.error);
        throw measurementsResult.error;
      }
      if (unifiedMeasurementsResult.error) {
        console.error('Error loading unified measurements:', unifiedMeasurementsResult.error);
      }
      if (healthSummaryResult.error) {
        console.error('Error loading health summary:', healthSummaryResult.error);
      }
      if (unifiedMetricsResult.error) {
        console.error('Error loading unified metrics:', unifiedMetricsResult.error);
      }
      if (aiLogsResult.error) {
        console.error('Error loading AI logs:', aiLogsResult.error);
      }

      const goalsWithProgress = (goalsResult.data || []).map(goal => {
        const latestMeasurement = goal.measurements?.[0];
        let currentValue = latestMeasurement?.value || 0;
        
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

      const manualMeasurements = (measurementsResult.data || []).map(m => ({
        id: m.id,
        value: m.value,
        measurement_date: m.measurement_date,
        goal_name: m.goals?.goal_name || 'Неизвестная цель',
        unit: m.goals?.target_unit || '',
        source: 'manual'
      }));

      const autoMeasurements = (unifiedMeasurementsResult.data || []).map(um => ({
        id: `${um.user_id}-${um.measurement_date}-${um.metric_name}`,
        value: um.value,
        measurement_date: um.measurement_date,
        goal_name: um.metric_name,
        unit: um.unit || '',
        source: um.source
      }));

      const processedMeasurements = [...manualMeasurements, ...autoMeasurements]
        .sort((a, b) => new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime());

      let unifiedMetrics = unifiedMetricsResult.data || [];
      
      // If no data from view, try secure RPC as backup
      if (unifiedMetrics.length === 0 || unifiedMetricsResult.error) {
        console.log('Using backup RPC to fetch unified metrics for:', clientUserId);
        const rpcResult = await supabase.rpc('get_client_unified_metrics_secure', {
          p_user_id: clientUserId,
          p_start_date: thirtyDaysAgoDate,
          p_end_date: null,
          p_unified_metric_name: null
        });

        if (rpcResult.error) {
          console.error('Backup RPC also failed:', rpcResult.error);
        } else if (rpcResult.data && rpcResult.data.length > 0) {
          console.log('Successfully loaded metrics via backup RPC:', rpcResult.data.length);
          // Transform RPC result to match expected format
          unifiedMetrics = rpcResult.data.map((r: any) => ({
            user_id: clientUserId,
            measurement_date: r.measurement_date,
            metric_name: r.unified_metric_name,
            value: r.aggregated_value,
            unit: r.unified_unit,
            source: (r.sources && r.sources[0]) || 'unknown',
            priority: 1
          }));
        }
      }

      const mergedHealthData = mergeHealthData(
        healthSummaryResult.data || [], 
        unifiedMetrics
      );

      const whoopData = calculateWhoopSummary(unifiedMetricsResult.data || []);
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

