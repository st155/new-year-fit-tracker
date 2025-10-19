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
}

interface HealthData {
  date: string;
  steps?: number;
  weight?: number;
  heart_rate_avg?: number;
  active_calories?: number;
  sleep_hours?: number;
}

export function useClientDetailData(clientUserId: string) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [healthData, setHealthData] = useState<HealthData[]>([]);
  const [aiHistory, setAiHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadClientData();
  }, [clientUserId]);

  const mergeHealthData = (summaryData: any[], unifiedData: any[]): HealthData[] => {
    const dataMap = new Map<string, HealthData>();

    summaryData.forEach(item => {
      dataMap.set(item.date, {
        date: item.date,
        steps: item.steps,
        weight: item.weight,
        heart_rate_avg: item.heart_rate_avg,
        active_calories: item.active_calories,
        sleep_hours: item.sleep_hours
      });
    });

    unifiedData?.forEach(metric => {
      const date = metric.measurement_date;
      const existing = dataMap.get(date) || {
        date,
        steps: undefined,
        weight: undefined,
        heart_rate_avg: undefined,
        active_calories: undefined,
        sleep_hours: undefined
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
      }

      dataMap.set(date, existing);
    });

    return Array.from(dataMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
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
            measurements!inner(
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

        // Измерения за последние 30 дней
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
          .in('metric_name', ['Steps', 'Average Heart Rate', 'Resting Heart Rate', 'Weight'])
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
      if (healthSummaryResult.error) throw healthSummaryResult.error;
      if (aiLogsResult.error) throw aiLogsResult.error;

      // Обрабатываем цели
      const goalsWithProgress = (goalsResult.data || []).map(goal => {
        const latestMeasurement = goal.measurements?.[0];
        const currentValue = latestMeasurement?.value || 0;
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

      // Обрабатываем измерения
      const processedMeasurements = (measurementsResult.data || []).map(m => ({
        id: m.id,
        value: m.value,
        measurement_date: m.measurement_date,
        goal_name: m.goals?.goal_name || 'Неизвестная цель',
        unit: m.goals?.target_unit || ''
      }));

      // Объединяем данные здоровья
      const mergedHealthData = mergeHealthData(
        healthSummaryResult.data || [], 
        unifiedMetricsResult.data || []
      );

      setGoals(goalsWithProgress);
      setMeasurements(processedMeasurements);
      setHealthData(mergedHealthData);
      setAiHistory(aiLogsResult.data || []);

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
    loading,
    error,
    refetch: loadClientData
  };
}
