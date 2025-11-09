import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useDeleteHabit() {
  const queryClient = useQueryClient();

  const deleteHabit = useMutation({
    mutationFn: async (habitId: string) => {
      // First, delete all related data in the correct order
      // 1. Delete feed events
      await supabase.from('habit_feed_events' as any).delete().eq('habit_id', habitId);
      
      // 2. Delete completions
      await supabase.from('habit_completions').delete().eq('habit_id', habitId);
      
      // 3. Delete measurements
      await supabase.from('habit_measurements').delete().eq('habit_id', habitId);
      
      // 4. Delete attempt history
      await supabase.from('habit_attempts').delete().eq('habit_id', habitId);
      
      // 5. Delete stats
      await supabase.from('habit_stats').delete().eq('habit_id', habitId);
      
      // 6. Delete streak history
      await supabase.from('habit_streak_history').delete().eq('habit_id', habitId);

      // Finally, delete the habit itself
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', habitId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit-feed'] });
      queryClient.invalidateQueries({ queryKey: ['habit-teams'] });
      queryClient.invalidateQueries({ queryKey: ['habit-stats'] });
      toast.success('Привычка успешно удалена');
    },
    onError: (error) => {
      console.error('Error deleting habit:', error);
      toast.error('Не удалось удалить привычку');
    },
  });

  const archiveHabit = useMutation({
    mutationFn: async (habitId: string) => {
      const { error } = await supabase
        .from('habits')
        .update({ is_active: false })
        .eq('id', habitId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit-feed'] });
      toast.success('Привычка архивирована');
    },
    onError: (error) => {
      console.error('Error archiving habit:', error);
      toast.error('Не удалось архивировать привычку');
    },
  });

  return {
    deleteHabit: deleteHabit.mutate,
    isDeleting: deleteHabit.isPending,
    archiveHabit: archiveHabit.mutate,
    isArchiving: archiveHabit.isPending,
  };
}
