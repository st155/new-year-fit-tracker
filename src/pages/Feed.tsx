import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
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
}

export default function Feed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchActivities = async () => {
    try {
      setLoading(true);

      // Оптимизированный запрос - сразу джойним профили
      const { data: activitiesData, error } = await supabase
        .from('activity_feed')
        .select(`
          id,
          user_id,
          action_type,
          action_text,
          created_at,
          metadata,
          profiles:user_id (
            username,
            full_name,
            avatar_url
          )
        `)
        .in('action_type', ['workouts', 'metric_values', 'measurements', 'body_composition'])
        .order('created_at', { ascending: false })
        .limit(20); // Уменьшаем лимит для быстрой загрузки

      if (error) throw error;

      // Преобразуем данные в нужный формат
      const formattedActivities = (activitiesData || []).map(activity => ({
        ...activity,
        profiles: Array.isArray(activity.profiles) ? activity.profiles[0] : activity.profiles
      }));

      setActivities(formattedActivities);
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

    // Real-time subscription для новых активностей
    const channel = supabase
      .channel('activity_feed_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
          filter: `action_type=in.(workouts,metric_values,measurements,body_composition)`
        },
        () => {
          // При добавлении новой активности обновляем ленту
          fetchActivities();
        }
      )
      .subscribe();

    // Обновление при возвращении на страницу
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchActivities();
      }
    };
    
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  if (loading && activities.length === 0) {
    return (
      <div className="container mx-auto p-4 max-w-2xl min-h-screen bg-background">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight">Лента</h1>
              <h1 className="text-2xl font-bold leading-tight">активности</h1>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i} 
              className="relative rounded-3xl p-[2px] bg-gradient-to-r from-primary via-primary to-success overflow-hidden animate-pulse"
            >
              <div className="relative rounded-3xl bg-card/90 backdrop-blur-sm p-6 h-20">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-8 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl min-h-screen bg-background">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Лента</h1>
            <h1 className="text-2xl font-bold leading-tight">активности</h1>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={fetchActivities}
          disabled={loading}
          className="h-10 px-4 rounded-full bg-card/50 border-border/50 hover:bg-card"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {activities.length === 0 ? (
        <Card className="text-center py-12 rounded-3xl border-border/50 bg-card/50">
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