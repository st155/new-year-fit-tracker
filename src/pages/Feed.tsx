import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ActivityCard } from "@/components/feed/ActivityCard";
import { RefreshCw, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProgressCache } from "@/hooks/useProgressCache";
import { cn } from "@/lib/utils";
import { NoActivityEmptyState } from "@/components/ui/enhanced-empty-state";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";

interface ActivityItem {
  id: string;
  user_id: string;
  action_type: string;
  action_text: string;
  created_at: string;
  source_id?: string;
  source_table?: string;
  metadata?: any;
  profiles: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function Feed() {
  const { toast } = useToast();

  const fetchActivities = useCallback(async () => {
    try {
      const { data: activitiesData, error } = await supabase
        .from('activity_feed')
        .select(`
          id,
          user_id,
          action_type,
          action_text,
          created_at,
          source_id,
          source_table,
          metadata,
          profiles:user_id (
            username,
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Filter to show only specific activity types
      const filteredActivities = (activitiesData || []).filter(activity => {
        const actionText = activity.action_text?.toLowerCase() || '';
        
        const isRecovery = actionText.includes('recovered') || actionText.includes('восстановился');
        const isWorkout = (actionText.includes('тренировку') || actionText.includes('workout') || actionText.includes('completed')) 
                          && !actionText.includes('качество');
        const isVO2Max = actionText.includes('vo2max');
        const isSleep = actionText.includes('slept') && actionText.match(/\d+:\d+/);
        const isStrain = actionText.includes('strain');
        const isSteps = actionText.includes('шаг') || (actionText.includes('steps') && !actionText.includes('made an activity'));
        
        return isRecovery || isWorkout || isVO2Max || isSleep || isStrain || isSteps;
      });

      // Deduplicate Sleep
      const sleepItems = filteredActivities.filter(a => (a.action_text?.toLowerCase().includes('slept') && /\d+:\d+/.test(a.action_text)));
      let dedupedActivities = filteredActivities;
      if (sleepItems.length > 1) {
        const getMeasureDate = (a: any) => new Date((a.metadata?.measurement_date) || a.created_at);
        const latestDate = new Date(Math.max(...sleepItems.map(a => new Date(getMeasureDate(a).toDateString()).getTime())));
        const latestDateStr = latestDate.toDateString();
        const latestForDate = sleepItems
          .filter(a => new Date(getMeasureDate(a)).toDateString() === latestDateStr)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const keepId = latestForDate[0]?.id;
        dedupedActivities = filteredActivities.filter(a => {
          const isSleep = a.action_text?.toLowerCase().includes('slept') && /\d+:\d+/.test(a.action_text);
          return !isSleep || a.id === keepId;
        });
      }

      // Deduplicate Workouts - group by base external_id (without suffixes)
      const workoutItems = dedupedActivities.filter(a => {
        const text = a.action_text?.toLowerCase() || '';
        return (text.includes('тренировку') || text.includes('workout') || text.includes('completed')) 
               && !text.includes('качество');
      });

      if (workoutItems.length > 1) {
        // Group workouts by base external_id (remove _calories, _hr, _max_hr suffixes)
        const workoutGroups = new Map<string, typeof workoutItems>();
        workoutItems.forEach(item => {
          const metadata = item.metadata as any;
          const externalId = (metadata?.external_id || '') as string;
          const baseId = externalId.replace(/_calories|_hr|_max_hr/g, '');
          const measurementDate = metadata?.measurement_date || new Date(item.created_at).toISOString().split('T')[0];
          const key = baseId || `${item.user_id}_${measurementDate}`;
          
          if (!workoutGroups.has(key)) {
            workoutGroups.set(key, []);
          }
          workoutGroups.get(key)!.push(item);
        });

        // For each group, keep only the most complete entry (with calories and strain)
        const workoutIdsToKeep = new Set<string>();
        workoutGroups.forEach(group => {
          if (group.length === 1) {
            workoutIdsToKeep.add(group[0].id);
          } else {
            // Prefer entries with both calories and strain info
            const withCaloriesAndStrain = group.find(a => 
              a.action_text?.toLowerCase().includes('kcal') && 
              a.action_text?.toLowerCase().includes('strain')
            );
            const withCalories = group.find(a => a.action_text?.toLowerCase().includes('kcal'));
            const withStrain = group.find(a => a.action_text?.toLowerCase().includes('strain'));
            
            // Sort by created_at and pick the latest
            const sorted = [...group].sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            
            const bestEntry = withCaloriesAndStrain || withCalories || withStrain || sorted[0];
            workoutIdsToKeep.add(bestEntry.id);
          }
        });

        // Filter out duplicate workouts
        dedupedActivities = dedupedActivities.filter(a => {
          const text = a.action_text?.toLowerCase() || '';
          const isWorkout = (text.includes('тренировку') || text.includes('workout') || text.includes('completed')) 
                           && !text.includes('качество');
          return !isWorkout || workoutIdsToKeep.has(a.id);
        });
      }

      return dedupedActivities;
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить ленту активности",
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  const { data: activities, loading, fromCache, refetch } = useProgressCache(
    'activity_feed',
    fetchActivities,
    []
  );

  const onActivityUpdate = () => {
    // Лайки и комментарии не влияют на activity_feed, не нужно перезагружать
  };

  if (loading && !fromCache) {
    return (
      <div className="min-h-screen pb-24 px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground tracking-wider">
            ACTIVITY FEED
          </h1>
          <button className="w-12 h-12 rounded-full border-2 border-muted flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
          </button>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-24 rounded-full animate-pulse"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="min-h-screen pb-24 px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground tracking-wider">
            ACTIVITY FEED
          </h1>
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 hover:scale-110"
            style={{
              borderColor: "#10B981",
              boxShadow: "0 0 15px rgba(16, 185, 129, 0.5)",
            }}
          >
            <RefreshCw
              className={cn("h-5 w-5 text-white", loading && "animate-spin")}
            />
          </button>
        </div>
        <NoActivityEmptyState onAddActivity={() => {}} />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={refetch}>
      <div className="min-h-screen pb-24 px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground tracking-wider">
            ACTIVITY FEED
          </h1>
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 hover:scale-110"
            style={{
              borderColor: "#10B981",
              boxShadow: "0 0 15px rgba(16, 185, 129, 0.5)",
            }}
          >
            <RefreshCw
              className={cn("h-5 w-5 text-white", loading && "animate-spin")}
            />
          </button>
        </div>

        {/* Activity List */}
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onActivityUpdate={onActivityUpdate}
              index={index}
            />
          ))}
        </div>
      </div>
    </PullToRefresh>
  );
}