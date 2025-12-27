import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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

export function ClientWorkoutsList({ clientId }: ClientWorkoutsListProps) {
  const { t } = useTranslation('trainerDashboard');
  const [period, setPeriod] = useState('30');
  const [workoutType, setWorkoutType] = useState<string>('all');

  const WORKOUT_TYPE_KEYS: Record<string, string> = {
    'running': 'workoutTypes.running',
    'cycling': 'workoutTypes.cycling',
    'swimming': 'workoutTypes.swimming',
    'strength': 'workoutTypes.strength',
    'yoga': 'workoutTypes.yoga',
    'hiit': 'workoutTypes.hiit',
    'walking': 'workoutTypes.walking',
    'functional_fitness': 'workoutTypes.functional_fitness',
    'cross_training': 'workoutTypes.cross_training',
    'elliptical': 'workoutTypes.elliptical',
    'rowing': 'workoutTypes.rowing',
    'stair_climbing': 'workoutTypes.stair_climbing',
    'pilates': 'workoutTypes.pilates',
    'dance': 'workoutTypes.dance',
    'martial_arts': 'workoutTypes.martial_arts',
    'basketball': 'workoutTypes.basketball',
    'soccer': 'workoutTypes.soccer',
    'tennis': 'workoutTypes.tennis',
    'golf': 'workoutTypes.golf',
    'hiking': 'workoutTypes.hiking',
    'other': 'workoutTypes.other',
  };

  const SOURCE_KEYS: Record<string, string> = {
    'whoop': 'Whoop',
    'garmin': 'Garmin',
    'apple_health': 'Apple Health',
    'withings': 'Withings',
    'oura': 'Oura',
    'manual': 'sourceLabels.manual',
    'elite10': 'Elite10',
  };

  const PERIOD_OPTIONS = [
    { value: '7', labelKey: 'periodOptions.last7days' },
    { value: '30', labelKey: 'periodOptions.last30days' },
    { value: '90', labelKey: 'periodOptions.last90days' },
    { value: 'all', labelKey: 'periodOptions.allTime' },
  ];

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
    if (!type) return t('clientWorkouts.defaultType');
    const key = WORKOUT_TYPE_KEYS[type.toLowerCase()];
    return key ? t(key) : type;
  };

  const getSourceLabel = (source: string | null) => {
    if (!source) return t('clientWorkouts.unknownSource');
    const key = SOURCE_KEYS[source.toLowerCase()];
    if (!key) return source;
    // If key starts with 'sourceLabels.', it's a translation key
    return key.startsWith('sourceLabels.') ? t(key) : key;
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
            {t('clientWorkouts.title')}
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
              {t('clientWorkouts.title')}
            </CardTitle>
            <CardDescription>
              {t('clientWorkouts.found', { count: filteredWorkouts.length })}
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
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={workoutType} onValueChange={setWorkoutType}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('clientWorkouts.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('clientWorkouts.allTypes')}</SelectItem>
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
            <p className="text-muted-foreground">{t('clientWorkouts.noWorkouts')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('clientWorkouts.date')}</TableHead>
                  <TableHead>{t('clientWorkouts.type')}</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {t('clientWorkouts.duration')}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Flame className="h-4 w-4" />
                      {t('clientWorkouts.calories')}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      {t('clientWorkouts.heartRate')}
                    </div>
                  </TableHead>
                  <TableHead>{t('clientWorkouts.source')}</TableHead>
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
                      {workout.calories_burned ? `${workout.calories_burned} ${t('clientWorkouts.kcal')}` : '-'}
                    </TableCell>
                    <TableCell>
                      {workout.heart_rate_avg ? (
                        <span>
                          {workout.heart_rate_avg}
                          {workout.heart_rate_max && (
                            <span className="text-muted-foreground text-xs ml-1">
                              ({t('clientWorkouts.max')} {workout.heart_rate_max})
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
