/**
 * Hooks for habit analytics (completions, streaks, XP)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';
import { habitKeys } from '../keys';

/**
 * Fetch habit completions for analytics
 */
export function useHabitCompletions(userId?: string, days: number = 30) {
  return useQuery({
    queryKey: habitKeys.completions(userId || '', days),
    queryFn: async () => {
      if (!userId) return [];

      const startDate = subDays(new Date(), days).toISOString();

      const { data, error } = await supabase
        .from('habit_completions')
        .select('*')
        .eq('user_id', userId)
        .gte('completed_at', startDate)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });
}

/**
 * Fetch streak history
 */
export function useStreakHistory(userId?: string) {
  return useQuery({
    queryKey: habitKeys.streakHistory(userId || ''),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('habit_streak_history')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });
}

/**
 * Fetch XP history (from habit_completions)
 */
export function useXPHistory(userId?: string, days: number = 30) {
  return useQuery({
    queryKey: habitKeys.xpHistory(userId || '', days),
    queryFn: async () => {
      if (!userId) return [];

      const startDate = subDays(new Date(), days).toISOString();

      const { data, error } = await supabase
        .from('habit_completions')
        .select('id, habit_id, completed_at')
        .eq('user_id', userId)
        .gte('completed_at', startDate)
        .order('completed_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });
}

/**
 * Combined analytics hook
 */
export function useHabitAnalytics(userId?: string, days: number = 30) {
  const completions = useHabitCompletions(userId, days);
  const streakHistory = useStreakHistory(userId);
  const xpHistory = useXPHistory(userId, days);

  return {
    completions: completions.data || [],
    streakHistory: streakHistory.data || [],
    xpHistory: xpHistory.data || [],
    isLoading: completions.isLoading || streakHistory.isLoading || xpHistory.isLoading,
    error: completions.error || streakHistory.error || xpHistory.error
  };
}
