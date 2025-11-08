import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, Activity, Clock, Flame, Heart, TrendingUp, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";
import { todayDateString } from "@/lib/datetime-utils";
import { getWorkoutIcon } from "@/lib/workout-icons";

interface TodayWorkout {
  id: string;
  workout_type: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  calories_burned: number | null;
  distance_km: number | null;
  heart_rate_avg: number | null;
  heart_rate_max: number | null;
  source: string;
  strain?: number;
}

interface DailySteps {
  steps: number;
  distance_km: number | null;
  active_calories: number | null;
}

export function TodayActivity() {
  const { user } = useAuth();
  const [todayWorkouts, setTodayWorkouts] = useState<TodayWorkout[]>([]);
  const [dailySteps, setDailySteps] = useState<DailySteps | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayWorkouts = async () => {
      if (!user) return;

      try {
        const now = new Date();
        const utcToday = todayDateString();
        
        // Загружаем тренировки за последние 24 часа
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        // Загружаем тренировки из таблицы workouts (за последние 24 часа)
        const { data: workoutsData, error: workoutsError } = await supabase
          .from('workouts')
          .select('*')
          .eq('user_id', user.id)
          .gte('start_time', last24Hours.toISOString())
          .order('start_time', { ascending: false });

        if (workoutsError) {
          console.error('Error fetching today workouts:', workoutsError);
        }

        // Загружаем тренировки из Whoop (metric_values)
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let whoopMetricsFinal: any[] = [];
        const { data: whoopToday, error: whoopError } = await supabase
          .from('metric_values')
          .select(`
            *,
            user_metrics!inner(metric_name, metric_category, source)
          `)
          .eq('user_id', user.id)
          .eq('measurement_date', utcToday)
          .eq('user_metrics.metric_category', 'workout')
          .eq('user_metrics.source', 'whoop')
          .eq('user_metrics.metric_name', 'Workout Strain');

        if (whoopError) {
          console.error('Error fetching Whoop workouts:', whoopError);
        }

        whoopMetricsFinal = whoopToday || [];

        // Fallback: если за "сегодня" нет метрик Whoop, попробуем вчера (таймзона)
        if (whoopMetricsFinal.length === 0) {
          const { data: whoopYesterday, error: whoopYesterdayError } = await supabase
            .from('metric_values')
            .select(`
              *,
              user_metrics!inner(metric_name, metric_category, source)
            `)
            .eq('user_id', user.id)
            .eq('measurement_date', yesterdayStr)
            .eq('user_metrics.metric_category', 'workout')
            .eq('user_metrics.source', 'whoop')
            .eq('user_metrics.metric_name', 'Workout Strain');

          if (whoopYesterdayError) {
            console.error('Error fetching Whoop workouts (yesterday fallback):', whoopYesterdayError);
          }

          whoopMetricsFinal = whoopYesterday || [];
        }

        // Группируем Whoop метрики по external_id (каждая тренировка)
        const whoopWorkoutsMap = new Map<string, any>();
        (whoopMetricsFinal || []).forEach((metric: any) => {
          const workoutId = metric.external_id;
          if (!whoopWorkoutsMap.has(workoutId)) {
            whoopWorkoutsMap.set(workoutId, {
              id: workoutId,
              workout_type: metric.notes || 'Whoop Workout',
              start_time: metric.created_at || `${utcToday}T12:00:00`, // Approximate start time
              end_time: null,
              duration_minutes: null,
              calories_burned: null,
              heart_rate_avg: null,
              heart_rate_max: null,
              source: 'whoop',
              strain: null
            });
          }
        });

        // Загружаем дополнительные метрики для каждой тренировки
        if (whoopWorkoutsMap.size > 0) {
          const workoutIds = Array.from(whoopWorkoutsMap.keys());
          
          // Получаем все метрики для этих тренировок
          const { data: allMetrics } = await supabase
            .from('metric_values')
            .select(`
              *,
              user_metrics!inner(metric_name, source)
            `)
            .eq('user_id', user.id)
            .eq('user_metrics.source', 'whoop')
            .in('external_id', workoutIds);

          // Распределяем метрики по тренировкам
          (allMetrics || []).forEach((metric: any) => {
            const baseId = metric.external_id.replace(/_calories|_hr|_max_hr/g, '');
            const workout = whoopWorkoutsMap.get(baseId);
            
            if (workout) {
              const metricName = metric.user_metrics.metric_name;
              
              if (metricName === 'Workout Strain') {
                workout.strain = metric.value;
                workout.workout_type = metric.notes || 'Whoop Workout';
              } else if (metricName === 'Workout Calories') {
                workout.calories_burned = metric.value;
              } else if (metricName === 'Average Heart Rate') {
                workout.heart_rate_avg = metric.value;
              } else if (metricName === 'Max Heart Rate') {
                workout.heart_rate_max = metric.value;
              }
            }
          });
        }

        // Объединяем оба источника данных
        const allWorkouts = [
          ...(workoutsData || []),
          ...Array.from(whoopWorkoutsMap.values())
        ];

        setTodayWorkouts(allWorkouts);

        // Загружаем шаги за сегодня из daily_health_summary (Terra/Ultrahuman/Garmin)
        const { data: stepsData } = await supabase
          .from('daily_health_summary')
          .select('steps, distance_km, active_calories')
          .eq('user_id', user.id)
          .eq('date', utcToday)
          .maybeSingle();

        if (stepsData) {
          setDailySteps({
            steps: stepsData.steps || 0,
            distance_km: stepsData.distance_km,
            active_calories: stepsData.active_calories
          });
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayWorkouts();
  }, [user]);

  if (loading || todayWorkouts.length === 0) {
    return (
      <div className="space-y-3 animate-fade-in">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1 flex items-center gap-2">
          <Activity className="h-3 w-3 text-primary" />
          Today's Activity
        </h3>
        <div className="p-8 rounded-2xl border-2 border-dashed border-border/50 bg-card/20 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 rounded-full bg-primary/10">
              <Dumbbell className="h-8 w-8 text-primary/50" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">No activity yet today</p>
              <p className="text-xs text-muted-foreground">Start your workout to see it here!</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalCalories = todayWorkouts.reduce((sum, w) => sum + (w.calories_burned || 0), 0);
  const totalDuration = todayWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
  const avgHeartRate = todayWorkouts
    .filter(w => w.heart_rate_avg)
    .reduce((sum, w, _, arr) => sum + (w.heart_rate_avg || 0) / arr.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Today's Activity
        </h3>
        <Badge variant="default" className="bg-primary/10 text-primary">
          {todayWorkouts.length} {todayWorkouts.length === 1 ? 'workout' : 'workouts'}
        </Badge>
      </div>

      {/* Tabs для разных метрик */}
      <Tabs defaultValue="calories" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calories">
            <Flame className="h-3 w-3 mr-1" />
            Calories
          </TabsTrigger>
          <TabsTrigger value="duration">
            <Clock className="h-3 w-3 mr-1" />
            Duration
          </TabsTrigger>
          <TabsTrigger value="hr">
            <Heart className="h-3 w-3 mr-1" />
            Avg HR
          </TabsTrigger>
          <TabsTrigger value="steps">
            <Footprints className="h-3 w-3 mr-1" />
            Steps
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calories" className="mt-4">
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Flame className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Total Calories Burned</span>
              </div>
              <div className="text-3xl font-bold text-foreground">
                {Math.round(totalCalories)}
                <span className="text-sm text-muted-foreground ml-2">kcal</span>
              </div>
              {dailySteps?.active_calories && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Active: {Math.round(dailySteps.active_calories)} kcal
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duration" className="mt-4">
          <Card className="border-2 border-accent/20 bg-accent/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <span className="text-sm text-muted-foreground">Total Duration</span>
              </div>
              <div className="text-3xl font-bold text-foreground">
                {Math.round(totalDuration)}
                <span className="text-sm text-muted-foreground ml-2">min</span>
              </div>
              {dailySteps?.distance_km && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Distance: {dailySteps.distance_km.toFixed(2)} km
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hr" className="mt-4">
          <Card className="border-2 border-red-500/20 bg-red-500/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Heart className="h-5 w-5 text-red-500" />
                </div>
                <span className="text-sm text-muted-foreground">Average Heart Rate</span>
              </div>
              <div className="text-3xl font-bold text-foreground">
                {avgHeartRate > 0 ? Math.round(avgHeartRate) : '--'}
                <span className="text-sm text-muted-foreground ml-2">bpm</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="steps" className="mt-4">
          <Card className="border-2 border-green-500/20 bg-green-500/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Footprints className="h-5 w-5 text-green-500" />
                </div>
                <span className="text-sm text-muted-foreground">Daily Steps</span>
              </div>
              <div className="text-3xl font-bold text-foreground">
                {dailySteps?.steps ? dailySteps.steps.toLocaleString() : '0'}
                <span className="text-sm text-muted-foreground ml-2">steps</span>
              </div>
              {dailySteps?.distance_km && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {dailySteps.distance_km.toFixed(2)} km walked
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Workout Details */}
      <div className="space-y-2">
        {todayWorkouts.map((workout) => (
          <Card 
            key={workout.id}
            className="border-2 border-border/50 hover:border-primary/30 transition-all"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">
                    {getWorkoutIcon(workout.workout_type)}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">
                        {workout.workout_type}
                      </h4>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {workout.source}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center flex-wrap gap-3 text-xs text-muted-foreground">
                      {workout.strain && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {workout.strain.toFixed(1)} strain
                        </span>
                      )}
                      {workout.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {workout.duration_minutes} min
                        </span>
                      )}
                      {workout.calories_burned && (
                        <span className="flex items-center gap-1">
                          <Flame className="h-3 w-3" />
                          {Math.round(workout.calories_burned)} kcal
                        </span>
                      )}
                      {workout.distance_km && (
                        <span className="flex items-center gap-1">
                          <Footprints className="h-3 w-3" />
                          {workout.distance_km.toFixed(2)} км
                        </span>
                      )}
                      {workout.heart_rate_avg && (
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {Math.round(workout.heart_rate_avg)} bpm
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {new Date(workout.start_time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {workout.end_time && ` - ${new Date(workout.end_time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}`}
                    </div>
                  </div>
                </div>

                {workout.heart_rate_max && (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Max HR</div>
                    <div className="text-sm font-bold text-red-500">
                      {Math.round(workout.heart_rate_max)}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}