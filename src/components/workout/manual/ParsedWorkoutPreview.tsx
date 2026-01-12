import { ParsedWorkout, formatSet } from "@/lib/workout-text-parser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { getDateLocale } from "@/lib/date-locale";
import { Dumbbell, Clock, Layers, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ParsedWorkoutPreviewProps {
  workout: ParsedWorkout;
  workoutName: string;
  date: string;
  duration: number;
}

export function ParsedWorkoutPreview({
  workout,
  workoutName,
  date,
  duration,
}: ParsedWorkoutPreviewProps) {
  const { t } = useTranslation('workouts');
  const formattedDate = format(new Date(date), "d MMMM yyyy", { locale: getDateLocale() });
  
  // Group exercises by superset
  const groupedExercises: { supersetGroup?: number; exercises: typeof workout.exercises }[] = [];
  let currentGroup: typeof workout.exercises = [];
  let currentSupersetId: number | undefined = undefined;

  for (const exercise of workout.exercises) {
    if (exercise.supersetGroup !== currentSupersetId) {
      if (currentGroup.length > 0) {
        groupedExercises.push({ supersetGroup: currentSupersetId, exercises: currentGroup });
      }
      currentGroup = [exercise];
      currentSupersetId = exercise.supersetGroup;
    } else {
      currentGroup.push(exercise);
    }
  }
  if (currentGroup.length > 0) {
    groupedExercises.push({ supersetGroup: currentSupersetId, exercises: currentGroup });
  }

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <Card className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border-cyan-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>{workoutName}</span>
            <Badge variant="outline" className="text-cyan-400 border-cyan-400/50">
              {formattedDate}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <Dumbbell className="w-3 h-3" />
                {t('parsedPreview.exercises')}
              </div>
              <div className="text-xl font-bold text-cyan-400">
                {workout.exercises.length}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <Layers className="w-3 h-3" />
                {t('parsedPreview.sets')}
              </div>
              <div className="text-xl font-bold text-blue-400">
                {workout.totalSets}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <Zap className="w-3 h-3" />
                {t('parsedPreview.volume')}
              </div>
              <div className="text-xl font-bold text-green-400">
                {t('stats.kg', { value: workout.totalVolume.toLocaleString() })}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <Clock className="w-3 h-3" />
                {t('parsedPreview.time')}
              </div>
              <div className="text-xl font-bold text-purple-400">
                {t('stats.minutes', { value: duration })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercise list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {groupedExercises.map((group, groupIndex) => (
          <div key={groupIndex}>
            {group.supersetGroup && (
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant="secondary" 
                  className="bg-orange-500/20 text-orange-400 border-orange-500/30"
                >
                  {t('parsedPreview.superset', { number: group.supersetGroup })}
                </Badge>
                <div className="flex-1 h-px bg-orange-500/30" />
              </div>
            )}
            
            {group.exercises.map((exercise, exerciseIndex) => (
              <Card 
                key={exerciseIndex}
                className={`bg-neutral-800/50 border-neutral-700 ${
                  group.supersetGroup ? 'ml-4 border-l-2 border-l-orange-500/50' : ''
                }`}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">
                        {exercise.name}
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {exercise.sets.map((set, setIndex) => (
                          <Badge 
                            key={setIndex}
                            variant="outline"
                            className="text-xs font-mono bg-neutral-900/50"
                          >
                            {formatSet(set)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {exercise.totalVolume && exercise.totalVolume > 0 && (
                      <div className="text-right ml-3">
                        <span className="text-xs text-muted-foreground">{t('parsedPreview.volumeLabel')}</span>
                        <div className="text-sm font-semibold text-green-400">
                          {t('stats.kg', { value: exercise.totalVolume.toLocaleString() })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
