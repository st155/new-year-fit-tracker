import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTrainerChallenges(trainerId?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["trainer-challenges", trainerId],
    queryFn: async () => {
      if (!trainerId) return [];

      // Получаем челленджи где пользователь является тренером
      const { data: trainerChallenges, error: challengesError } = await supabase
        .from("challenge_trainers")
        .select(`
          challenge_id,
          role,
          challenges (
            id,
            title,
            description,
            start_date,
            end_date,
            is_active,
            created_at
          )
        `)
        .eq("trainer_id", trainerId);

      if (challengesError) throw challengesError;

      // Получаем челленджи созданные пользователем
      const { data: ownedChallenges, error: ownedError } = await supabase
        .from("challenges")
        .select("*")
        .eq("created_by", trainerId);

      if (ownedError) throw ownedError;

      // Объединяем результаты
      const allChallenges = [
        ...trainerChallenges.map(tc => ({ ...tc.challenges, role: tc.role })),
        ...ownedChallenges.filter(
          oc => !trainerChallenges.some(tc => tc.challenge_id === oc.id)
        ).map(oc => ({ ...oc, role: 'owner' }))
      ];

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
