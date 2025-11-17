import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

interface SleepDataPoint {
  date: string;
  value: number;
}

export function useUserWeeklySleep(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-weekly-sleep', userId],
    queryFn: async () => {
      if (!userId) return [];

      const endDate = new Date();
      const startDate = subDays(endDate, 7);

      // Sleep Performance (WHOOP only)
      const { data: performanceData, error: perfError } = await supabase
        .from('unified_metrics')
        .select('measurement_date, value')
        .eq('user_id', userId)
        .eq('metric_name', 'Sleep Performance')
        .ilike('source', 'WHOOP')
        .gte('measurement_date', format(startDate, 'yyyy-MM-dd'))
        .lt('measurement_date', format(endDate, 'yyyy-MM-dd'))
        .order('measurement_date', { ascending: true });

      if (!perfError && performanceData && performanceData.length > 0) {
        return performanceData.map(item => ({
          date: item.measurement_date,
          value: item.value
        })) as SleepDataPoint[];
      }

      // Fallback to Sleep Duration (ULTRAHUMAN, Garmin - hours)
      const { data: durationData, error: durError } = await supabase
        .from('unified_metrics')
        .select('measurement_date, value')
        .eq('user_id', userId)
        .eq('metric_name', 'Sleep Duration')
        .gte('measurement_date', format(startDate, 'yyyy-MM-dd'))
        .lt('measurement_date', format(endDate, 'yyyy-MM-dd'))
        .order('measurement_date', { ascending: true });

      if (durError) throw durError;

      // Convert hours to percentage (8 hours = 100%)
      return (durationData || []).map(item => ({
        date: item.measurement_date,
        value: Math.min((item.value / 8) * 100, 100)
      })) as SleepDataPoint[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
