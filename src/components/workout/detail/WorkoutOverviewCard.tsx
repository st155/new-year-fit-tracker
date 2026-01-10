import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Flame, Activity, Heart, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { WorkoutDetail } from "@/hooks/useWorkoutDetail";
import { getWorkoutTypeName } from "@/lib/workout-types";

interface WorkoutOverviewCardProps {
  workout: WorkoutDetail;
}

export default function WorkoutOverviewCard({ workout }: WorkoutOverviewCardProps) {
  const { t, i18n } = useTranslation('workouts');
  const workoutName = getWorkoutTypeName(workout.workout_type);
  const dateLocale = i18n.language === 'ru' ? ru : enUS;
  
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          {workoutName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date & Time */}
        <div className="flex items-center gap-2 text-gray-300">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>{format(new Date(workout.start_time), 'EEEE, d MMMM yyyy • HH:mm', { locale: dateLocale })}</span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          {/* Duration */}
          {workout.duration_minutes && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <Clock className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-xs text-gray-400">{t('stats.time')}</p>
                <p className="text-lg font-semibold text-gray-100">{workout.duration_minutes} {t('units.min')}</p>
              </div>
            </div>
          )}

          {/* Calories */}
          {workout.calories_burned && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <Flame className="w-5 h-5 text-orange-400" />
              <div>
                <p className="text-xs text-gray-400">{t('stats.calories')}</p>
                <p className="text-lg font-semibold text-gray-100">{workout.calories_burned} {t('units.kcal')}</p>
              </div>
            </div>
          )}

          {/* Distance */}
          {workout.distance_km && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <Activity className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-xs text-gray-400">{t('stats.distance')}</p>
                <p className="text-lg font-semibold text-gray-100">{workout.distance_km.toFixed(2)} {t('units.km')}</p>
              </div>
            </div>
          )}

          {/* Heart Rate */}
          {workout.heart_rate_avg && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <Heart className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-xs text-gray-400">{t('stats.avgHeartRate')}</p>
                <p className="text-lg font-semibold text-gray-100">
                  {workout.heart_rate_avg} <span className="text-sm text-gray-400">{t('units.bpm')}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Source Badge */}
        <div className="pt-2 border-t border-white/10">
          <span className="text-xs text-gray-400">{t('stats.source')} {workout.source.toUpperCase()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
