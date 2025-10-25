import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const PAGE_SIZE = 20;

export function useActivityFeed(userId?: string, filterType?: string | null) {
  const [page, setPage] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["activity-feed", userId, filterType, page],
    queryFn: async () => {
      if (!userId) return [];

      const { data: activities, error: activitiesError } = await supabase
        .from("activity_feed")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (activitiesError) throw activitiesError;
      if (!activities) return [];

      if (filterType) {
        // Step 1: filter by type with fallbacks when subtype is missing
        let filtered = activities.filter(a => {
          if (filterType === 'habit') {
            return a.activity_subtype?.includes('habit') || a.action_type === 'habit';
          }
          if (filterType === 'sleep_recovery') {
            return a.activity_subtype === 'sleep_recovery' ||
                   a.action_text?.toLowerCase().includes('sleep') || 
                   a.action_text?.toLowerCase().includes('recover');
          }
          if (filterType === 'workout') {
            return a.activity_subtype === 'workout' ||
                   a.action_type === 'workout' || 
                   a.action_text?.toLowerCase().includes('workout');
          }
          if (filterType === 'daily_steps') {
            return a.activity_subtype === 'daily_steps' ||
                   a.action_text?.toLowerCase().includes('steps');
          }
          return a.activity_subtype === filterType;
        });
        
        // Special handling for workouts - load from workouts table
        if (filterType === 'workout') {
          const { data: workouts, error: workoutsError } = await supabase
            .from('workouts')
            .select('*')
            .order('start_time', { ascending: false })
            .limit(PAGE_SIZE * 2);
          
          if (!workoutsError && workouts) {
            // Transform workouts into activity_feed format
            const workoutActivities = workouts.map(w => ({
              id: `workout_${w.id}`,
              user_id: w.user_id,
              action_type: 'workout',
              action_text: `${w.workout_type || 'Workout'} • ${w.duration_minutes || 0} min`,
              created_at: w.created_at,
              updated_at: w.updated_at || w.created_at,
              activity_subtype: 'workout',
              is_milestone: false,
              milestone_type: null,
              metadata: {
                workout_id: w.id,
                workout_type: w.workout_type,
                duration_minutes: w.duration_minutes,
                calories_burned: w.calories_burned,
                heart_rate_avg: w.heart_rate_avg,
                heart_rate_max: w.heart_rate_max,
                distance_km: w.distance_km,
                source: w.source,
              },
              aggregated_data: {
                calories: w.calories_burned,
                duration: w.duration_minutes,
                hr_avg: w.heart_rate_avg,
                hr_max: w.heart_rate_max,
                distance: w.distance_km,
                workout_type: w.workout_type,
              },
              source_table: 'workouts',
              source_id: w.id,
              measurement_date: w.start_time?.split('T')[0] || null,
            }));
            
            // Merge with existing activities and sort by created_at
            filtered = [...workoutActivities, ...filtered]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, PAGE_SIZE);
          }
        }
        
        // Step 2: de-duplicate aggregated daily entries (sleep, steps)
        if (filterType === 'sleep_recovery' || filterType === 'daily_steps') {
          const map = new Map<string, any>();
          for (const a of filtered) {
            const dateKey =
              a.measurement_date ??
              (a.created_at ? new Date(a.created_at).toISOString().slice(0, 10) : '');
            const key = `${a.user_id}|${dateKey}|${filterType}`;
            const prev = map.get(key);
            if (!prev || new Date(a.created_at) > new Date(prev.created_at)) {
              map.set(key, a);
            }
          }
          filtered = Array.from(map.values()).sort(
            (x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
          );
        }
        
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
