import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrainerBadge } from '@/components/trainer/ui';
import { Dumbbell } from 'lucide-react';
import ExerciseImage from '@/components/workout/ExerciseImage';
import AddExerciseImageDialog from '@/components/workout/AddExerciseImageDialog';
import { useExerciseImages } from '@/hooks/useExerciseImages';
import { useTranslation } from 'react-i18next';

interface WorkoutExercise {
  name?: string;
  exercise_name?: string;
  exercise_type?: 'strength' | 'cardio' | 'bodyweight';
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
  weight?: number;
  tempo?: string;
  distance?: number;
  duration?: number;
  pace?: string;
  intensity?: string;
  target_metric?: string;
}

const getExerciseName = (exercise: WorkoutExercise): string => {
  return exercise.exercise_name || exercise.name || 'Упражнение';
};

interface TrainingPlanWorkout {
  id: string;
  day_of_week: number;
  workout_name: string;
  description?: string;
  exercises: WorkoutExercise[];
}

interface TrainingPlanWorkoutsTabProps {
  workouts: TrainingPlanWorkout[];
}

export function TrainingPlanWorkoutsTab({ workouts }: TrainingPlanWorkoutsTabProps) {
  const { t } = useTranslation('trainingPlan');
  const { getImageUrl, setImageUrl } = useExerciseImages();
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string>('');

  const DAY_NAMES = [
    t('days.monday'),
    t('days.tuesday'),
    t('days.wednesday'),
    t('days.thursday'),
    t('days.friday'),
    t('days.saturday'),
    t('days.sunday')
  ];

  const handleAddImage = (exerciseName: string) => {
    setSelectedExercise(exerciseName);
    setImageDialogOpen(true);
  };

  const handleImageSelect = (imageUrl: string) => {
    setImageUrl(selectedExercise, imageUrl);
  };

  if (!workouts || workouts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">{t('workouts.noWorkouts')}</h3>
          <p className="text-muted-foreground">
            {t('workouts.noWorkoutsDesc')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {workouts
          .sort((a, b) => a.day_of_week - b.day_of_week)
          .map((workout) => (
            <Card key={workout.id} className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <TrainerBadge variant="info">
                        {DAY_NAMES[workout.day_of_week]}
                      </TrainerBadge>
                      {workout.workout_name}
                    </CardTitle>
                    {workout.description && (
                      <p className="text-sm text-muted-foreground">
                        {workout.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {workout.exercises?.length || 0} {t('workouts.exercisesCount')}
                  </Badge>
                </div>
              </CardHeader>
              {workout.exercises && workout.exercises.length > 0 && (
                <CardContent>
                  <div className="space-y-3">
                    {workout.exercises.map((exercise, idx) => {
                      const exerciseName = getExerciseName(exercise);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30"
                        >
                          <ExerciseImage
                            exerciseName={exerciseName}
                            imageUrl={getImageUrl(exerciseName)}
                            size="md"
                            editable
                            onAddImage={() => handleAddImage(exerciseName)}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{exerciseName}</h4>
                          {exercise.notes && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                              {exercise.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm flex-wrap justify-end">
                          {exercise.sets > 0 && (
                            <div className="text-center min-w-[50px]">
                              <div className="font-semibold">{exercise.sets}</div>
                              <div className="text-xs text-muted-foreground">{t('workouts.sets')}</div>
                            </div>
                          )}
                          {exercise.reps && (
                            <div className="text-center min-w-[50px]">
                              <div className="font-semibold">{exercise.reps}</div>
                              <div className="text-xs text-muted-foreground">{t('workouts.reps')}</div>
                            </div>
                          )}
                          {exercise.weight && (
                            <div className="text-center min-w-[50px]">
                              <div className="font-semibold">{exercise.weight} {t('common:units.kg')}</div>
                              <div className="text-xs text-muted-foreground">{t('workouts.weight')}</div>
                            </div>
                          )}
                          {exercise.distance && (
                            <div className="text-center min-w-[50px]">
                              <div className="font-semibold">{exercise.distance} {t('common:units.km')}</div>
                              <div className="text-xs text-muted-foreground">{t('workouts.distance')}</div>
                            </div>
                          )}
                          {exercise.duration && (
                            <div className="text-center min-w-[50px]">
                              <div className="font-semibold">{exercise.duration} {t('common:units.min')}</div>
                              <div className="text-xs text-muted-foreground">{t('workouts.duration')}</div>
                            </div>
                          )}
                          {exercise.pace && (
                            <div className="text-center min-w-[50px]">
                              <div className="font-semibold">{exercise.pace}</div>
                              <div className="text-xs text-muted-foreground">{t('workouts.pace')}</div>
                            </div>
                          )}
                          {exercise.intensity && (
                            <div className="text-center min-w-[50px]">
                              <div className="font-semibold capitalize">{exercise.intensity}</div>
                              <div className="text-xs text-muted-foreground">{t('workouts.intensity')}</div>
                            </div>
                          )}
                          {exercise.tempo && (
                            <div className="text-center min-w-[50px]">
                              <div className="font-semibold">{exercise.tempo}</div>
                              <div className="text-xs text-muted-foreground">{t('workouts.tempo')}</div>
                            </div>
                          )}
                          {exercise.target_metric && (
                            <div className="text-center min-w-[50px]">
                              <div className="font-semibold">{exercise.target_metric}</div>
                              <div className="text-xs text-muted-foreground">{t('workouts.target')}</div>
                            </div>
                          )}
                          <div className="text-center min-w-[50px]">
                            <div className="font-semibold">{exercise.rest_seconds}{t('common:units.s')}</div>
                            <div className="text-xs text-muted-foreground">{t('workouts.rest')}</div>
                          </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
      </div>

      <AddExerciseImageDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        exerciseName={selectedExercise}
        onImageSelect={handleImageSelect}
      />
    </>
  );
}