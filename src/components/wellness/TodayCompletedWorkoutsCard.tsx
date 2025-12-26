import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useTodayCompletedWorkouts, CompletedWorkoutSummary } from "@/hooks/useTodayCompletedWorkouts";
import { CheckCircle2, Dumbbell, Activity, Timer, Flame, Heart, MapPin, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { motion } from "framer-motion";

function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}т`;
  }
  return `${Math.round(kg)}кг`;
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}ч ${mins}м` : `${hours}ч`;
  }
  return `${minutes} мин`;
}

function StrengthWorkoutCard({ workout }: { workout: CompletedWorkoutSummary }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <p className="font-medium text-sm">{workout.workout_type}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(workout.start_time), 'HH:mm', { locale: ru })}
            </p>
          </div>
        </div>
        {workout.duration_minutes && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Timer className="w-3 h-3" />
            {formatDuration(workout.duration_minutes)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {workout.total_volume !== undefined && workout.total_volume > 0 && (
          <div className="bg-neutral-800/50 rounded-lg p-2">
            <p className="text-lg font-bold text-orange-400">
              {formatVolume(workout.total_volume)}
            </p>
            <p className="text-[10px] text-muted-foreground">Объём</p>
          </div>
        )}
        {workout.total_exercises !== undefined && (
          <div className="bg-neutral-800/50 rounded-lg p-2">
            <p className="text-lg font-bold text-cyan-400">
              {workout.total_exercises}
            </p>
            <p className="text-[10px] text-muted-foreground">Упражнений</p>
          </div>
        )}
        {workout.total_sets !== undefined && (
          <div className="bg-neutral-800/50 rounded-lg p-2">
            <p className="text-lg font-bold text-purple-400">
              {workout.total_sets}
            </p>
            <p className="text-[10px] text-muted-foreground">Сетов</p>
          </div>
        )}
      </div>

      {workout.best_lift && (
        <div className="mt-3 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
          <Trophy className="w-3.5 h-3.5" />
          <span>
            Лучший: {workout.best_lift.exercise} — {workout.best_lift.weight}кг × {workout.best_lift.reps}
          </span>
        </div>
      )}
    </motion.div>
  );
}

function CardioWorkoutCard({ workout }: { workout: CompletedWorkoutSummary }) {
  const workoutTypeLabel = workout.workout_type || 'Кардио';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="font-medium text-sm">{workoutTypeLabel}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(workout.start_time), 'HH:mm', { locale: ru })}
              {workout.source && ` • ${workout.source}`}
            </p>
          </div>
        </div>
        {workout.duration_minutes && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Timer className="w-3 h-3" />
            {formatDuration(workout.duration_minutes)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {workout.distance_km !== undefined && workout.distance_km > 0 && (
          <div className="bg-neutral-800/50 rounded-lg p-2">
            <p className="text-lg font-bold text-green-400">
              {workout.distance_km.toFixed(1)}
            </p>
            <p className="text-[10px] text-muted-foreground">км</p>
          </div>
        )}
        {workout.calories !== undefined && workout.calories > 0 && (
          <div className="bg-neutral-800/50 rounded-lg p-2">
            <p className="text-lg font-bold text-orange-400">
              {Math.round(workout.calories)}
            </p>
            <p className="text-[10px] text-muted-foreground">ккал</p>
          </div>
        )}
        {workout.avg_heart_rate !== undefined && workout.avg_heart_rate > 0 && (
          <div className="bg-neutral-800/50 rounded-lg p-2">
            <p className="text-lg font-bold text-red-400">
              {Math.round(workout.avg_heart_rate)}
            </p>
            <p className="text-[10px] text-muted-foreground">уд/мин</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function TodayCompletedWorkoutsCard() {
  const { user } = useAuth();
  const { data: workouts = [], isLoading } = useTodayCompletedWorkouts(user?.id);

  if (isLoading) {
    return (
      <Card className="bg-neutral-900 border-neutral-800 animate-pulse">
        <CardContent className="pt-6">
          <div className="h-24 bg-neutral-800 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  // Don't render if no workouts
  if (workouts.length === 0) {
    return null;
  }

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          Выполнено сегодня
          <span className="text-sm font-normal text-muted-foreground ml-auto">
            {workouts.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {workouts.map((workout) => (
          workout.category === 'strength' ? (
            <StrengthWorkoutCard key={workout.id} workout={workout} />
          ) : (
            <CardioWorkoutCard key={workout.id} workout={workout} />
          )
        ))}
      </CardContent>
    </Card>
  );
}
