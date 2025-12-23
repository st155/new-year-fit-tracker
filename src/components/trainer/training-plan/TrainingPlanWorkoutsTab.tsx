import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrainerBadge } from '@/components/trainer/ui';
import { Dumbbell } from 'lucide-react';
import ExerciseImage from '@/components/workout/ExerciseImage';
import AddExerciseImageDialog from '@/components/workout/AddExerciseImageDialog';
import { useExerciseImages } from '@/hooks/useExerciseImages';

interface WorkoutExercise {
  exercise_name: string;
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

const DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

export function TrainingPlanWorkoutsTab({ workouts }: TrainingPlanWorkoutsTabProps) {
  const { getImageUrl, setImageUrl } = useExerciseImages();
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string>('');

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
          <h3 className="text-lg font-medium mb-2">Нет тренировок</h3>
          <p className="text-muted-foreground">
            В этом плане пока нет добавленных тренировок
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
                    {workout.exercises?.length || 0} упражнений
                  </Badge>
                </div>
              </CardHeader>
              {workout.exercises && workout.exercises.length > 0 && (
                <CardContent>
                  <div className="space-y-3">
                    {workout.exercises.map((exercise, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30"
                      >
                        <ExerciseImage
                          exerciseName={exercise.exercise_name}
                          imageUrl={getImageUrl(exercise.exercise_name)}
                          size="md"
                          editable
                          onAddImage={() => handleAddImage(exercise.exercise_name)}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{exercise.exercise_name}</h4>
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
                              <div className="text-xs text-muted-foreground">подходов</div>
                            </div>
                          )}
                          {exercise.reps && (
                            <div className="text-center min-w-[50px]">
                              <div className="font-semibold">{exercise.reps}</div>
                              <div className="text-xs text-muted-foreground">повторов</div>
                            </div>
                          )}
                          {exercise.weight && (
                            <div className="text-center min-w-[50px]">
                              <div className="font-semibold">{exercise.weight} кг</div>
                              <div className="text-xs text-muted-foreground">вес</div>
                            </div>
                          )}
                          {exercise.distance && (
                            <div className="text-center min-w-[50px]">
                              <div className="font-semibold">{exercise.distance} км</div>
                              <div className="text-xs text-muted-foreground">дистанция</div>
                            </div>
                          )}
                          {exercise.duration && (
                            <div className="text-center min-w-[50px]">
                              <div className="font-semibold">{exercise.duration} мин</div>
                              <div className="text-xs text-muted-foreground">время</div>
                            </div>
                          )}
                          {exercise.pace && (
                            <div className="text-center min-w-[50px]">
                              <div className="font-semibold">{exercise.pace}</div>
                              <div className="text-xs text-muted-foreground">темп</div>
                            </div>
                          )}
                          {exercise.intensity && (
                            <div className="text-center min-w-[50px]">
                              <div className="font-semibold capitalize">{exercise.intensity}</div>
                              <div className="text-xs text-muted-foreground">интенсивность</div>
                            </div>
                          )}
                          {exercise.tempo && (
                            <div className="text-center min-w-[50px]">
                              <div className="font-semibold">{exercise.tempo}</div>
                              <div className="text-xs text-muted-foreground">темп</div>
                            </div>
                          )}
                          {exercise.target_metric && (
                            <div className="text-center min-w-[50px]">
                              <div className="font-semibold">{exercise.target_metric}</div>
                              <div className="text-xs text-muted-foreground">цель</div>
                            </div>
                          )}
                          <div className="text-center min-w-[50px]">
                            <div className="font-semibold">{exercise.rest_seconds}с</div>
                            <div className="text-xs text-muted-foreground">отдых</div>
                          </div>
                        </div>
                      </div>
                    ))}
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
