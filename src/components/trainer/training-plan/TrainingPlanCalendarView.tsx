import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WorkoutCard } from './WorkoutCard';
import { Calendar } from 'lucide-react';

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

interface TrainingPlanCalendarViewProps {
  workouts: TrainingPlanWorkout[];
}

export const TrainingPlanCalendarView = ({ workouts }: TrainingPlanCalendarViewProps) => {
  const { t } = useTranslation('trainer');

  const DAYS = [
    t('trainingPlans.days.mon'),
    t('trainingPlans.days.tue'),
    t('trainingPlans.days.wed'),
    t('trainingPlans.days.thu'),
    t('trainingPlans.days.fri'),
    t('trainingPlans.days.sat'),
    t('trainingPlans.days.sun')
  ];

  const DAYS_FULL = [
    t('trainingPlans.daysFull.monday'),
    t('trainingPlans.daysFull.tuesday'),
    t('trainingPlans.daysFull.wednesday'),
    t('trainingPlans.daysFull.thursday'),
    t('trainingPlans.daysFull.friday'),
    t('trainingPlans.daysFull.saturday'),
    t('trainingPlans.daysFull.sunday')
  ];

  return (
    <div className="space-y-4">
      {/* Desktop grid view */}
      <div className="hidden md:grid md:grid-cols-7 gap-3">
        {DAYS.map((day, index) => {
          const workout = workouts.find(w => w.day_of_week === index);
          
          return (
            <div key={index} className="space-y-2">
              <div className="text-center">
                <h3 className="font-bold text-sm">{day}</h3>
                <p className="text-xs text-muted-foreground">{DAYS_FULL[index]}</p>
              </div>
              <div className="min-h-[250px]">
                {workout ? (
                  <WorkoutCard workout={workout} compact />
                ) : (
                  <Card className="h-full border-dashed border-muted-foreground/30">
                    <CardContent className="flex flex-col items-center justify-center h-full py-8">
                      <Badge variant="outline" className="mb-2">{t('calendar.rest')}</Badge>
                      <Calendar className="h-6 w-6 text-muted-foreground/50" />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile list view */}
      <div className="md:hidden space-y-3">
        {DAYS_FULL.map((day, index) => {
          const workout = workouts.find(w => w.day_of_week === index);
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">{day}</h3>
                {!workout && (
                  <Badge variant="outline">{t('calendar.rest')}</Badge>
                )}
              </div>
              {workout ? (
                <WorkoutCard workout={workout} />
              ) : (
                <Card className="border-dashed border-muted-foreground/30">
                  <CardContent className="flex items-center justify-center py-6">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-5 w-5" />
                      <span className="text-sm">{t('calendar.restDay')}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
