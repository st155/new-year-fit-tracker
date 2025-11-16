import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subMonths } from 'date-fns';

interface ExerciseProgress {
  date: string;
  weight: number;
  reps: number;
  volume: number;
  isPR: boolean;
}

export function useExerciseProgress(exerciseName: string, userId?: string) {
  return useQuery({
    queryKey: ['exercise-progress', exerciseName, userId],
    queryFn: async () => {
      if (!userId) return [];

      const threeMonthsAgo = subMonths(new Date(), 3);

      const { data, error } = await supabase
        .from('workout_logs')
        .select('performed_at, actual_weight, actual_reps, set_number')
        .eq('exercise_name', exerciseName)
        .eq('user_id', userId)
        .gte('performed_at', threeMonthsAgo.toISOString())
        .order('performed_at', { ascending: true });

      if (error) throw error;

      // Group by date and find max weight per day
      const grouped = data?.reduce((acc: Record<string, ExerciseProgress>, curr) => {
        const date = new Date(curr.performed_at).toLocaleDateString('ru-RU');
        const weight = curr.actual_weight || 0;
        const reps = curr.actual_reps || 0;
        const volume = weight * reps;

        if (!acc[date] || weight > acc[date].weight) {
          acc[date] = {
            date: curr.performed_at,
            weight,
            reps,
            volume,
            isPR: false,
          };
        }

        return acc;
      }, {});

      const progressArray = Object.values(grouped || {});

      // Mark PRs
      let maxWeight = 0;
      progressArray.forEach(entry => {
        if (entry.weight > maxWeight) {
          entry.isPR = true;
          maxWeight = entry.weight;
        }
      });

      return progressArray;
    },
    enabled: !!userId && !!exerciseName,
  });
}

export function calculateTrend(data: ExerciseProgress[]): {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
} {
  if (data.length < 2) return { direction: 'stable', percentage: 0 };

  const recent = data.slice(-5);
  const older = data.slice(-10, -5);

  if (older.length === 0) return { direction: 'stable', percentage: 0 };

  const recentAvg = recent.reduce((sum, d) => sum + d.weight, 0) / recent.length;
  const olderAvg = older.reduce((sum, d) => sum + d.weight, 0) / older.length;

  const percentage = ((recentAvg - olderAvg) / olderAvg) * 100;

  if (Math.abs(percentage) < 2) return { direction: 'stable', percentage: 0 };
  
  return {
    direction: percentage > 0 ? 'up' : 'down',
    percentage: Math.abs(percentage),
  };
}
