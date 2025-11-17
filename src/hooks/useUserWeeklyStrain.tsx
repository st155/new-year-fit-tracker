import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

interface StrainDataPoint {
  date: string;
  value: number;
}

export function useUserWeeklyStrain(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-weekly-strain', userId],
    queryFn: async () => {
      if (!userId) return [];

      const endDate = new Date();
      const startDate = subDays(endDate, 7);

      // Day Strain (WHOOP only)
      const { data: dayStrainData, error: dayError } = await supabase
        .from('unified_metrics')
        .select('measurement_date, value')
        .eq('user_id', userId)
        .eq('metric_name', 'Day Strain')
        .ilike('source', 'WHOOP')
        .gte('measurement_date', format(startDate, 'yyyy-MM-dd'))
        .lt('measurement_date', format(endDate, 'yyyy-MM-dd'))
        .order('measurement_date', { ascending: true });

      if (!dayError && dayStrainData && dayStrainData.length > 0) {
        return dayStrainData.map(item => ({
          date: item.measurement_date,
          value: item.value
        })) as StrainDataPoint[];
      }

      // Fallback to Workout Strain
      const { data: workoutStrainData, error: workoutError } = await supabase
        .from('unified_metrics')
        .select('measurement_date, value')
        .eq('user_id', userId)
        .eq('metric_name', 'Workout Strain')
        .gte('measurement_date', format(startDate, 'yyyy-MM-dd'))
        .lt('measurement_date', format(endDate, 'yyyy-MM-dd'))
        .order('measurement_date', { ascending: true });

      if (workoutError) return [];

      return (workoutStrainData || []).map(item => ({
        date: item.measurement_date,
        value: item.value
      })) as StrainDataPoint[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
