import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Clock } from 'lucide-react';

interface WorkoutExercise {
  exercise_name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
}

interface Workout {
  workout_name: string;
  description?: string;
  exercises: WorkoutExercise[];
}

interface WorkoutCardProps {
  workout: Workout;
  compact?: boolean;
}

export const WorkoutCard = ({ workout, compact = false }: WorkoutCardProps) => {
  const totalExercises = workout.exercises.length;
  const estimatedTime = workout.exercises.reduce((acc, ex) => {
    // Rough estimate: 3 min per set + rest
    return acc + (ex.sets * 3) + (ex.sets * ex.rest_seconds / 60);
  }, 0);

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Dumbbell className="h-4 w-4 text-primary flex-shrink-0" />
            <CardTitle className="text-sm font-semibold truncate">
              {workout.workout_name}
            </CardTitle>
          </div>
          <Badge variant="secondary" className="flex-shrink-0 text-xs">
            {totalExercises} упр.
          </Badge>
        </div>
        {workout.description && !compact && (
          <p className="text-xs text-muted-foreground mt-1">
            {workout.description}
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1.5 mb-3">
          {workout.exercises.map((ex, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between gap-2 text-xs group"
            >
              <span className="text-muted-foreground flex-1 min-w-0 group-hover:text-foreground transition-colors">
                <span className="font-medium">{idx + 1}.</span> {ex.exercise_name}
              </span>
              <span className="text-muted-foreground font-mono flex-shrink-0">
                {ex.sets}×{ex.reps}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t border-primary/10">
          <Clock className="h-3 w-3" />
          <span>~{Math.round(estimatedTime)} мин</span>
        </div>
      </CardContent>
    </Card>
  );
};
