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

      const { data, error } = await supabase
        .from('unified_metrics')
        .select('measurement_date, value')
        .eq('user_id', userId)
        .eq('metric_name', 'Sleep Performance')
        .gte('measurement_date', format(startDate, 'yyyy-MM-dd'))
        .lt('measurement_date', format(endDate, 'yyyy-MM-dd'))
        .order('measurement_date', { ascending: true });

      if (error) throw error;

      return (data || []).map(item => ({
        date: item.measurement_date,
        value: item.value
      })) as SleepDataPoint[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
