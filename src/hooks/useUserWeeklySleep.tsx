import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

interface SleepDataPoint {
  date: string;
  value: number;
  source?: string;
}

export function useUserWeeklySleep(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-weekly-sleep', userId],
    queryFn: async () => {
      if (!userId) return [];

      const endDate = new Date();
      const startDate = subDays(endDate, 7);
      const dateRange = {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
      };

      // Priority 1: Recovery Score (best indicator of sleep quality + recovery)
      const { data: recoveryData } = await supabase
        .from('unified_metrics')
        .select('measurement_date, value, source')
        .eq('user_id', userId)
        .eq('metric_name', 'Recovery Score')
        .gte('measurement_date', dateRange.start)
        .lt('measurement_date', dateRange.end)
        .order('measurement_date', { ascending: true });

      if (recoveryData && recoveryData.length > 0) {
        return recoveryData.map(item => ({
          date: item.measurement_date,
          value: item.value,
          source: item.source,
        })) as SleepDataPoint[];
      }

      // Priority 2: Sleep Efficiency (direct sleep quality metric)
      const { data: efficiencyData } = await supabase
        .from('unified_metrics')
        .select('measurement_date, value, source')
        .eq('user_id', userId)
        .eq('metric_name', 'Sleep Efficiency')
        .gte('measurement_date', dateRange.start)
        .lt('measurement_date', dateRange.end)
        .order('measurement_date', { ascending: true });

      if (efficiencyData && efficiencyData.length > 0) {
        return efficiencyData.map(item => ({
          date: item.measurement_date,
          value: item.value,
          source: item.source,
        })) as SleepDataPoint[];
      }

      // Priority 3: Sleep Performance (WHOOP specific)
      const { data: performanceData } = await supabase
        .from('unified_metrics')
        .select('measurement_date, value, source')
        .eq('user_id', userId)
        .eq('metric_name', 'Sleep Performance')
        .gte('measurement_date', dateRange.start)
        .lt('measurement_date', dateRange.end)
        .order('measurement_date', { ascending: true });

      if (performanceData && performanceData.length > 0) {
        return performanceData.map(item => ({
          date: item.measurement_date,
          value: item.value,
          source: item.source,
        })) as SleepDataPoint[];
      }

      // Priority 4: Sleep Duration (convert hours to percentage, 8h = 100%)
      const { data: durationData } = await supabase
        .from('unified_metrics')
        .select('measurement_date, value, source')
        .eq('user_id', userId)
        .eq('metric_name', 'Sleep Duration')
        .gte('measurement_date', dateRange.start)
        .lt('measurement_date', dateRange.end)
        .order('measurement_date', { ascending: true });

      if (durationData && durationData.length > 0) {
        return durationData.map(item => ({
          date: item.measurement_date,
          value: Math.min((item.value / 8) * 100, 100),
          source: item.source,
        })) as SleepDataPoint[];
      }

      return [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
