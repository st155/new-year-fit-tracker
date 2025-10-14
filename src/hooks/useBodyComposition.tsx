import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBodyComposition(userId?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["body-composition", userId],
    queryFn: async () => {
      if (!userId) return { current: null, history: [] };

      const { data, error } = await supabase
        .from("body_composition")
        .select("*")
        .eq("user_id", userId)
        .order("measurement_date", { ascending: false });

      if (error) throw error;

      return {
        current: data[0] || null,
        history: data,
      };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  return {
    current: data?.current,
    history: data?.history || [],
    isLoading,
    error,
  };
}
