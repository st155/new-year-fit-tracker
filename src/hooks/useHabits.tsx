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

      const { data: stats } = await supabase
        .from("habit_stats")
        .select("*")
        .eq("user_id", userId);

      const { data: completions } = await supabase
        .from("habit_completions")
        .select("habit_id, completed_at")
        .eq("user_id", userId)
        .gte("completed_at", today);

      return habits.map(habit => {
        const habitStats = stats?.find(s => s.habit_id === habit.id);
        const completedToday = completions?.some(
          c => c.habit_id === habit.id && c.completed_at?.startsWith(today)
        );

        return {
          ...habit,
          completed_today: completedToday || false,
          stats: habitStats || null,
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
