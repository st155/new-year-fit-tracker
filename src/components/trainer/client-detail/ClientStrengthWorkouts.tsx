import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Dumbbell, Calendar, ChevronDown, ChevronUp, Weight, Repeat } from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { subDays } from "date-fns";

interface ClientStrengthWorkoutsProps {
  clientId: string;
}

interface WorkoutLog {
  id: string;
  exercise_name: string;
  set_number: number;
  actual_weight: number | null;
  actual_reps: number | null;
  performed_at: string;
  notes: string | null;
  superset_group: string | null;
}

interface GroupedWorkout {
  date: string;
  exercises: {
    name: string;
    sets: {
      setNumber: number;
      weight: number;
      reps: number;
      notes: string | null;
    }[];
    supersetGroup: string | null;
  }[];
  totalSets: number;
  totalVolume: number;
}

const PERIOD_OPTIONS = [
  { value: '7', label: 'Неделя' },
  { value: '30', label: 'Месяц' },
  { value: '90', label: '3 месяца' },
  { value: 'all', label: 'Всё время' },
];

export function ClientStrengthWorkouts({ clientId }: ClientStrengthWorkoutsProps) {
  const [period, setPeriod] = useState('30');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const { data: workouts, isLoading } = useQuery({
    queryKey: ['client-strength-workouts', clientId, period],
    queryFn: async () => {
      let query = supabase
        .from('workout_logs')
        .select('id, exercise_name, set_number, actual_weight, actual_reps, performed_at, notes, superset_group')
        .eq('user_id', clientId)
        .order('performed_at', { ascending: false });

      if (period !== 'all') {
        const startDate = subDays(new Date(), parseInt(period));
        query = query.gte('performed_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by date
      const grouped: Record<string, GroupedWorkout> = {};
      
      for (const log of (data as WorkoutLog[]) || []) {
        const dateKey = format(new Date(log.performed_at), 'yyyy-MM-dd');
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = {
            date: dateKey,
            exercises: [],
            totalSets: 0,
            totalVolume: 0,
          };
        }
        
        // Find or create exercise entry
        let exercise = grouped[dateKey].exercises.find(e => e.name === log.exercise_name);
        if (!exercise) {
          exercise = {
            name: log.exercise_name,
            sets: [],
            supersetGroup: log.superset_group,
          };
          grouped[dateKey].exercises.push(exercise);
        }
        
        const weight = log.actual_weight || 0;
        const reps = log.actual_reps || 0;
        
        exercise.sets.push({
          setNumber: log.set_number,
          weight,
          reps,
          notes: log.notes,
        });
        
        grouped[dateKey].totalSets++;
        grouped[dateKey].totalVolume += weight * reps;
      }

      // Sort exercises by first appearance and sets by set number
      Object.values(grouped).forEach(workout => {
        workout.exercises.forEach(exercise => {
          exercise.sets.sort((a, b) => a.setNumber - b.setNumber);
        });
      });

      return Object.values(grouped).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    },
    enabled: !!clientId,
  });

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Силовые тренировки
          </CardTitle>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {!workouts || workouts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Нет силовых тренировок за выбранный период</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map(workout => {
              const isExpanded = expandedDates.has(workout.date);
              const formattedDate = format(new Date(workout.date), 'd MMMM yyyy', { locale: ru });
              
              return (
                <Collapsible key={workout.date} open={isExpanded}>
                  <CollapsibleTrigger 
                    onClick={() => toggleDate(workout.date)}
                    className="w-full"
                  >
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formattedDate}</span>
                        <Badge variant="secondary">
                          {workout.exercises.length} упр.
                        </Badge>
                        <Badge variant="outline">
                          {workout.totalSets} сетов
                        </Badge>
                        {workout.totalVolume > 0 && (
                          <Badge variant="outline" className="hidden sm:inline-flex">
                            {(workout.totalVolume / 1000).toFixed(1)}т объём
                          </Badge>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="mt-2 pl-4 border-l-2 border-muted space-y-3">
                      {workout.exercises.map((exercise, idx) => (
                        <div 
                          key={`${exercise.name}-${idx}`}
                          className="p-3 bg-background rounded-lg border"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{exercise.name}</span>
                            {exercise.supersetGroup && (
                              <Badge variant="secondary" className="text-xs">
                                Суперсет {exercise.supersetGroup}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {exercise.sets.map((set, setIdx) => (
                              <div 
                                key={setIdx}
                                className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-sm"
                              >
                                {set.weight > 0 ? (
                                  <>
                                    <Weight className="h-3 w-3 text-muted-foreground" />
                                    <span>{set.weight}кг</span>
                                    <span className="text-muted-foreground">×</span>
                                    <Repeat className="h-3 w-3 text-muted-foreground" />
                                    <span>{set.reps}</span>
                                  </>
                                ) : (
                                  <>
                                    <Repeat className="h-3 w-3 text-muted-foreground" />
                                    <span>{set.reps} повт.</span>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
