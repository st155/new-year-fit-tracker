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

      // Recovery Score (WHOOP only)
      const { data, error } = await supabase
        .from('unified_metrics')
        .select('measurement_date, value, priority')
        .eq('user_id', userId)
        .eq('metric_name', 'Recovery Score')
        .ilike('source', 'WHOOP')
        .gte('measurement_date', format(startDate, 'yyyy-MM-dd'))
        .lt('measurement_date', format(endDate, 'yyyy-MM-dd'))
        .order('measurement_date', { ascending: true })
        .order('priority', { ascending: true });

      if (error) return [];

      // Deduplicate by date (take first entry for each date)
      const deduplicatedData = (data || []).reduce((acc, item) => {
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
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
