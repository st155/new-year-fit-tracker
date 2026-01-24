import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ExerciseIcon from "@/components/workout/ExerciseIcon";
import { 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Play, 
  CheckCircle2,
  Info,
  Flame
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Exercise {
  exercise_name: string;
  sets: number;
  reps: string;
  rpe?: number;
  rest_seconds?: number;
  notes?: string;
}

interface DayWorkoutCardProps {
  dayName: string;
  workoutName: string;
  exercises: Exercise[];
  estimatedMinutes?: number;
  muscleGroups?: string[];
  isToday?: boolean;
  completedExercises?: number;
  onStartWorkout?: () => void;
  onExerciseInfo?: (exercise: Exercise) => void;
  onLogExercise?: (exercise: Exercise) => void;
}

export function DayWorkoutCard({
  dayName,
  workoutName,
  exercises,
  estimatedMinutes,
  muscleGroups = [],
  isToday = false,
  completedExercises = 0,
  onStartWorkout,
  onExerciseInfo,
  onLogExercise,
}: DayWorkoutCardProps) {
  const { t } = useTranslation('workouts');
  const [isExpanded, setIsExpanded] = useState(isToday);
  const totalExercises = exercises.length;
  const progressPercentage = (completedExercises / totalExercises) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={cn(
        "relative",
        isToday && "ring-2 ring-primary/50 rounded-xl"
      )}
    >
      <Card className={cn(
        "overflow-hidden transition-all duration-300",
        isToday && "border-primary/50"
      )}>
        <CardHeader className="bg-gradient-to-br from-primary/5 via-primary/2 to-transparent pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Calendar className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">{dayName}</CardTitle>
                {isToday && (
                  <Badge variant="outline" className="bg-warning/10 border-warning/30">
                    <Flame className="w-3 h-3 mr-1" />
                    {t('dayCard.today')}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-sm text-muted-foreground">
                  {workoutName}
                </h4>
                {estimatedMinutes && (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {estimatedMinutes}-{estimatedMinutes + 15} {t('units.min')}
                  </Badge>
                )}
              </div>

              {muscleGroups.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {muscleGroups.map((group) => (
                    <Badge key={group} variant="outline" className="text-xs">
                      {group}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="shrink-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Progress Bar */}
          {completedExercises > 0 && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t('dayCard.progress')}</span>
                <span className="font-medium">{completedExercises}/{totalExercises}</span>
              </div>
              <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-success to-primary"
                />
              </div>
            </div>
          )}
        </CardHeader>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent className="pt-4 space-y-3">
                {exercises.map((exercise, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <ExerciseIcon name={exercise.exercise_name} className="mt-1" />
                    
                    <div className="flex-1 space-y-1">
                      <h5 className="font-medium text-sm">{exercise.exercise_name}</h5>
                      <p className="text-xs text-muted-foreground">
                        {exercise.sets}×{exercise.reps}
                        {exercise.rpe && ` • ${t('exercise.rpe')} ${exercise.rpe}`}
                        {exercise.rest_seconds && (
                          <> • 💤 {Math.floor(exercise.rest_seconds / 60)}:{(exercise.rest_seconds % 60).toString().padStart(2, '0')}</>
                        )}
                      </p>
                      {exercise.notes && (
                        <p className="text-xs italic text-muted-foreground/80">
                          💡 {exercise.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1">
                      {onExerciseInfo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onExerciseInfo(exercise)}
                          className="h-8 w-8 p-0"
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      )}
                      {onLogExercise && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onLogExercise(exercise)}
                          className="h-8 w-8 p-0"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}

                {onStartWorkout && (
                  <Button
                    onClick={onStartWorkout}
                    className="w-full mt-4"
                    size="lg"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {t('dayCard.startWorkout')}
                  </Button>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>

        {!isExpanded && (
          <CardContent className="pt-3 pb-4">
            <p className="text-sm text-muted-foreground text-center">
              ⚡ {totalExercises} {t('dayCard.exercises', { count: totalExercises })}
            </p>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}
