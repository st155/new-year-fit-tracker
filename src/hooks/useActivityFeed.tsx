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

      const { data: activities, error: activitiesError } = await supabase
        .from("activity_feed")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (activitiesError) throw activitiesError;
      if (!activities) return [];

      if (filter) {
        const filtered = activities.filter(a => a.source_table === filter);
        
        // Fetch profiles for filtered activities
        const userIds = [...new Set(filtered.map(a => a.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, full_name, avatar_url")
          .in("user_id", userIds);

        return filtered.map(activity => ({
          ...activity,
          profiles: profiles?.find(p => p.user_id === activity.user_id) || null
        }));
      }

      // Fetch profiles for all activities
      const userIds = [...new Set(activities.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, full_name, avatar_url")
        .in("user_id", userIds);

      return activities.map(activity => ({
        ...activity,
        profiles: profiles?.find(p => p.user_id === activity.user_id) || null
      }));
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
