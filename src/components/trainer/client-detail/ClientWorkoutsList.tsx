import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Dumbbell, Clock, Flame, Heart, Activity } from 'lucide-react';

interface ClientWorkoutsListProps {
  clientId: string;
}

const WORKOUT_TYPE_LABELS: Record<string, string> = {
  'running': 'Бег',
  'cycling': 'Велосипед',
  'swimming': 'Плавание',
  'strength': 'Силовая',
  'yoga': 'Йога',
  'hiit': 'HIIT',
  'walking': 'Ходьба',
  'functional_fitness': 'Функциональный тренинг',
  'cross_training': 'Кросс-тренинг',
  'elliptical': 'Эллиптический тренажер',
  'rowing': 'Гребля',
  'stair_climbing': 'Степпер',
  'pilates': 'Пилатес',
  'dance': 'Танцы',
  'martial_arts': 'Единоборства',
  'basketball': 'Баскетбол',
  'soccer': 'Футбол',
  'tennis': 'Теннис',
  'golf': 'Гольф',
  'hiking': 'Хайкинг',
  'other': 'Другое',
};

const SOURCE_LABELS: Record<string, string> = {
  'whoop': 'Whoop',
  'garmin': 'Garmin',
  'apple_health': 'Apple Health',
  'withings': 'Withings',
  'oura': 'Oura',
  'manual': 'Вручную',
  'elite10': 'Elite10',
};

const PERIOD_OPTIONS = [
  { value: '7', label: 'Последние 7 дней' },
  { value: '30', label: 'Последние 30 дней' },
  { value: '90', label: 'Последние 90 дней' },
  { value: 'all', label: 'Все время' },
];

export function ClientWorkoutsList({ clientId }: ClientWorkoutsListProps) {
  const [period, setPeriod] = useState('30');
  const [workoutType, setWorkoutType] = useState<string>('all');

  const { data: workouts, isLoading } = useQuery({
    queryKey: ['client-workouts-list', clientId, period],
    queryFn: async () => {
      let query = supabase
        .from('workouts')
        .select('*')
        .eq('user_id', clientId)
        .order('start_time', { ascending: false });

      if (period !== 'all') {
        const daysAgo = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);
        query = query.gte('start_time', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredWorkouts = workouts?.filter(w => 
    workoutType === 'all' || w.workout_type === workoutType
  ) || [];

  const uniqueWorkoutTypes = [...new Set(workouts?.map(w => w.workout_type) || [])];

  const getWorkoutTypeLabel = (type: string | null) => {
    if (!type) return 'Тренировка';
    return WORKOUT_TYPE_LABELS[type.toLowerCase()] || type;
  };

  const getSourceLabel = (source: string | null) => {
    if (!source) return 'Неизвестно';
    return SOURCE_LABELS[source.toLowerCase()] || source;
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}ч ${mins}м`;
    }
    return `${mins}м`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            История тренировок
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              История тренировок
            </CardTitle>
            <CardDescription>
              {filteredWorkouts.length} тренировок найдено
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={workoutType} onValueChange={setWorkoutType}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Все типы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                {uniqueWorkoutTypes.map(type => (
                  <SelectItem key={type} value={type || 'unknown'}>
                    {getWorkoutTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredWorkouts.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Нет тренировок за выбранный период</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Длительность
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Flame className="h-4 w-4" />
                      Калории
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      Пульс
                    </div>
                  </TableHead>
                  <TableHead>Источник</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkouts.map((workout) => (
                  <TableRow key={workout.id}>
                    <TableCell className="font-medium">
                      {workout.start_time 
                        ? format(new Date(workout.start_time), 'dd MMM yyyy, HH:mm', { locale: ru })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getWorkoutTypeLabel(workout.workout_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDuration(workout.duration_minutes)}</TableCell>
                    <TableCell>
                      {workout.calories_burned ? `${workout.calories_burned} ккал` : '-'}
                    </TableCell>
                    <TableCell>
                      {workout.heart_rate_avg ? (
                        <span>
                          {workout.heart_rate_avg}
                          {workout.heart_rate_max && (
                            <span className="text-muted-foreground text-xs ml-1">
                              (макс {workout.heart_rate_max})
                            </span>
                          )}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getSourceLabel(workout.source)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
