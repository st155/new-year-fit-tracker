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
      const dateRange = {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
      };

      // Priority 1: Day Strain (any source)
      const { data: dayStrainData } = await supabase
        .from('unified_metrics')
        .select('measurement_date, value')
        .eq('user_id', userId)
        .eq('metric_name', 'Day Strain')
        .gte('measurement_date', dateRange.start)
        .lt('measurement_date', dateRange.end)
        .order('measurement_date', { ascending: true });

      if (dayStrainData && dayStrainData.length > 0) {
        return dayStrainData.map(item => ({
          date: item.measurement_date,
          value: item.value
        })) as StrainDataPoint[];
      }

      // Priority 2: Workout Strain
      const { data: workoutStrainData } = await supabase
        .from('unified_metrics')
        .select('measurement_date, value')
        .eq('user_id', userId)
        .eq('metric_name', 'Workout Strain')
        .gte('measurement_date', dateRange.start)
        .lt('measurement_date', dateRange.end)
        .order('measurement_date', { ascending: true });

      if (workoutStrainData && workoutStrainData.length > 0) {
        return workoutStrainData.map(item => ({
          date: item.measurement_date,
          value: item.value
        })) as StrainDataPoint[];
      }

      // Priority 3: Activity Score (Oura, Ultrahuman) → normalized to 0-21 strain scale
      const { data: activityScoreData } = await supabase
        .from('unified_metrics')
        .select('measurement_date, value')
        .eq('user_id', userId)
        .eq('metric_name', 'Activity Score')
        .gte('measurement_date', dateRange.start)
        .lt('measurement_date', dateRange.end)
        .order('measurement_date', { ascending: true });

      if (activityScoreData && activityScoreData.length > 0) {
        return activityScoreData.map(item => ({
          date: item.measurement_date,
          // Normalize 0-100 to 0-21 scale (like WHOOP strain)
          value: Math.min(21, (item.value / 100) * 21)
        })) as StrainDataPoint[];
      }

      // Priority 4: Active Calories (Garmin) → normalized to 0-21 strain scale
      const { data: caloriesData } = await supabase
        .from('unified_metrics')
        .select('measurement_date, value')
        .eq('user_id', userId)
        .eq('metric_name', 'Active Calories')
        .gte('measurement_date', dateRange.start)
        .lt('measurement_date', dateRange.end)
        .order('measurement_date', { ascending: true });

      if (caloriesData && caloriesData.length > 0) {
        return caloriesData.map(item => ({
          date: item.measurement_date,
          value: Math.min(21, item.value / 150) // 2100 kcal ≈ 14 strain, 3150+ = 21
        })) as StrainDataPoint[];
      }

      // Priority 5: Workout Time (minutes) → normalized to 0-21 strain scale
      const { data: workoutTimeData } = await supabase
        .from('unified_metrics')
        .select('measurement_date, value')
        .eq('user_id', userId)
        .eq('metric_name', 'Workout Time')
        .gte('measurement_date', dateRange.start)
        .lt('measurement_date', dateRange.end)
        .order('measurement_date', { ascending: true });

      if (workoutTimeData && workoutTimeData.length > 0) {
        return workoutTimeData.map(item => ({
          date: item.measurement_date,
          value: Math.min(21, item.value / 5) // 60 min = 12 strain, 105 min = 21
        })) as StrainDataPoint[];
      }

      return [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
