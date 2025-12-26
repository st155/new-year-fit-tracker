import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay } from "date-fns";
import { getWorkoutCategory, WorkoutCategory } from "@/lib/workout-category";

export interface CompletedWorkoutSummary {
  id: string;
  workout_type: string;
  category: WorkoutCategory;
  start_time: string;
  duration_minutes?: number;
  source?: string;
  // Strength-specific
  total_volume?: number;
  total_exercises?: number;
  total_sets?: number;
  best_lift?: {
    exercise: string;
    weight: number;
    reps: number;
  };
  // Cardio-specific
  distance_km?: number;
  calories?: number;
  avg_heart_rate?: number;
}

export function useTodayCompletedWorkouts(userId?: string) {
  return useQuery({
    queryKey: ['today-completed-workouts', userId],
    queryFn: async (): Promise<CompletedWorkoutSummary[]> => {
      if (!userId) return [];

      const today = new Date();
      const todayStart = format(startOfDay(today), "yyyy-MM-dd'T'HH:mm:ss");
      const todayEnd = format(endOfDay(today), "yyyy-MM-dd'T'HH:mm:ss");

      // Fetch workouts from 'workouts' table (cardio from trackers)
      const { data: trackerWorkouts, error: trackerError } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', todayStart)
        .lte('start_time', todayEnd)
        .order('start_time', { ascending: false });

      if (trackerError) {
        console.error('Error fetching tracker workouts:', trackerError);
      }

      // Fetch manual strength workouts from workout_logs
      const { data: manualLogs, error: manualError } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)
        .order('created_at', { ascending: false });

      if (manualError) {
        console.error('Error fetching manual workout logs:', manualError);
      }

      const results: CompletedWorkoutSummary[] = [];

      // Process tracker workouts (usually cardio)
      if (trackerWorkouts) {
        for (const w of trackerWorkouts) {
          const category = getWorkoutCategory(w.workout_type);
          
          results.push({
            id: w.id,
            workout_type: w.workout_type || 'Тренировка',
            category,
            start_time: w.start_time,
            duration_minutes: w.duration_minutes,
            source: w.source,
            distance_km: w.distance_km,
            calories: w.calories_burned,
            avg_heart_rate: w.heart_rate_avg,
          });
        }
      }

      // Process manual strength logs - group by session
      if (manualLogs && manualLogs.length > 0) {
        // Group logs by workout session (by workout_name or hour)
        const sessions = new Map<string, typeof manualLogs>();
        
        for (const log of manualLogs) {
          const sessionTime = new Date(log.created_at);
          const sessionKey = log.workout_name || format(sessionTime, 'yyyy-MM-dd-HH');
          
          if (!sessions.has(sessionKey)) {
            sessions.set(sessionKey, []);
          }
          sessions.get(sessionKey)!.push(log);
        }

        for (const [sessionKey, logs] of sessions) {
          // Calculate summary
          let totalVolume = 0;
          let bestLift = { exercise: '', weight: 0, reps: 0 };
          const exerciseNames = new Set<string>();

          for (const log of logs) {
            const weight = log.actual_weight || 0;
            const reps = log.actual_reps || 0;
            
            totalVolume += weight * reps;
            exerciseNames.add(log.exercise_name);

            if (weight > bestLift.weight) {
              bestLift = {
                exercise: log.exercise_name,
                weight,
                reps
              };
            }
          }

          const firstLog = logs[logs.length - 1];
          const lastLog = logs[0];
          const startTime = new Date(firstLog.created_at);
          const endTime = new Date(lastLog.created_at);
          const durationMs = endTime.getTime() - startTime.getTime();
          const durationMinutes = Math.max(5, Math.round(durationMs / 60000)); // Min 5 min

          results.push({
            id: `manual-${sessionKey}`,
            workout_type: logs[0].workout_name || 'Силовая тренировка',
            category: 'strength',
            start_time: firstLog.created_at,
            duration_minutes: durationMinutes,
            source: 'manual',
            total_volume: totalVolume,
            total_exercises: exerciseNames.size,
            total_sets: logs.length,
            best_lift: bestLift.weight > 0 ? bestLift : undefined,
          });
        }
      }

      // Sort by start_time descending
      results.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

      return results;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
