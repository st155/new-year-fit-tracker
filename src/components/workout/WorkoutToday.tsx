import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Sparkles, Play, Zap, Moon, Activity, AlertCircle, BedDouble } from "lucide-react";
import { toast } from "sonner";
import { useDailyWorkout, type AdjustedExercise } from "@/hooks/useDailyWorkout";
import LogWorkout from "./LogWorkout";

export default function WorkoutToday() {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeExercise, setActiveExercise] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  const { data, isLoading, error } = useDailyWorkout(userId || undefined);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Error Loading Workout
          </CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : "Failed to load today's workout"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!data?.success) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-muted-foreground" />
          </div>
          <CardTitle>No Active Training Plan</CardTitle>
          <CardDescription>
            Generate an AI training plan to get started with your workouts
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pt-0">
          <Button size="lg" onClick={() => window.location.hash = '#/workout?tab=plan'}>
            <Sparkles className="w-4 h-4 mr-2" />
            Create Training Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Rest Day Handling
  if (data.is_rest_day) {
    return (
      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <BedDouble className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Rest & Recovery Day</CardTitle>
          <CardDescription className="text-base mt-2">
            Today is your rest day. Focus on recovery, sleep, and nutrition to prepare for your next training session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-background/50">
              <Zap className="w-6 h-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{data.readiness.recovery_score || 'N/A'}</div>
              <div className="text-xs text-muted-foreground">Recovery</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <Moon className="w-6 h-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{data.readiness.sleep_score || 'N/A'}</div>
              <div className="text-xs text-muted-foreground">Sleep</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <Activity className="w-6 h-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{data.readiness.activity_score || 'N/A'}</div>
              <div className="text-xs text-muted-foreground">Activity</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Coach Insights Card */}
      {data.ai_rationale && (
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 shadow-lg shadow-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Coach Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base leading-relaxed">{data.ai_rationale}</p>
            
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Recovery:</span>
                <span className="font-semibold">{data.readiness.recovery_score || 'N/A'}%</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Moon className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Sleep:</span>
                <span className="font-semibold">{data.readiness.sleep_score || 'N/A'}%</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Activity:</span>
                <span className="font-semibold">{data.readiness.activity_score || 'N/A'}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workout Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{data.workout_name || 'Today\'s Workout'}</CardTitle>
          <CardDescription>
            {data.adjusted_exercises?.length || 0} exercises
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.adjusted_exercises?.map((exercise: AdjustedExercise, idx: number) => (
            <Card key={idx} className={exercise.was_modified ? "border-primary/50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {idx + 1}. {exercise.name}
                      {exercise.was_modified && (
                        <Badge variant="secondary" className="ml-2">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Modified
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {exercise.sets} sets × {exercise.reps} reps
                      {exercise.weight && ` @ ${exercise.weight} kg`}
                      {exercise.rir !== undefined && ` • RIR ${exercise.rir}`}
                      {exercise.rpe !== undefined && ` • RPE ${exercise.rpe}`}
                      {exercise.rest_seconds && ` • Rest: ${Math.floor(exercise.rest_seconds / 60)}:${(exercise.rest_seconds % 60).toString().padStart(2, '0')}`}
                    </CardDescription>
                    {exercise.adjustment_reason && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {exercise.adjustment_reason}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  onClick={() => setActiveExercise({
                    ...exercise,
                    dayOfWeek: data.day_of_week,
                    workoutName: data.workout_name
                  })}
                  className="w-full"
                  variant={exercise.was_modified ? "default" : "outline"}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Training
                </Button>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Log Workout Sheet */}
      <Sheet open={!!activeExercise} onOpenChange={() => setActiveExercise(null)}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Log Exercise</SheetTitle>
          </SheetHeader>
          {activeExercise && (
            <div className="mt-6">
              <LogWorkout 
                exercise={{
                  name: activeExercise.name,
                  sets: activeExercise.sets,
                  reps: activeExercise.reps,
                  rpe: activeExercise.rpe || activeExercise.rir || 7,
                  rir: activeExercise.rir,
                  rest_seconds: activeExercise.rest_seconds
                }}
                assignedPlanId={data.assigned_plan_id}
                dayOfWeek={activeExercise.dayOfWeek}
                workoutName={activeExercise.workoutName}
                onComplete={() => {
                  setActiveExercise(null);
                  toast.success("Exercise completed!");
                }}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
