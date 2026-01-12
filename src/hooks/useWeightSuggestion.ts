import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';
import i18n from '@/i18n';

interface WeightSuggestion {
  suggestedWeight: number;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

export function useWeightSuggestion(exerciseName: string, userId?: string) {
  return useQuery({
    queryKey: ['weight-suggestion', exerciseName, userId],
    queryFn: async (): Promise<WeightSuggestion | null> => {
      if (!userId) return null;

      const thirtyDaysAgo = subDays(new Date(), 30);

      const { data, error } = await supabase
        .from('workout_logs')
        .select('actual_weight, actual_reps, actual_rpe, performed_at')
        .eq('exercise_name', exerciseName)
        .eq('user_id', userId)
        .gte('performed_at', thirtyDaysAgo.toISOString())
        .order('performed_at', { ascending: false })
        .limit(5);

      if (error || !data || data.length === 0) return null;

      const lastWorkout = data[0];
      const lastWeight = lastWorkout.actual_weight || 0;
      const lastRPE = lastWorkout.actual_rpe || 7;

      // Calculate suggestion based on RPE and history
      let suggestedWeight = lastWeight;
      let reason = '';
      let confidence: 'high' | 'medium' | 'low' = 'medium';

      if (lastRPE < 7) {
        // Too easy - increase significantly
        suggestedWeight = lastWeight + 5;
        reason = i18n.t('workouts:weightSuggestion.tooEasy');
        confidence = 'high';
      } else if (lastRPE >= 7 && lastRPE < 9) {
        // Good intensity - progressive overload
        suggestedWeight = lastWeight + 2.5;
        reason = i18n.t('workouts:weightSuggestion.progressiveOverload', { weight: lastWeight });
        confidence = 'high';
      } else if (lastRPE >= 9) {
        // Too hard - keep same or reduce
        suggestedWeight = lastWeight;
        reason = i18n.t('workouts:weightSuggestion.tooHard');
        confidence = 'medium';
      }

      // Check for consistency
      if (data.length >= 3) {
        const recentWeights = data.slice(0, 3).map(w => w.actual_weight || 0);
        const isConsistent = recentWeights.every(w => Math.abs(w - lastWeight) <= 5);
        
        if (!isConsistent) {
          confidence = 'low';
          reason += i18n.t('workouts:weightSuggestion.unstableWeight');
        }
      }

      return {
        suggestedWeight: Math.round(suggestedWeight * 2) / 2, // Round to nearest 0.5
        reason,
        confidence,
      };
    },
    enabled: !!userId && !!exerciseName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
