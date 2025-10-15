import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useChallenges(userId?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["challenges", userId],
    queryFn: async () => {
      const { data: challenges, error: challengesError } = await supabase
        .from("challenges")
        .select("*")
        .eq("is_active", true)
        .order("start_date", { ascending: false });

      if (challengesError) throw challengesError;
      if (!challenges) return [];

      // Get all participants
      const { data: participants } = await supabase
        .from("challenge_participants")
        .select("challenge_id, user_id");

      return challenges.map(challenge => ({
        ...challenge,
        challenge_participants: participants?.filter(p => p.challenge_id === challenge.id) || [],
        isParticipant: participants?.some(p => p.challenge_id === challenge.id && p.user_id === userId) || false
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    challenges: data,
    isLoading,
    error,
  };
}
