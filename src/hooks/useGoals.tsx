import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useGoals(userId?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["goals", userId],
    queryFn: async () => {
      if (!userId) return { personal: [], challenge: [] };

      const { data, error } = await supabase
        .from("goals")
        .select(`
          *,
          measurements(id, value, measurement_date)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const personal = data.filter(g => g.is_personal);
      const challenge = data.filter(g => !g.is_personal);

      return { personal, challenge };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  return {
    personalGoals: data?.personal,
    challengeGoals: data?.challenge,
    isLoading,
    error,
  };
}
