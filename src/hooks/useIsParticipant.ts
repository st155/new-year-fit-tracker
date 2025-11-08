import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIsParticipant(challengeId?: string, userId?: string) {
  return useQuery({
    queryKey: ["is-participant", challengeId, userId],
    queryFn: async () => {
      if (!challengeId || !userId) return false;
      
      const { data, error } = await supabase
        .from("challenge_participants")
        .select("user_id")
        .eq("challenge_id", challengeId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking participation:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!challengeId && !!userId,
    staleTime: 0, // Always fetch fresh data
  });
}
