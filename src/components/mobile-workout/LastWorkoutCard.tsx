/**
 * LastWorkoutCard - Visual card for the most recent workout
 * Shows icon, metrics, and "Repeat" action
 */

import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { Dumbbell, Timer, Footprints, RotateCcw, Trophy, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface WorkoutData {
  id: string;
  workout_type: string;
  name?: string;
  date: Date;
  duration_minutes?: number;
  total_volume?: number;
  calories?: number;
  distance_km?: number;
  pr_count?: number;
}

interface LastWorkoutCardProps {
  workout: WorkoutData | null;
  onRepeat: (workout: WorkoutData) => void;
  onClick: (workout: WorkoutData) => void;
}

const workoutIcons: Record<string, typeof Dumbbell> = {
  strength: Dumbbell,
  cardio: Footprints,
  running: Footprints,
  cycling: Footprints,
  default: Dumbbell,
};

function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}T`;
  }
  return `${Math.round(kg)}kg`;
}

export function LastWorkoutCard({ workout, onRepeat, onClick }: LastWorkoutCardProps) {
  const { t, i18n } = useTranslation('workouts');
  const dateLocale = i18n.language === 'ru' ? ru : enUS;
  
  if (!workout) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-4 p-6 rounded-2xl bg-card/50 border border-border/50 text-center"
      >
        <Dumbbell className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-muted-foreground">{t('lastWorkout.noData')}</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          {t('lastWorkout.startFirst')}
        </p>
      </motion.div>
    );
  }

  const Icon = workoutIcons[workout.workout_type] || workoutIcons.default;
  const timeAgo = formatDistanceToNow(workout.date, { addSuffix: true, locale: dateLocale });

  const isStrength = workout.workout_type === "strength" || workout.total_volume;
  const isCardio = workout.workout_type === "cardio" || workout.distance_km;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(workout)}
      className={cn(
        "mx-4 mt-4 p-4 rounded-2xl cursor-pointer",
        "bg-gradient-to-br from-card to-card/80",
        "border border-border/50",
        "shadow-lg hover:shadow-xl transition-all"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br from-orange-500/20 to-red-500/20"
          )}>
            <Icon className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {workout.name || t('lastWorkout.workout')}
            </h3>
            <p className="text-sm text-muted-foreground">{timeAgo}</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRepeat(workout);
          }}
          className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Repeat
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        {/* Duration */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Timer className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {workout.duration_minutes || 0}
          </p>
          <p className="text-xs text-muted-foreground">{t('units.min')}</p>
        </div>

        {/* Volume or Distance */}
        {isStrength ? (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatVolume(workout.total_volume || 0)}
            </p>
            <p className="text-xs text-muted-foreground">{t('lastWorkout.volume')}</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Footprints className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {workout.distance_km?.toFixed(1) || workout.calories || 0}
            </p>
            <p className="text-xs text-muted-foreground">
              {workout.distance_km ? t('units.km') : t('units.kcal')}
            </p>
          </div>
        )}

        {/* PRs or Calories */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {workout.pr_count || 0}
          </p>
          <p className="text-xs text-muted-foreground">PR</p>
        </div>
      </div>
    </motion.div>
  );
}
