import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import ExerciseIcon from "@/components/workout/ExerciseIcon";
import { Target, Info, Clock, TrendingUp } from "lucide-react";
import { useExerciseProgress, calculateTrend } from "@/hooks/useExerciseProgress";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import ProgressChart from "@/components/workout/plan/ProgressChart";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from 'react-i18next';
interface ExerciseDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: {
    exercise_name: string;
    sets: number;
    reps: string;
    rpe?: number;
    rest_seconds?: number;
    notes?: string;
  } | null;
}

export function ExerciseDetailSheet({
  open,
  onOpenChange,
  exercise,
}: ExerciseDetailSheetProps) {
  const { t } = useTranslation('workouts');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  const { data: progressResult, isLoading } = useExerciseProgress(
    exercise?.exercise_name || '',
    userId || undefined
  );

  const progressData = progressResult?.data || [];
  const isBodyweight = progressResult?.isBodyweight || false;
  const trend = progressData.length > 0 ? calculateTrend(progressData, isBodyweight) : { direction: 'stable' as const, percentage: 0 };

  if (!exercise) return null;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('exercise.title')}
    >
      <ScrollArea className="h-[70vh] pr-4">
        <div className="space-y-6">
          {/* Exercise Header */}
          <div className="flex items-start gap-4">
            <ExerciseIcon name={exercise.exercise_name} className="w-12 h-12" />
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">{exercise.exercise_name}</h3>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">
                  {t('exercise.sets', { count: exercise.sets })}
                </Badge>
                <Badge variant="secondary">
                  {t('exercise.reps', { reps: exercise.reps })}
                </Badge>
                {exercise.rpe && (
                  <Badge variant="outline">
                    RPE {exercise.rpe}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Rest Time */}
          {exercise.rest_seconds && (
            <div className="glass-card p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary" />
                <h4 className="font-semibold">{t('exercise.restBetweenSets')}</h4>
              </div>
              <p className="text-2xl font-bold">
                {Math.floor(exercise.rest_seconds / 60)}:{(exercise.rest_seconds % 60).toString().padStart(2, '0')}
              </p>
            </div>
          )}

          {/* Notes */}
          {exercise.notes && (
            <div className="glass-card p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-primary" />
                <h4 className="font-semibold">{t('exercise.notes')}</h4>
              </div>
              <p className="text-sm text-muted-foreground">{exercise.notes}</p>
            </div>
          )}

          {/* Target Muscles (placeholder) */}
          <div className="glass-card p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" />
              <h4 className="font-semibold">{t('exercise.targetMuscles')}</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('exercise.targetMusclesComingSoon')}
            </p>
          </div>

          {/* Technique Tips (placeholder) */}
          <div className="glass-card p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-primary" />
              <h4 className="font-semibold">{t('exercise.technique')}</h4>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• {t('exercise.techniqueTips.form')}</li>
              <li>• {t('exercise.techniqueTips.breathing')}</li>
              <li>• {t('exercise.techniqueTips.rom')}</li>
              <li>• {t('exercise.techniqueTips.weight')}</li>
            </ul>
          </div>

          {/* Progress History */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h4 className="font-semibold">{t('exercise.progressHistory')}</h4>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-[200px] w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : progressData.length > 0 ? (
              <ProgressChart data={progressData} trend={trend} isBodyweight={isBodyweight} />
            ) : (
              <div className="glass-card p-6 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  {t('exercise.notEnoughData')}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('exercise.performMoreToSeeChart')}
                </p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </ResponsiveDialog>
  );
}
