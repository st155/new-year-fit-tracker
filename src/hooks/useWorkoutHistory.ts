import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WorkoutSource = 'manual' | 'tracker' | 'all';

export interface WorkoutHistoryItem {
  id: string;
  date: Date;
  name: string;
  duration: number; // in minutes
  calories: number;
  volume?: number; // kg for manual workouts
  distance?: number; // km for tracker workouts
  sets?: number;
  exercises?: number;
  source: 'manual' | 'whoop' | 'withings' | 'terra' | 'apple_health' | 'garmin' | 'ultrahuman';
  sourceLabel: string;
}

export function useWorkoutHistory(filter: WorkoutSource = 'all') {
  const { data: workouts = [], isLoading, error } = useQuery({
    queryKey: ['workout-history', filter],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const allWorkouts: WorkoutHistoryItem[] = [];

      // Fetch manual workouts if needed
      if (filter === 'all' || filter === 'manual') {
        const { data: manualWorkouts, error: manualError } = await supabase
          .rpc('get_aggregated_workouts', { p_user_id: user.id });

        if (manualError) throw manualError;

        if (manualWorkouts) {
          manualWorkouts.forEach((workout: any) => {
            allWorkouts.push({
              id: workout.id,
              date: new Date(workout.performed_at),
              name: workout.workout_name || 'Тренировка',
              duration: workout.duration_minutes || 0,
              calories: workout.estimated_calories || 0,
              volume: workout.total_volume ? Number(workout.total_volume) : undefined,
              sets: workout.total_sets ? Number(workout.total_sets) : undefined,
              exercises: workout.total_exercises ? Number(workout.total_exercises) : undefined,
              source: 'manual',
              sourceLabel: 'Вручную',
            });
          });
        }
      }

      // Fetch tracker workouts if needed
      if (filter === 'all' || filter === 'tracker') {
        const { data: trackerWorkouts, error: trackerError } = await supabase
          .from('unified_metrics')
          .select('*')
          .eq('user_id', user.id)
          .eq('metric_category', 'workout')
          .order('measurement_date', { ascending: false })
          .limit(50);

        if (trackerError) throw trackerError;

        if (trackerWorkouts) {
          trackerWorkouts.forEach((workout: any) => {
            const sourceData = workout.source_data || {};
            allWorkouts.push({
              id: workout.id,
              date: new Date(workout.measurement_date),
              name: workout.metric_name || 'Активность',
              duration: sourceData.duration_minutes || 0,
              calories: Math.round(workout.value) || 0,
              distance: sourceData.distance_km,
              source: workout.source.toLowerCase() as any,
              sourceLabel: getSourceLabel(workout.source),
            });
          });
        }
      }

      // Sort by date descending
      allWorkouts.sort((a, b) => b.date.getTime() - a.date.getTime());

      return allWorkouts;
    },
  });

  return { workouts, isLoading, error };
}

function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    'manual': 'Вручную',
    'whoop': 'Whoop',
    'withings': 'Withings',
    'terra': 'Terra',
    'apple_health': 'Apple Health',
    'garmin': 'Garmin',
    'ultrahuman': 'Ultrahuman',
  };
  return labels[source.toLowerCase()] || source;
}
