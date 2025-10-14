import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useChallenges(userId?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["challenges", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select(`
          *,
          challenge_participants!inner(user_id)
        `)
        .eq("is_active", true)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data;
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
