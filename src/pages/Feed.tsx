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
  metadata?: any;
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
          created_at,
          metadata
        `)
.in('action_type', ['workouts','metric_values','measurements','body_composition'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      const activities = activitiesData || [];

      if (activities.length === 0) {
        setActivities([]);
        return;
      }

      // 2) Batch fetch profiles
      const userIds = Array.from(new Set(activities.map(a => a.user_id)));
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', userIds);
      const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));

      // 3) Batch fetch likes and comments
      const activityIds = activities.map(a => a.id);
      const [likesRes, commentsRes, authUser] = await Promise.all([
        supabase
          .from('activity_likes')
          .select('id, activity_id, user_id')
          .in('activity_id', activityIds),
        supabase
          .from('activity_comments')
          .select('id, activity_id')
          .in('activity_id', activityIds),
        supabase.auth.getUser(),
      ]);

      const likes = likesRes.data || [];
      const comments = commentsRes.data || [];
      const currentUserId = authUser.data.user?.id;

      const likeCountMap = new Map<string, number>();
      const userLikedSet = new Set<string>();
      likes.forEach(like => {
        likeCountMap.set(like.activity_id, (likeCountMap.get(like.activity_id) || 0) + 1);
        if (currentUserId && like.user_id === currentUserId) userLikedSet.add(like.activity_id);
      });

      const commentCountMap = new Map<string, number>();
      comments.forEach(c => {
        commentCountMap.set(c.activity_id, (commentCountMap.get(c.activity_id) || 0) + 1);
      });

      // 4) Compose final payload
      const activitiesWithMeta = activities.map(a => ({
        ...a,
        profiles: profileMap.get(a.user_id) || null,
        like_count: likeCountMap.get(a.id) || 0,
        comment_count: commentCountMap.get(a.id) || 0,
        user_liked: userLikedSet.has(a.id),
      }));

      setActivities(activitiesWithMeta);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить ленту активности',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    // Re-fetch on visibility change to keep fresh on mobile resume
    const onVis = () => document.visibilityState === 'visible' && fetchActivities();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
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
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Лента<br/>активности</h1>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={fetchActivities}
          disabled={loading}
          className="h-9 rounded-full"
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