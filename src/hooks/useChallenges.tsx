import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useChallenges(userId?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["challenges", userId],
    queryFn: async () => {
      if (!userId) {
        console.log('🚫 [useChallenges] No userId provided');
        return [];
      }

      console.log('🔍 [useChallenges] Fetching challenges for user:', userId);

      // Simplified query with JOIN to get participants in one request
      const { data: challenges, error: challengesError } = await supabase
        .from("challenges")
        .select(`
          *,
          challenge_participants (
            user_id
          )
        `)
        .eq("is_active", true)
        .order("start_date", { ascending: false });

      if (challengesError) {
        console.error('❌ [useChallenges] Error fetching challenges:', challengesError);
        throw challengesError;
      }

      console.log('✅ [useChallenges] Query successful, challenges found:', challenges?.length || 0);
      
      if (!challenges || challenges.length === 0) {
        console.log('⚠️ [useChallenges] No active challenges found');
        return [];
      }

      // Map challenges with participation status
      return challenges.map(challenge => ({
        ...challenge,
        isParticipant: challenge.challenge_participants?.some(
          p => p.user_id === userId
        ) || false
      }));
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds for faster updates
  });

  console.log('🏆 [useChallenges] Hook result:', {
    challengesCount: data?.length || 0,
    isLoading,
    error: error?.message,
    userId
  });

  return {
    challenges: data,
    isLoading,
    error,
    refetch,
  };
}
