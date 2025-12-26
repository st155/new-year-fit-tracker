/**
 * Hook for fetching habit progress data
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { habitKeys } from '../keys';

export interface HabitProgressDay {
  date: string;
  completed: boolean;
  reset: boolean;
  streak_day: number;
}

interface DateRange {
  start: Date;
  end: Date;
}

export function useHabitProgressQuery(habitId: string, dateRange: DateRange) {
  return useQuery({
    queryKey: habitKeys.progress(
      habitId,
      dateRange.start.toISOString(),
      dateRange.end.toISOString()
    ),
    queryFn: async (): Promise<HabitProgressDay[]> => {
      // Fetch completions
      const { data: completions, error: completionsError } = await supabase
        .from('habit_completions')
        .select('*')
        .eq('habit_id', habitId)
        .gte('completed_at', dateRange.start.toISOString())
        .lte('completed_at', dateRange.end.toISOString())
        .order('completed_at', { ascending: true });

      if (completionsError) throw completionsError;

      // Fetch attempts (for duration_counter - to detect resets)
      const { data: attempts } = await supabase
        .from('habit_attempts')
        .select('*')
        .eq('habit_id', habitId)
        .order('start_date', { ascending: true });

      // Build daily array
      const days: HabitProgressDay[] = [];
      const currentDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const completion = completions?.find(c =>
          c.completed_at.startsWith(dateStr)
        );

        // Check for reset on this day
        const reset = attempts?.find(a => a.end_date === dateStr);

        days.push({
          date: dateStr,
          completed: !!completion,
          reset: !!reset,
          streak_day: 0,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Calculate streak values for duration counters
      let currentStreak = 0;
      days.forEach(day => {
        if (day.reset) {
          currentStreak = 0;
        } else if (day.completed) {
          currentStreak++;
        }
        day.streak_day = currentStreak;
      });

      return days;
    },
    enabled: !!habitId && !!dateRange.start && !!dateRange.end,
  });
}
