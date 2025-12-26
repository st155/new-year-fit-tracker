import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

interface RecoveryDataPoint {
  date: string;
  value: number;
}

export function useUserWeeklyRecovery(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-weekly-recovery', userId],
    queryFn: async () => {
      if (!userId) return [];

      const endDate = new Date();
      const startDate = subDays(endDate, 7);
      const dateRange = {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
      };

      // Priority 1: Recovery Score (any source)
      const { data: recoveryData } = await supabase
        .from('unified_metrics')
        .select('measurement_date, value, priority')
        .eq('user_id', userId)
        .eq('metric_name', 'Recovery Score')
        .gte('measurement_date', dateRange.start)
        .lt('measurement_date', dateRange.end)
        .order('measurement_date', { ascending: true })
        .order('priority', { ascending: true });

      if (recoveryData && recoveryData.length > 0) {
        // Deduplicate by date (take first entry for each date)
        const deduplicatedData = recoveryData.reduce((acc, item) => {
          const existingEntry = acc.find(e => e.date === item.measurement_date);
          if (!existingEntry) {
            acc.push({
              date: item.measurement_date,
              value: item.value
            });
          }
          return acc;
        }, [] as RecoveryDataPoint[]);

        return deduplicatedData;
      }

      // Priority 2: HRV RMSSD → convert to recovery % (higher HRV = better recovery)
      const { data: hrvData } = await supabase
        .from('unified_metrics')
        .select('measurement_date, value')
        .eq('user_id', userId)
        .eq('metric_name', 'HRV RMSSD')
        .gte('measurement_date', dateRange.start)
        .lt('measurement_date', dateRange.end)
        .order('measurement_date', { ascending: true });

      if (hrvData && hrvData.length > 0) {
        return hrvData.map(item => ({
          date: item.measurement_date,
          value: Math.min(100, Math.max(0, (item.value / 80) * 100)) // 80ms HRV = 100%
        })) as RecoveryDataPoint[];
      }

      // Priority 3: Resting Heart Rate → invert to recovery % (lower RHR = better)
      const { data: rhrData } = await supabase
        .from('unified_metrics')
        .select('measurement_date, value')
        .eq('user_id', userId)
        .eq('metric_name', 'Resting Heart Rate')
        .gte('measurement_date', dateRange.start)
        .lt('measurement_date', dateRange.end)
        .order('measurement_date', { ascending: true });

      if (rhrData && rhrData.length > 0) {
        return rhrData.map(item => ({
          date: item.measurement_date,
          value: Math.max(0, Math.min(100, 100 - ((item.value - 40) * 2.5))) // 40 bpm = 100%, 80 bpm = 0%
        })) as RecoveryDataPoint[];
      }

      return [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
