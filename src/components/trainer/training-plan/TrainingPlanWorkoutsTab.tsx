import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrainerBadge } from '@/components/trainer/ui';
import { Dumbbell } from 'lucide-react';

interface WorkoutExercise {
  exercise_name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
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
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{exercise.exercise_name}</h4>
                        {exercise.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {exercise.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-semibold">{exercise.sets}</div>
                          <div className="text-xs text-muted-foreground">подходов</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">{exercise.reps}</div>
                          <div className="text-xs text-muted-foreground">повторов</div>
                        </div>
                        <div className="text-center">
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
  );
}
