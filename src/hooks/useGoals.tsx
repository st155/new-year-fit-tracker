import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useGoals(userId?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["goals", userId],
    queryFn: async () => {
      if (!userId) return { personal: [], challenge: [] };

      try {
        const { data: goals, error: goalsError } = await supabase
          .from("goals")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (goalsError) throw goalsError;

      // Fetch measurements separately
      const { data: measurements } = await supabase
        .from("measurements")
        .select("goal_id, value, measurement_date")
        .eq("user_id", userId)
        .order("measurement_date", { ascending: false });

      // Attach measurements to goals
      const goalsWithMeasurements = goals.map(goal => ({
        ...goal,
        measurements: measurements?.filter(m => m.goal_id === goal.id) || []
      }));

        const personal = goalsWithMeasurements.filter(g => g.is_personal);
        const challenge = goalsWithMeasurements.filter(g => !g.is_personal);

        return { personal, challenge };
      } catch (error) {
        console.error('❌ Error fetching goals:', error);
        toast.error('Ошибка загрузки целей');
        return { personal: [], challenge: [] };
      }
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds for faster updates
  });

  return {
    personalGoals: data?.personal,
    challengeGoals: data?.challenge,
    isLoading,
    error,
  };
}
