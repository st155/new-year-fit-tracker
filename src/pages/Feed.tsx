import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ActivityCard } from "@/components/feed/ActivityCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActivityItem {
  id: string;
  user_id: string;
  action_type: string;
  action_text: string;
  created_at: string;
  profiles: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  like_count?: number;
  comment_count?: number;
  user_liked?: boolean;
}

export default function Feed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
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
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get user profiles separately
      const activitiesWithProfiles = await Promise.all(
        (activitiesData || []).map(async (activity) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url')
            .eq('user_id', activity.user_id)
            .single();

          // Get likes count
          const { count: likeCount } = await supabase
            .from('activity_likes')
            .select('*', { count: 'exact', head: true })
            .eq('activity_id', activity.id);

          // Get comments count
          const { count: commentCount } = await supabase
            .from('activity_comments')
            .select('*', { count: 'exact', head: true })
            .eq('activity_id', activity.id);

          // Check if current user liked this activity
          const user = await supabase.auth.getUser();
          const { data: userLike } = await supabase
            .from('activity_likes')
            .select('id')
            .eq('activity_id', activity.id)
            .eq('user_id', user.data.user?.id)
            .maybeSingle();

          return {
            ...activity,
            profiles: profile,
            like_count: likeCount || 0,
            comment_count: commentCount || 0,
            user_liked: !!userLike
          };
        })
      );

      setActivities(activitiesWithProfiles);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить ленту активности",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <Activity className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Лента активности</h1>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted rounded"></div>
                    <div className="h-3 w-20 bg-muted rounded"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-4 w-full bg-muted rounded mb-4"></div>
                <div className="flex gap-4">
                  <div className="h-8 w-16 bg-muted rounded"></div>
                  <div className="h-8 w-20 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Лента активности</h1>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchActivities}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {activities.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Пока нет активности</h3>
            <p className="text-muted-foreground">
              Начните тренироваться или добавляйте измерения, чтобы увидеть активность в ленте!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <ActivityCard 
              key={activity.id} 
              activity={activity}
              onActivityUpdate={fetchActivities}
            />
          ))}
        </div>
      )}
    </div>
  );
}