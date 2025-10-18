import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useHabits(userId?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["habits", userId],
    queryFn: async () => {
      if (!userId) return [];

      const today = new Date().toISOString().split('T')[0];

      const { data: habits, error: habitsError } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (habitsError) throw habitsError;
      if (!habits || habits.length === 0) return [];

      const { data: stats } = await supabase
        .from("habit_stats")
        .select("*")
        .eq("user_id", userId);

      const { data: completions } = await supabase
        .from("habit_completions")
        .select("habit_id, completed_at")
        .eq("user_id", userId)
        .gte("completed_at", today);

      // Get measurements for numeric and daily habits
      const { data: measurements } = await supabase
        .from("habit_measurements")
        .select("*")
        .eq("user_id", userId);

      // Get attempts for duration counters
      const { data: attempts } = await supabase
        .from("habit_attempts")
        .select("*")
        .eq("user_id", userId);

      return habits.map(habit => {
        const habitStats = stats?.find(s => s.habit_id === habit.id);
        const completedToday = completions?.some(
          c => c.habit_id === habit.id && c.completed_at?.startsWith(today)
        );

        // Add custom data based on habit type
        let customData = {};
        
        if (habit.habit_type === "numeric_counter" || habit.habit_type === "daily_measurement") {
          const habitMeasurements = measurements?.filter(m => m.habit_id === habit.id) || [];
          customData = {
            measurements: habitMeasurements,
            current_value: habitMeasurements.reduce((sum, m) => sum + m.value, 0),
          };
        }

        if (habit.habit_type === "duration_counter") {
          const habitAttempts = attempts?.filter(a => a.habit_id === habit.id) || [];
          const currentAttempt = habitAttempts.find(a => !a.end_date);
          customData = {
            attempts: habitAttempts,
            current_attempt: currentAttempt,
          };
        }

        return {
          ...habit,
          completed_today: completedToday || false,
          stats: habitStats || null,
          ...customData,
        };
      });
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  return {
    habits: data,
    isLoading,
    error,
    refetch,
  };
}
