import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Sparkles, Play, Zap, Moon, Activity, AlertCircle, BedDouble, Bot, MoreHorizontal, SkipForward, Eye } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format, addDays, startOfWeek } from "date-fns";
import { useDailyWorkout, type AdjustedExercise } from "@/hooks/useDailyWorkout";
import LogWorkout from "./LogWorkout";
import { BackgroundWaves } from "./BackgroundWaves";
import WorkoutDayNavigator from "./WorkoutDayNavigator";
import MinimalistExerciseCard from "./MinimalistExerciseCard";
import ExerciseDetailDialog from "./ExerciseDetailDialog";

export default function WorkoutToday() {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeExercise, setActiveExercise] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [selectedExercise, setSelectedExercise] = useState<AdjustedExercise | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  // Calculate date for selected day
  const getDateForDay = (dayOfWeek: number): Date => {
    const today = new Date();
    const currentDay = today.getDay();
    const diff = dayOfWeek - currentDay;
    return addDays(today, diff);
  };

  const targetDate = getDateForDay(selectedDay);
  const { data, isLoading, error } = useDailyWorkout(
    userId || undefined,
    format(targetDate, 'yyyy-MM-dd')
  );

  const handleDayChange = (newDay: number) => {
    setSelectedDay(newDay);
  };

  const handleSkip = () => {
    toast.info("Workout skipped for today", {
      description: "Make sure to stay consistent with your training!"
    });
  };

  const handlePreview = () => {
    toast.success("Preview mode", {
      description: "Review all exercises before starting"
    });
  };

  const handleStartTraining = () => {
    if (!data) return;
    
    const workoutData = {
      planId: data.assigned_plan_id || '',
      weekNumber: data.week_number || 1,
      dayOfWeek: data.day_of_week || 0,
      workoutName: data.workout_name || '',
      exercises: data.adjusted_exercises || []
    };
    
    sessionStorage.setItem('activeWorkout', JSON.stringify(workoutData));
    window.location.href = '/workouts/live-logger';
  };

  const handleStartExercise = (exercise: AdjustedExercise) => {
    setActiveExercise({
      ...exercise,
      dayOfWeek: data?.day_of_week,
      workoutName: data?.workout_name
    });
  };

  if (isLoading) {
    return (
      <div className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
        <BackgroundWaves />
        <div className="relative z-10 container mx-auto px-4 py-6 space-y-4 max-w-4xl">
          <Skeleton className="h-16 w-full rounded-full" />
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-96 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
        <BackgroundWaves />
        <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
          <Card className="border-destructive backdrop-blur-xl bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                Error Loading Workout
              </CardTitle>
              <CardDescription>
                {error instanceof Error ? error.message : "Failed to load today's workout"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data?.success) {
    return (
      <div className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
        <BackgroundWaves />
        <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
          <Card className="border-dashed backdrop-blur-xl bg-white/5">
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
        </div>
      </div>
    );
  }

  // Rest Day Handling
  if (data.is_rest_day) {
    return (
      <div className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
        <BackgroundWaves />
        <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-center mb-6"
          >
            Workout Today
          </motion.h1>

          {data.plan_name && (
            <WorkoutDayNavigator
              planName={data.plan_name}
              weekNumber={data.week_number || 1}
              dayOfWeek={selectedDay}
              onDayChange={handleDayChange}
            />
          )}

          <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5 backdrop-blur-xl">
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
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
      <BackgroundWaves />
      
      <div className="relative z-10 container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-center mb-6"
        >
          Workout Today
        </motion.h1>
        
        {/* Day Navigator */}
        <WorkoutDayNavigator
          planName={data.plan_name || "Training Plan"}
          weekNumber={data.week_number || 1}
          dayOfWeek={selectedDay}
          onDayChange={handleDayChange}
        />
        
        {/* AI Insight Card */}
        {data.ai_rationale && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="
              backdrop-blur-xl bg-white/5
              border border-white/10
              rounded-3xl p-6
              shadow-[0_8px_32px_rgba(0,0,0,0.3)]
            "
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-cyan-400 font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Insight:
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {data.ai_rationale}
                </p>
                
                <div className="flex flex-wrap gap-4 pt-3 mt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span className="text-gray-400">Recovery:</span>
                    <span className="font-semibold text-gray-200">{data.readiness.recovery_score || 'N/A'}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Moon className="w-4 h-4 text-cyan-400" />
                    <span className="text-gray-400">Sleep:</span>
                    <span className="font-semibold text-gray-200">{data.readiness.sleep_score || 'N/A'}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span className="text-gray-400">Activity:</span>
                    <span className="font-semibold text-gray-200">{data.readiness.activity_score || 'N/A'}%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Button
            size="lg"
            onClick={handleStartTraining}
            className="flex-1 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 shadow-[0_0_30px_rgba(6,182,212,0.3)] text-base font-semibold h-14"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Training
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={handleSkip}
            className="sm:w-auto backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/10 h-14"
          >
            <SkipForward className="w-5 h-5 mr-2" />
            Skip
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handlePreview}
            className="sm:w-auto backdrop-blur-xl bg-white/5 hover:bg-white/10 border border-white/10 h-14"
          >
            <Eye className="w-5 h-5 mr-2" />
            Preview
          </Button>
        </motion.div>
        
        {/* Overview Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between pt-4"
        >
          <h2 className="text-2xl font-semibold text-gray-200">Overview</h2>
          <MoreHorizontal className="w-6 h-6 text-gray-400" />
        </motion.div>
        
        {/* Exercise List */}
        <div className="space-y-3 pb-8">
          {(data.adjusted_exercises ?? [])
            .filter((e) => e && typeof e.name === 'string' && e.name.trim() !== '')
            .map((exercise: AdjustedExercise, idx: number) => (
              <MinimalistExerciseCard
                key={idx}
                exercise={exercise}
                index={idx}
                onInfoClick={() => setSelectedExercise(exercise)}
                onStartClick={() => handleStartExercise(exercise)}
              />
            ))}
          
          {/* Empty state if no valid exercises */}
          {data.adjusted_exercises && 
           (data.adjusted_exercises ?? []).filter((e) => e && typeof e.name === 'string' && e.name.trim() !== '').length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 text-center"
            >
              <p className="text-gray-300 mb-4">На сегодня упражнений нет</p>
              <p className="text-sm text-gray-400">Загляните в План или сгенерируйте новый</p>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Exercise Detail Dialog */}
      <ExerciseDetailDialog
        exercise={selectedExercise}
        open={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
        onStart={handleStartExercise}
      />
      
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
