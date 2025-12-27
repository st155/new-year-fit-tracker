import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calendar, Dumbbell, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ExerciseImage from "@/components/workout/ExerciseImage";
import { useExerciseImages } from "@/hooks/useExerciseImages";

interface PlanViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName?: string;
  weekNumber?: number;
  totalWeeks?: number;
}

interface WorkoutExercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  rest_seconds?: number;
  notes?: string;
}

interface PlanWorkout {
  id: string;
  day_of_week: number;
  workout_name: string;
  description?: string;
  exercises: WorkoutExercise[];
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export default function PlanViewerDialog({
  open,
  onOpenChange,
  planId,
  planName,
  weekNumber = 1,
  totalWeeks = 12,
}: PlanViewerDialogProps) {
  const { t } = useTranslation('workouts');
  const { getImageUrl } = useExerciseImages();
  
  const dayNames = DAY_KEYS.map(key => t(`dayNames.${key}`));

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ['plan-workouts', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_plan_workouts')
        .select('*')
        .eq('plan_id', planId)
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      
      // Transform data to match our interface
      return (data || []).map(workout => ({
        id: workout.id,
        day_of_week: workout.day_of_week,
        workout_name: workout.workout_name,
        description: workout.description || undefined,
        exercises: Array.isArray(workout.exercises) 
          ? (workout.exercises as unknown as WorkoutExercise[]) 
          : [],
      })) as PlanWorkout[];
    },
    enabled: !!planId && open,
  });

  // Group workouts by day
  const workoutsByDay = workouts.reduce((acc, workout) => {
    const day = workout.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(workout);
    return acc;
  }, {} as Record<number, PlanWorkout[]>);

  // Get training days (days with workouts)
  const trainingDays = Object.keys(workoutsByDay).map(Number).sort();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-neutral-900 border-neutral-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Dumbbell className="w-5 h-5 text-cyan-400" />
            <span>{planName || t('planViewer.defaultTitle')}</span>
            <Badge variant="outline" className="ml-auto">
              {t('planViewer.weekOfTotal', { week: weekNumber, total: totalWeeks })}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
            </div>
          ) : workouts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('planViewer.noExercises')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Week schedule overview */}
              <div className="flex gap-2 justify-center py-4 border-b border-neutral-800">
                {dayNames.map((day, idx) => {
                  const hasWorkout = trainingDays.includes(idx);
                  const isToday = idx === new Date().getDay();
                  
                  return (
                    <div
                      key={DAY_KEYS[idx]}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                        hasWorkout
                          ? isToday
                            ? 'bg-cyan-500 text-neutral-950'
                            : 'bg-neutral-800 text-foreground'
                          : 'bg-neutral-900 text-muted-foreground opacity-50'
                      }`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>

              {/* Workouts by day */}
              {trainingDays.map((dayIndex) => {
                const dayWorkouts = workoutsByDay[dayIndex];
                
                return (
                  <div key={dayIndex} className="space-y-4">
                    {dayWorkouts.map((workout) => (
                      <div
                        key={workout.id}
                        className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-sm font-bold text-neutral-950">
                            {dayNames[dayIndex]}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {workout.workout_name}
                            </h3>
                            {workout.description && (
                              <p className="text-sm text-muted-foreground">
                                {workout.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          {(workout.exercises || []).map((exercise, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 pl-4 border-l-2 border-neutral-700"
                            >
                              <ExerciseImage
                                exerciseName={exercise.name}
                                imageUrl={getImageUrl(exercise.name)}
                                size="sm"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">
                                  {exercise.name}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>{exercise.sets} × {exercise.reps}</span>
                                  {exercise.weight && (
                                    <span className="text-cyan-400">{t('planViewer.weight', { weight: exercise.weight })}</span>
                                  )}
                                  {exercise.rest_seconds && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {t('planViewer.rest', { seconds: exercise.rest_seconds })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
