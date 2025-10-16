import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useInBodyAnalyses(userId?: string) {
  return useQuery({
    queryKey: ["inbody-analyses", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("inbody_analyses")
        .select("*")
        .eq("user_id", userId)
        .order("test_date", { ascending: false });

      if (error) throw error;

      return data || [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}
