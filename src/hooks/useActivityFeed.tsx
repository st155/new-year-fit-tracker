import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const PAGE_SIZE = 20;

export function useActivityFeed(userId?: string, filter?: string | null) {
  const [page, setPage] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["activity-feed", userId, filter, page],
    queryFn: async () => {
      if (!userId) return [];

      let query = supabase
        .from("activity_feed")
        .select(`
          *,
          profiles:user_id(username, full_name, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filter) {
        query = query.eq("source_table", filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  return {
    activities: data,
    isLoading,
    error,
    hasMore: data && data.length === PAGE_SIZE,
    loadMore: () => setPage(p => p + 1),
  };
}
