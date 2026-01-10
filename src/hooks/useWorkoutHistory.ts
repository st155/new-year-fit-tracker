import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getWorkoutTypeName } from '@/lib/workout-types';
import { mapTerraActivityType } from '@/lib/terra-activity-types';
import { translateWorkoutName } from '@/lib/workout-translations';
import i18n from '@/i18n';

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
  source: 'manual' | 'whoop' | 'withings' | 'terra' | 'apple_health' | 'garmin' | 'ultrahuman' | 'linked';
  sourceLabel: string;
  workoutType?: string; // raw workout type for icons
  strain?: number; // Whoop strain score
  // Linked workout data
  linkedWorkoutId?: string;
  linkedData?: {
    whoopCalories?: number;
    whoopDuration?: number;
    whoopStrain?: number;
    manualVolume?: number;
    manualSets?: number;
    manualExercises?: number;
  };
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
      const linkedManualIds = new Set<string>();

      // Fetch tracker workouts first to identify linked ones
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
          for (const workout of trackerWorkouts) {
            // Skip WHOOP workouts that are linked - we'll merge them with manual
            if (workout.source === 'whoop' && workout.linked_workout_id) {
              linkedManualIds.add(workout.linked_workout_id);
              continue;
            }

            // Priority 1: Use source_data.name (original name from provider)
            let workoutName = i18n.t('workouts:fallback.workout');
            const sourceData = workout.source_data as Record<string, any> | null;
            const originalName = sourceData?.name;
            
            if (originalName && typeof originalName === 'string') {
              workoutName = translateWorkoutName(originalName);
            } else if (workout.source?.toLowerCase() === 'whoop') {
              workoutName = getWorkoutTypeName(workout.workout_type);
            } else if (workout.workout_type !== null && workout.workout_type !== undefined) {
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
              workoutType: originalName || workout.workout_type,
              strain: sourceData?.score?.strain,
            });
          }
        }
      }

      // Fetch manual workouts
      if (filter === 'all' || filter === 'manual') {
        const { data: manualWorkouts, error: manualError } = await supabase
          .rpc('get_aggregated_workouts', { p_user_id: user.id });

        if (manualError) throw manualError;

        if (manualWorkouts) {
          for (const workout of manualWorkouts) {
            // Check if this manual workout has a linked WHOOP workout
            const isLinked = linkedManualIds.has(workout.id);
            
            let linkedData: WorkoutHistoryItem['linkedData'] = undefined;
            
            if (isLinked) {
              // Fetch linked WHOOP workout data
              const { data: linkedWhoop } = await supabase
                .from('workouts')
                .select('calories_burned, duration_minutes, source_data')
                .eq('linked_workout_id', workout.id)
                .eq('source', 'whoop')
                .single();
              
              if (linkedWhoop) {
                const whoopSourceData = linkedWhoop.source_data as Record<string, any> | null;
                linkedData = {
                  whoopCalories: linkedWhoop.calories_burned,
                  whoopDuration: linkedWhoop.duration_minutes,
                  whoopStrain: whoopSourceData?.score?.strain,
                  manualVolume: workout.total_volume ? Number(workout.total_volume) : undefined,
                  manualSets: workout.total_sets ? Number(workout.total_sets) : undefined,
                  manualExercises: workout.total_exercises ? Number(workout.total_exercises) : undefined,
                };
              }
            }

            allWorkouts.push({
              id: workout.id,
              date: new Date(workout.performed_at),
              name: workout.workout_name || i18n.t('workouts:fallback.workout'),
              duration: linkedData?.whoopDuration || workout.duration_minutes || 0,
              calories: linkedData?.whoopCalories || workout.estimated_calories || 0,
              volume: workout.total_volume ? Number(workout.total_volume) : undefined,
              sets: workout.total_sets ? Number(workout.total_sets) : undefined,
              exercises: workout.total_exercises ? Number(workout.total_exercises) : undefined,
              source: isLinked ? 'linked' : 'manual',
              sourceLabel: getSourceLabel(isLinked ? 'linked' : 'manual'),
              strain: linkedData?.whoopStrain,
              linkedWorkoutId: isLinked ? workout.id : undefined,
              linkedData,
            });
          }
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
  const labelKeys: Record<string, string> = {
    'manual': 'workouts:source.manual',
    'manual_trainer': 'workouts:source.manualTrainer',
    'whoop': 'workouts:source.whoop',
    'withings': 'workouts:source.withings',
    'terra': 'workouts:source.terra',
    'apple_health': 'workouts:source.appleHealth',
    'garmin': 'workouts:source.garmin',
    'ultrahuman': 'workouts:source.ultrahuman',
    'linked': 'workouts:source.linked',
  };
  const key = labelKeys[source.toLowerCase()];
  return key ? i18n.t(key) : source;
}
