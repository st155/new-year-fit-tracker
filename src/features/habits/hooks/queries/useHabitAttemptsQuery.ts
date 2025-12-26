/**
 * Hook for fetching habit attempts with reset functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { habitKeys } from '../keys';

export interface HabitAttempt {
  id: string;
  habit_id: string;
  user_id: string;
  start_date: string;
  end_date?: string;
  days_lasted?: number;
  reset_reason?: string;
  created_at: string;
}

export function useHabitAttemptsQuery(habitId: string, userId?: string) {
  const queryClient = useQueryClient();

  const { data: attempts, isLoading } = useQuery({
    queryKey: habitKeys.attempts(habitId),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('habit_attempts')
        .select('*')
        .eq('habit_id', habitId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as HabitAttempt[];
    },
    enabled: !!userId && !!habitId,
  });

  const currentAttempt = attempts?.find(a => !a.end_date);
  const longestStreak = attempts?.reduce((max, a) =>
    Math.max(max, a.days_lasted || 0), 0) || 0;

  const resetHabit = useMutation({
    mutationFn: async ({ reason }: { reason?: string }) => {
      if (!userId) throw new Error('User not authenticated');

      const today = new Date().toISOString().split('T')[0];

      if (!currentAttempt) {
        console.warn('No active attempt found, creating initial attempt first');

        const { data: newAttempt, error: createError } = await supabase
          .from('habit_attempts')
          .insert({
            habit_id: habitId,
            user_id: userId,
            start_date: today,
          })
          .select()
          .single();

        if (createError) throw createError;

        await supabase
          .from('habits')
          .update({ start_date: today })
          .eq('id', habitId);

        return newAttempt;
      }

      const daysLasted = Math.floor(
        (new Date(today).getTime() - new Date(currentAttempt.start_date).getTime())
        / (1000 * 60 * 60 * 24)
      );

      // End current attempt
      const { error: updateError } = await supabase
        .from('habit_attempts')
        .update({
          end_date: today,
          days_lasted: daysLasted,
          reset_reason: reason,
        })
        .eq('id', currentAttempt.id);

      if (updateError) throw updateError;

      // Start new attempt
      const { data, error: insertError } = await supabase
        .from('habit_attempts')
        .insert({
          habit_id: habitId,
          user_id: userId,
          start_date: today,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update habit table
      const { error: habitUpdateError } = await supabase
        .from('habits')
        .update({ start_date: today })
        .eq('id', habitId);

      if (habitUpdateError) throw habitUpdateError;

      return data;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: habitKeys.all });
      queryClient.invalidateQueries({ queryKey: habitKeys.attempts(habitId) });
      queryClient.invalidateQueries({ queryKey: ['habit-stats'] });
      queryClient.invalidateQueries({ queryKey: ['habit-measurements'] });
      toast.success('Привычка сброшена! Начинаем заново 💪');
    },
    onError: (error) => {
      console.error('Error resetting habit:', error);
      toast.error('Failed to reset habit');
    },
  });

  return {
    attempts,
    currentAttempt,
    longestStreak,
    isLoading,
    resetHabit: resetHabit.mutate,
    isResetting: resetHabit.isPending,
  };
}
