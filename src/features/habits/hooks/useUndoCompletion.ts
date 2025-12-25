/**
 * Hook for undoing habit completions
 * Extracted from useHabitCompletion.tsx
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { habitQueryKeys } from './useHabitsQuery';

export function useUndoCompletion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const undoMutation = useMutation<boolean, Error, string>({
    mutationFn: async (habitId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get the latest completion
      const { data: lastCompletion, error: fetchError } = await supabase
        .from('habit_completions')
        .select('*')
        .eq('habit_id', habitId)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !lastCompletion) return false;

      // Delete the completion
      const { error: deleteError } = await supabase
        .from('habit_completions')
        .delete()
        .eq('id', lastCompletion.id);

      if (deleteError) throw deleteError;

      return true;
    },
    onSuccess: (success) => {
      if (success) {
        toast({
          title: 'Отменено',
          description: 'Выполнение привычки отменено',
        });
        queryClient.invalidateQueries({ queryKey: habitQueryKeys.all });
      }
    },
    onError: (error) => {
      console.error('[useUndoCompletion] Error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось отменить выполнение',
        variant: 'destructive',
      });
    },
  });

  return {
    undoCompletion: undoMutation.mutateAsync,
    isUndoing: undoMutation.isPending,
  };
}
