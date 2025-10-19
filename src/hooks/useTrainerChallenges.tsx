import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTrainerChallenges(trainerId?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["trainer-challenges", trainerId],
    queryFn: async () => {
      if (!trainerId) return [];

      // Сначала получаем ID челленджей где пользователь назначен тренером
      const { data: trainerChallenges } = await supabase
        .from("challenge_trainers")
        .select("challenge_id")
        .eq("trainer_id", trainerId);

      const trainerChallengeIds = trainerChallenges?.map(ct => ct.challenge_id) || [];

      // Формируем запрос: челленджи где пользователь создатель ИЛИ назначен тренером
      let query = supabase.from("challenges").select("*");
      
      if (trainerChallengeIds.length > 0) {
        query = query.or(`created_by.eq.${trainerId},id.in.(${trainerChallengeIds.join(",")})`);
      } else {
        // Если нет назначенных челленджей, берем только созданные
        query = query.eq("created_by", trainerId);
      }

      const { data: allChallenges, error: challengesError } = await query;

      if (challengesError) throw challengesError;
      if (!allChallenges) return [];

      // Для каждого челленджа получаем участников
      const challengesWithParticipants = await Promise.all(
        allChallenges.map(async (challenge) => {
          const { data: participants } = await supabase
            .from("challenge_participants")
            .select(`
              user_id,
              joined_at,
              profiles (
                username,
                full_name,
                avatar_url
              )
            `)
            .eq("challenge_id", challenge.id);

          const { data: goals } = await supabase
            .from("goals")
            .select("*")
            .eq("challenge_id", challenge.id)
            .eq("is_personal", false);

          return {
            ...challenge,
            participants: participants || [],
            totalGoals: goals?.length || 0
          };
        })
      );

      return challengesWithParticipants;
    },
    enabled: !!trainerId,
    staleTime: 2 * 60 * 1000,
  });

  return {
    challenges: data || [],
    isLoading,
    error,
    refetch,
  };
}
