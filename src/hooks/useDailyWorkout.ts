import { useQuery } from "@tanstack/react-query";
import { aiApi } from "@/lib/api/client";
import { format } from "date-fns";

export interface AdjustedExercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  rir?: number;
  rpe?: number;
  rest_seconds?: number;
  adjustment_reason?: string;
  was_modified: boolean;
}

export interface DailyWorkoutResponse {
  success: boolean;
  is_rest_day: boolean;
  workout_name?: string;
  day_of_week?: number;
  week_number?: number;
  plan_name?: string;
  total_weeks?: number;
  original_exercises?: any[];
  adjusted_exercises?: AdjustedExercise[];
  ai_rationale?: string;
  readiness: {
    recovery_score?: number;
    sleep_score?: number;
    activity_score?: number;
    total_score?: number;
  };
  performance_context?: any[];
  assigned_plan_id?: string;
}

export function useDailyWorkout(userId?: string, date?: string) {
  return useQuery<DailyWorkoutResponse>({
    queryKey: ['daily-ai-workout', userId, date || format(new Date(), 'yyyy-MM-dd')],
    staleTime: 2 * 60 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await aiApi.getDailyWorkout(userId!, date);
      if (error) throw error;
      return data as DailyWorkoutResponse;
    },
    enabled: !!userId
  });
}
