import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ActivityCard } from "@/components/feed/ActivityCard";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchActivities = async () => {
    try {
      setLoading(true);

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
        
        // Include these types:
        // 1. Recovery (восстановился/recovered)
        // 2. Workouts (тренировку/workout/completed)
        // 3. VO2Max
        // 4. Sleep (slept/спал) - but with HH:MM format only
        // 5. Strain
        // 6. Daily Steps (шаги/steps)
        
        const isRecovery = actionText.includes('recovered') || actionText.includes('восстановился');
        const isWorkout = (actionText.includes('тренировку') || actionText.includes('workout') || actionText.includes('completed')) 
                          && !actionText.includes('качество'); // exclude Whoop quality sleep entries
        const isVO2Max = actionText.includes('vo2max');
        const isSleep = actionText.includes('slept') && actionText.match(/\d+:\d+/); // Only HH:MM format
        const isStrain = actionText.includes('strain');
        const isSteps = actionText.includes('шаг') || (actionText.includes('steps') && !actionText.includes('made an activity'));
        
        return isRecovery || isWorkout || isVO2Max || isSleep || isStrain || isSteps;
      });

      setActivities(filteredActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить ленту активности",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchActivities();
    setRefreshing(false);
    toast({
      title: "Обновлено!",
      description: "Лента активности обновлена",
    });
  };

  useEffect(() => {
    fetchActivities();

    const channel = supabase
      .channel('activity-feed-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_feed'
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onActivityUpdate = () => {
    fetchActivities();
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-24 px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground tracking-wider">
            ACTIVITY FEED
          </h1>
          <button className="w-12 h-12 rounded-full border-2 border-muted flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
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

  if (activities.length === 0) {
    return (
      <div className="min-h-screen pb-24 px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground tracking-wider">
            ACTIVITY FEED
          </h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300"
            style={{
              borderColor: "#10B981",
              boxShadow: "0 0 15px rgba(16, 185, 129, 0.5)",
            }}
          >
            <RefreshCw
              className={`h-5 w-5 text-white ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground text-lg">
            Пока нет активности
          </p>
          <p className="text-muted-foreground/60 text-sm mt-2">
            Начните тренировки, и ваши достижения появятся здесь!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground tracking-wider">
          ACTIVITY FEED
        </h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 hover:scale-110"
          style={{
            borderColor: "#10B981",
            boxShadow: "0 0 15px rgba(16, 185, 129, 0.5)",
          }}
        >
          <RefreshCw
            className={`h-5 w-5 text-white ${refreshing ? "animate-spin" : ""}`}
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
  );
}