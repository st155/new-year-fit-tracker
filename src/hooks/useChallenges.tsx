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

      const { data: challenges, error: challengesError } = await supabase
        .from("challenges")
        .select("*")
        .eq("is_active", true)
        .order("start_date", { ascending: false });

      if (challengesError) {
        console.error('❌ [useChallenges] Error fetching challenges:', challengesError);
        console.log('🔄 [useChallenges] Attempting fallback via challenge_participants...');
        
        // Fallback: get challenges where user is a participant
        const { data: participations, error: participationsError } = await supabase
          .from("challenge_participants")
          .select("challenge_id, challenges(*)")
          .eq("user_id", userId);

        if (participationsError) {
          console.error('❌ [useChallenges] Fallback query failed:', participationsError);
          throw participationsError;
        }

        console.log('✅ [useChallenges] Fallback successful, participations found:', participations?.length || 0);
        
        // Extract challenges from participations
        const fallbackChallenges = participations
          ?.map(p => p.challenges)
          .filter(Boolean) || [];

        if (fallbackChallenges.length === 0) return [];

        // Get all participants for these challenges
        const challengeIds = fallbackChallenges.map(c => c.id);
        const { data: participants } = await supabase
          .from("challenge_participants")
          .select("challenge_id, user_id")
          .in("challenge_id", challengeIds);

        return fallbackChallenges.map(challenge => ({
          ...challenge,
          challenge_participants: participants?.filter(p => p.challenge_id === challenge.id) || [],
          isParticipant: true // User is participant since we got data from their participations
        }));
      }

      console.log('✅ [useChallenges] Query successful, challenges found:', challenges?.length || 0);
      
      if (!challenges || challenges.length === 0) {
        console.log('⚠️ [useChallenges] No challenges found');
        return [];
      }

      // Get all participants
      console.log('🔍 [useChallenges] Fetching participants...');
      const { data: participants, error: participantsError } = await supabase
        .from("challenge_participants")
        .select("challenge_id, user_id");

      if (participantsError) {
        console.error('❌ [useChallenges] Error fetching participants:', participantsError);
      } else {
        console.log('✅ [useChallenges] Participants found:', participants?.length || 0);
      }

      return challenges.map(challenge => ({
        ...challenge,
        challenge_participants: participants?.filter(p => p.challenge_id === challenge.id) || [],
        isParticipant: participants?.some(p => p.challenge_id === challenge.id && p.user_id === userId) || false
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
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
