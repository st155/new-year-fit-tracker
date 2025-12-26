import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subHours, addHours } from "date-fns";

export interface WorkoutLogEntry {
  id: string;
  exercise_name: string;
  actual_weight: number;
  actual_reps: number;
  set_number: number;
  performed_at: string;
  notes: string | null;
  superset_group: string | null;
  exercise_category: string | null;
}

export interface GroupedExercise {
  exerciseName: string;
  category: string | null;
  sets: {
    setNumber: number;
    weight: number;
    reps: number;
  }[];
  totalVolume: number;
  isSuperset: boolean;
  supersetGroup: string | null;
}

function groupByExercise(logs: WorkoutLogEntry[]): GroupedExercise[] {
  const grouped: Record<string, GroupedExercise> = {};

  logs.forEach((log) => {
    const key = log.exercise_name;
    if (!grouped[key]) {
      grouped[key] = {
        exerciseName: log.exercise_name,
        category: log.exercise_category,
        sets: [],
        totalVolume: 0,
        isSuperset: !!log.superset_group,
        supersetGroup: log.superset_group,
      };
    }

    const setVolume = log.actual_weight * log.actual_reps;
    grouped[key].sets.push({
      setNumber: log.set_number,
      weight: log.actual_weight,
      reps: log.actual_reps,
    });
    grouped[key].totalVolume += setVolume;
  });

  // Sort sets by set number
  Object.values(grouped).forEach((exercise) => {
    exercise.sets.sort((a, b) => a.setNumber - b.setNumber);
  });

  return Object.values(grouped);
}

export function useStrengthWorkoutLogs(userId: string, workoutStartTime: string) {
  return useQuery({
    queryKey: ['strength-workout-logs', userId, workoutStartTime],
    queryFn: async () => {
      const workoutDate = new Date(workoutStartTime);
      const startRange = subHours(workoutDate, 2);
      const endRange = addHours(workoutDate, 4);

      const { data, error } = await supabase
        .from('workout_logs')
        .select('id, exercise_name, actual_weight, actual_reps, set_number, performed_at, notes, superset_group, exercise_category')
        .eq('user_id', userId)
        .gte('performed_at', startRange.toISOString())
        .lte('performed_at', endRange.toISOString())
        .order('performed_at', { ascending: true })
        .order('set_number', { ascending: true });

      if (error) throw error;

      const exercises = groupByExercise(data || []);
      
      // Calculate summary stats
      const totalVolume = exercises.reduce((sum, ex) => sum + ex.totalVolume, 0);
      const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
      const totalExercises = exercises.length;
      
      let bestLift = { exercise: '', weight: 0, reps: 0 };
      exercises.forEach(ex => {
        ex.sets.forEach(set => {
          if (set.weight > bestLift.weight) {
            bestLift = { 
              exercise: ex.exerciseName, 
              weight: set.weight, 
              reps: set.reps 
            };
          }
        });
      });

      return {
        exercises,
        summary: {
          totalVolume,
          totalSets,
          totalExercises,
          bestLift: bestLift.weight > 0 ? bestLift : null,
        },
      };
    },
    enabled: !!userId && !!workoutStartTime,
  });
}
