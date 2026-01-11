import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subMonths } from 'date-fns';
import { getIntlLocale } from '@/lib/date-locale';

interface ExerciseProgress {
  date: string;
  weight: number;
  reps: number;
  volume: number;
  isPR: boolean;
  isBodyweight: boolean;
}

interface ExerciseProgressResult {
  data: ExerciseProgress[];
  isBodyweight: boolean;
}

export function useExerciseProgress(exerciseName: string, userId?: string) {
  return useQuery({
    queryKey: ['exercise-progress', exerciseName, userId],
    queryFn: async (): Promise<ExerciseProgressResult> => {
      if (!userId) return { data: [], isBodyweight: false };

      const threeMonthsAgo = subMonths(new Date(), 3);

      const { data, error } = await supabase
        .from('workout_logs')
        .select('performed_at, actual_weight, actual_reps, set_number')
        .eq('exercise_name', exerciseName)
        .eq('user_id', userId)
        .gte('performed_at', threeMonthsAgo.toISOString())
        .order('performed_at', { ascending: true });

      if (error) throw error;

      // Determine if this is a bodyweight exercise (majority of entries have weight = 0)
      const totalEntries = data?.length || 0;
      const bodyweightEntries = data?.filter(d => !d.actual_weight || d.actual_weight === 0).length || 0;
      const isBodyweight = totalEntries > 0 && bodyweightEntries > totalEntries / 2;

      // Group by date and find max value per day
      // For bodyweight: max reps; for weighted: max weight
      const grouped = data?.reduce((acc: Record<string, ExerciseProgress>, curr) => {
        const date = new Date(curr.performed_at).toLocaleDateString(getIntlLocale());
        const weight = curr.actual_weight || 0;
        const reps = curr.actual_reps || 0;
        const volume = weight * reps;

        const currentBest = acc[date];
        const shouldReplace = !currentBest || (isBodyweight 
          ? reps > currentBest.reps 
          : weight > currentBest.weight);

        if (shouldReplace) {
          acc[date] = {
            date: curr.performed_at,
            weight,
            reps,
            volume,
            isPR: false,
            isBodyweight: !weight || weight === 0,
          };
        }

        return acc;
      }, {});

      const progressArray = Object.values(grouped || {});

      // Mark PRs based on the primary metric
      let maxValue = 0;
      progressArray.forEach(entry => {
        const value = isBodyweight ? entry.reps : entry.weight;
        if (value > maxValue) {
          entry.isPR = true;
          maxValue = value;
        }
      });

      return { data: progressArray, isBodyweight };
    },
    enabled: !!userId && !!exerciseName,
  });
}

export function calculateTrend(data: ExerciseProgress[], isBodyweight: boolean = false): {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
} {
  if (data.length < 2) return { direction: 'stable', percentage: 0 };

  const recent = data.slice(-5);
  const older = data.slice(-10, -5);

  if (older.length === 0) return { direction: 'stable', percentage: 0 };

  // Use reps for bodyweight, weight for weighted exercises
  const getValue = (d: ExerciseProgress) => isBodyweight ? d.reps : d.weight;
  
  const recentAvg = recent.reduce((sum, d) => sum + getValue(d), 0) / recent.length;
  const olderAvg = older.reduce((sum, d) => sum + getValue(d), 0) / older.length;

  const percentage = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

  if (Math.abs(percentage) < 2) return { direction: 'stable', percentage: 0 };
  
  return {
    direction: percentage > 0 ? 'up' : 'down',
    percentage: Math.abs(percentage),
  };
}
