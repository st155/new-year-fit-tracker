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
          source_id,
          source_table,
          metadata,
          profiles:user_id (
            username,
            full_name,
            avatar_url
          )
        `)
        .in('action_type', ['workouts', 'metric_values', 'measurements', 'body_composition'])
        .order('created_at', { ascending: false })
        .limit(100); // Увеличиваем лимит, чтобы не терялись тренировки за счет сна

      if (error) throw error;

      const formattedActivities: ActivityItem[] = ((activitiesData || []).map((activity: any) => ({
        ...activity,
        profiles: Array.isArray(activity.profiles) ? activity.profiles[0] : activity.profiles,
      })) as any);

      // Доп. обогащение данных: для metric_values подтягиваем название метрики и длительность тренировки
      const metricActivities = formattedActivities.filter(
        (a) => a.action_type === 'metric_values' && (a as any).metadata
      );
      const externalIds = Array.from(
        new Set(
          metricActivities
            .map((a) => ((a as any).metadata as any)?.external_id)
            .filter((v) => typeof v === 'string' && v.length > 0)
        )
      );
      const metricIds = Array.from(
        new Set(
          metricActivities
            .map((a) => ((a as any).metadata as any)?.metric_id)
            .filter((v) => typeof v === 'string' && v.length > 0)
        )
      );

      let enhancedActivities: ActivityItem[] = formattedActivities;

      // Собираем source_ids для metric_values, чтобы можно было подтянуть value и дату измерения
      const sourceIds = Array.from(
        new Set(
          metricActivities
            .map((a: any) => a.source_id)
            .filter((v: any) => typeof v === 'string' && v.length > 0)
        )
      );

      if (externalIds.length > 0 || metricIds.length > 0 || sourceIds.length > 0) {
        const [workoutsRes, metricsRes, metricValuesRes] = await Promise.all([
          externalIds.length
            ? supabase
                .from('workouts')
                .select('external_id, workout_type, duration_minutes')
                .in('external_id', externalIds)
            : Promise.resolve({ data: [], error: null }),
          metricIds.length
            ? supabase
                .from('user_metrics')
                .select('id, metric_name, unit')
                .in('id', metricIds)
            : Promise.resolve({ data: [], error: null }),
          sourceIds.length
            ? supabase
                .from('metric_values')
                .select('id, value, measurement_date')
                .in('id', sourceIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        const workoutMap = new Map<string, any>(
          (((workoutsRes as any).data) || []).map((w: any) => [w.external_id, w])
        );
        const metricsMap = new Map<string, any>(
          (((metricsRes as any).data) || []).map((m: any) => [m.id, m])
        );
        const metricValuesMap = new Map<string, any>(
          (((metricValuesRes as any).data) || []).map((mv: any) => [mv.id, mv])
        );

        enhancedActivities = formattedActivities.map((a: any) => {
          if (a.action_type !== 'metric_values' || !a.metadata) return a as ActivityItem;
          const meta: any = a.metadata || {};
          const wo: any = meta.external_id ? (workoutMap.get(meta.external_id as string) as any) : null;
          const mu: any = meta.metric_id ? (metricsMap.get(meta.metric_id as string) as any) : null;
          const mv: any = a.source_id ? (metricValuesMap.get(a.source_id as string) as any) : null;
          return {
            ...a,
            metadata: {
              ...(meta as object),
              workout_type: wo?.workout_type ?? meta.workout_type,
              duration_minutes: wo?.duration_minutes ?? meta.duration_minutes,
              metric_name: mu?.metric_name ?? meta.metric_name,
              unit: mu?.unit ?? meta.unit,
              value: mv?.value ?? meta.value,
              measurement_date: mv?.measurement_date ?? meta.measurement_date,
            },
          } as ActivityItem;
        });
      }

      // Дедупликация по id
      const deduped = Array.from(
        new Map(enhancedActivities.map(a => [a.id, a])).values()
      );

      // Приоритизируем тренировки и strain, затем прочее, затем сон
      const isSleep = (a: ActivityItem) => {
        const text = (a.action_text || '').toLowerCase();
        const mname = (((a as any).metadata?.metric_name) || '').toLowerCase();
        return /sleep|slept|сон/.test(text) || /sleep|сон/.test(mname);
      };
      const isStrainOrWorkout = (a: ActivityItem) => {
        const text = (a.action_text || '').toLowerCase();
        const mname = (((a as any).metadata?.metric_name) || '').toLowerCase();
        return a.action_type === 'workouts' || /strain/.test(text) || /strain/.test(mname);
      };

      const prioritized = [
        ...deduped.filter(isStrainOrWorkout),
        ...deduped.filter((a) => !isStrainOrWorkout(a) && !isSleep(a)),
        ...deduped.filter(isSleep),
      ].slice(0, 30);

      setActivities(prioritized as ActivityItem[]);
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
        <h1 className="text-4xl font-bold tracking-wider">ACTIVITY FEED</h1>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={fetchActivities}
          disabled={loading}
          className="h-12 w-12 rounded-full"
        >
          <RefreshCw className={`h-6 w-6 ${loading ? 'animate-spin' : ''}`} />
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