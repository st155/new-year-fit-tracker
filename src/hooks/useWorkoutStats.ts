import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, startOfMonth, differenceInDays } from 'date-fns';

export interface WorkoutStats {
  streak: number;
  totalWorkouts: number;
  totalMinutes: number;
  totalVolume: number;
  lastWorkoutDate: Date | null;
  personalRecords: Array<{
    exercise: string;
    value: number;
    date: string;
  }>;
}

export function useWorkoutStats(period: 'week' | 'month' | 'all' = 'all') {
  return useQuery({
    queryKey: ['workout-stats', period],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Определяем диапазон дат
      const now = new Date();
      let startDate: Date | null = null;
      
      if (period === 'week') {
        startDate = startOfWeek(now, { weekStartsOn: 1 });
      } else if (period === 'month') {
        startDate = startOfMonth(now);
      }

      // Получаем тренировки из workouts таблицы
      let query = supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });

      if (startDate) {
        query = query.gte('start_time', startDate.toISOString());
      }

      const { data: workouts, error } = await query;
      if (error) throw error;

      // Вычисляем статистику
      const totalWorkouts = workouts?.length || 0;
      const totalMinutes = workouts?.reduce((sum, w) => {
        return sum + (w.duration_minutes || 0);
      }, 0) || 0;

      // Total volume можно добавить позже когда будет в базе
      const totalVolume = 0;

      const lastWorkoutDate = workouts?.[0]?.start_time ? new Date(workouts[0].start_time) : null;

      // Вычисляем streak (серию дней подряд с тренировками)
      const streak = calculateStreak(workouts || []);

      // Personal records - заглушка, можно расширить
      const personalRecords: Array<{ exercise: string; value: number; date: string }> = [];

      return {
        streak,
        totalWorkouts,
        totalMinutes: Math.round(totalMinutes),
        totalVolume: Math.round(totalVolume),
        lastWorkoutDate,
        personalRecords,
      } as WorkoutStats;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

function calculateStreak(workouts: any[]): number {
  if (!workouts.length) return 0;

  const dates = workouts
    .map(w => new Date(w.start_time).toDateString())
    .filter((date, index, self) => self.indexOf(date) === index)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let streak = 0;
  
  for (let i = 0; i < dates.length; i++) {
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - i);
    
    if (dates[i] === expectedDate.toDateString()) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
