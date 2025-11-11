import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WorkoutDetail {
  id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  workout_type?: string;
  duration_minutes?: number;
  distance_km?: number;
  calories_burned?: number;
  heart_rate_avg?: number;
  heart_rate_max?: number;
  source: string;
  source_data?: any;
}

export function useWorkoutDetail(workoutId: string) {
  return useQuery({
    queryKey: ['workout-detail', workoutId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .single();
      
      if (error) throw error;
      
      // Transform source_data for convenience
      const sourceData = data.source_data as any;
      const zoneData = sourceData?.score?.zone_durations;
      const weather = sourceData?.weather;
      
      return { 
        workout: data, 
        zoneData, 
        weather 
      };
    },
    enabled: !!workoutId
  });
}
