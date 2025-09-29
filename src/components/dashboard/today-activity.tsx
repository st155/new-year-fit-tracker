import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Activity, Clock, Flame, Heart, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface TodayWorkout {
  id: string;
  workout_type: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  calories_burned: number | null;
  heart_rate_avg: number | null;
  heart_rate_max: number | null;
  source: string;
}

export function TodayActivity() {
  const { user } = useAuth();
  const [todayWorkouts, setTodayWorkouts] = useState<TodayWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayWorkouts = async () => {
      if (!user) return;

      try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('workouts')
          .select('*')
          .eq('user_id', user.id)
          .gte('start_time', `${today}T00:00:00`)
          .lte('start_time', `${today}T23:59:59`)
          .order('start_time', { ascending: false });

        if (error) {
          console.error('Error fetching today workouts:', error);
          return;
        }

        setTodayWorkouts(data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayWorkouts();
  }, [user]);

  if (loading || todayWorkouts.length === 0) {
    return null;
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

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Flame className="h-3 w-3 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Calories</span>
            </div>
            <div className="text-lg font-bold text-foreground">
              {Math.round(totalCalories)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-accent/20 bg-accent/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <Clock className="h-3 w-3 text-accent" />
              </div>
              <span className="text-xs text-muted-foreground">Duration</span>
            </div>
            <div className="text-lg font-bold text-foreground">
              {Math.round(totalDuration)} min
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-500/20 bg-red-500/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-red-500/10">
                <Heart className="h-3 w-3 text-red-500" />
              </div>
              <span className="text-xs text-muted-foreground">Avg HR</span>
            </div>
            <div className="text-lg font-bold text-foreground">
              {avgHeartRate > 0 ? Math.round(avgHeartRate) : '--'}
            </div>
          </CardContent>
        </Card>
      </div>

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
                  <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
                    <Dumbbell className="h-4 w-4 text-white" />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">
                        {workout.workout_type}
                      </h4>
                      {workout.source === 'whoop' && (
                        <Badge variant="secondary" className="text-xs">
                          Whoop
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
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