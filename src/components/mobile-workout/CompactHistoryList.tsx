/**
 * CompactHistoryList - Compact workout history list
 * Shows recent workouts in minimal form
 */

import { motion } from "framer-motion";
import { format } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { Dumbbell, Footprints, Timer, Trophy, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

interface WorkoutItem {
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

interface CompactHistoryListProps {
  workouts: WorkoutItem[];
  maxItems?: number;
  onWorkoutClick: (workout: WorkoutItem) => void;
  onViewAll: () => void;
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

export function CompactHistoryList({
  workouts,
  maxItems = 5,
  onWorkoutClick,
  onViewAll
}: CompactHistoryListProps) {
  const { t } = useTranslation('workouts');
  const dateLocale = i18n.language === 'ru' ? ru : enUS;
  const displayedWorkouts = workouts.slice(0, maxItems);

  if (displayedWorkouts.length === 0) {
    return null;
  }

  return (
    <div className="mx-4 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-foreground">{t('history.title')}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewAll}
          className="text-muted-foreground hover:text-foreground"
        >
          {t('history.viewAll', { count: workouts.length })}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {displayedWorkouts.map((workout, index) => {
          const Icon = workoutIcons[workout.workout_type] || workoutIcons.default;
          const isStrength = workout.workout_type === "strength" || workout.total_volume;

          return (
            <motion.button
              key={workout.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onWorkoutClick(workout)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl",
                "bg-card/50 border border-border/30",
                "hover:bg-card/80 hover:border-border/50",
                "transition-all text-left"
              )}
            >
              {/* Icon */}
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                "bg-gradient-to-br from-muted/50 to-muted/30"
              )}>
                <Icon className="w-5 h-5 text-muted-foreground" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {workout.name || t('lastWorkout.workout')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(workout.date, "d MMM, HH:mm", { locale: dateLocale })}
                </p>
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Timer className="w-3.5 h-3.5" />
                  <span className="text-sm">{workout.duration_minutes || 0}m</span>
                </div>

                {isStrength && workout.total_volume ? (
                  <span className="text-sm font-medium text-foreground">
                    {formatVolume(workout.total_volume)}
                  </span>
                ) : workout.distance_km ? (
                  <span className="text-sm font-medium text-foreground">
                    {workout.distance_km.toFixed(1)}km
                  </span>
                ) : null}

                {workout.pr_count && workout.pr_count > 0 && (
                  <div className="flex items-center gap-0.5 text-amber-500">
                    <Trophy className="w-3.5 h-3.5" />
                    <span className="text-sm font-medium">{workout.pr_count}</span>
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
