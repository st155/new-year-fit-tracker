import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getWorkoutTypeName } from '@/lib/workout-types';
import { mapTerraActivityType } from '@/lib/terra-activity-types';
import { translateWorkoutName } from '@/lib/workout-translations';

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
  workoutType?: string; // raw workout type for icons
  strain?: number; // Whoop strain score
}

export function useWorkoutHistory(filter: WorkoutSource = 'all') {
  const { data: workouts = [], isLoading, error } = useQuery({
    queryKey: ['workout-history', filter],
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    placeholderData: (previousData) => previousData, // Keep previous data while refetching
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
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .in('source', ['whoop', 'oura', 'garmin', 'withings', 'google', 'apple', 'manual_trainer'])
        .order('start_time', { ascending: false })
        .limit(50);

        if (trackerError) throw trackerError;

        if (trackerWorkouts) {
          trackerWorkouts.forEach((workout: any) => {
            // Priority 1: Use source_data.name (original name from provider)
            let workoutName = 'Тренировка';
            const originalName = workout.source_data?.name;
            
            if (originalName && typeof originalName === 'string') {
              // Translate English names to Russian
              workoutName = translateWorkoutName(originalName);
            } else if (workout.source?.toLowerCase() === 'whoop') {
              // Fallback for Whoop: use workout_type mapping
              workoutName = getWorkoutTypeName(workout.workout_type);
            } else if (workout.workout_type !== null && workout.workout_type !== undefined) {
              // Fallback for other providers: use Terra mapping
              workoutName = mapTerraActivityType(workout.workout_type, workout.source);
            }
            
            allWorkouts.push({
              id: workout.id,
              date: new Date(workout.start_time),
              name: workoutName,
              duration: workout.duration_minutes || 0,
              calories: workout.calories_burned || 0,
              distance: workout.distance_km,
              source: workout.source?.toLowerCase() as any,
              sourceLabel: getSourceLabel(workout.source),
              workoutType: originalName || workout.workout_type, // Keep original for icons
              strain: workout.source_data?.score?.strain,
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
    'manual_trainer': 'От тренера',
    'whoop': 'Whoop',
    'withings': 'Withings',
    'terra': 'Terra',
    'apple_health': 'Apple Health',
    'garmin': 'Garmin',
    'ultrahuman': 'Ultrahuman',
  };
  return labels[source.toLowerCase()] || source;
}
