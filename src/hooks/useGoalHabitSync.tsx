import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Hook for auto-logging measurements when habits are completed
 * Monitors habit_completions and automatically creates measurements for linked goals
 */
export function useGoalHabitSync(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    // Subscribe to habit completions
    const channel = supabase
      .channel('habit-goal-sync')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'habit_completions',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const completion = payload.new;
          
          // Fetch habit details to check for linked_goal_id
          const { data: habit } = await supabase
            .from('habits')
            .select('linked_goal_id, name')
            .eq('id', completion.habit_id)
            .single();

          if (!habit?.linked_goal_id) return;

          // Fetch goal details
          const { data: goal } = await supabase
            .from('goals')
            .select('goal_name, target_unit, target_value')
            .eq('id', habit.linked_goal_id)
            .single();

          if (!goal) return;

          // Auto-log measurement (increment by 1 for habit completion)
          const { error } = await supabase
            .from('measurements')
            .insert({
              user_id: userId,
              goal_id: habit.linked_goal_id,
              value: 1,
              unit: goal.target_unit,
              measurement_date: new Date().toISOString().split('T')[0],
              source: 'habit_auto_log',
            });

          if (error) {
            console.error('Error auto-logging measurement:', error);
            return;
          }

          // Refresh queries
          queryClient.invalidateQueries({ queryKey: ['goals', userId] });
          queryClient.invalidateQueries({ queryKey: ['challenge-goals', userId] });

          toast.success(`✅ ${habit.name} → ${goal.goal_name}`, {
            description: 'Прогресс автоматически записан',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
