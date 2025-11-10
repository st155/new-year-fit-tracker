import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Activity, Clock, Flame, Heart } from "lucide-react";

export default function Logbook() {
  const { data: autoWorkouts, isLoading } = useQuery({
    queryKey: ['auto-workouts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('unified_metrics')
        .select('*')
        .eq('user_id', user.id)
        .eq('metric_category', 'workout')
        .order('measurement_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!autoWorkouts || autoWorkouts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Workouts Yet</CardTitle>
          <CardDescription>
            Your auto-synced workouts from connected devices will appear here
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Auto-Synced Workout History</h2>
        <p className="text-sm text-muted-foreground">
          {autoWorkouts.length} workouts logged
        </p>
      </div>

      <div className="grid gap-4">
        {autoWorkouts.map((workout) => (
          <Card key={workout.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    {workout.metric_name}
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(workout.measurement_date), 'PPP')} • {workout.source}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <dt className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Duration
                  </dt>
                  <dd className="text-lg font-semibold">
                    {(workout.source_data as any)?.duration_minutes || 'N/A'} min
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-sm text-muted-foreground flex items-center gap-1">
                    <Flame className="w-4 h-4" />
                    Calories
                  </dt>
                  <dd className="text-lg font-semibold">
                    {Math.round(workout.value) || 0} kcal
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-sm text-muted-foreground flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    Avg HR
                  </dt>
                  <dd className="text-lg font-semibold">
                    {(workout.source_data as any)?.heart_rate_avg || 'N/A'} bpm
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-sm text-muted-foreground flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    Strain
                  </dt>
                  <dd className="text-lg font-semibold">
                    {(workout.source_data as any)?.strain || 'N/A'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
