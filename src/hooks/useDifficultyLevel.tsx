import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDifficultyLevel(challengeId?: string, userId?: string) {
  return useQuery({
    queryKey: ["difficulty-level", challengeId, userId],
    queryFn: async () => {
      if (!challengeId || !userId) return 0;

      const { data, error } = await supabase
        .from("challenge_participants")
        .select("difficulty_level")
        .eq("challenge_id", challengeId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data?.difficulty_level || 0;
    },
    enabled: !!challengeId && !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
