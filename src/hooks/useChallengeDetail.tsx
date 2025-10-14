import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useChallengeDetail(challengeId?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["challenge-detail", challengeId],
    queryFn: async () => {
      if (!challengeId) return null;

      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", challengeId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!challengeId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    challenge: data,
    isLoading,
    error,
  };
}
