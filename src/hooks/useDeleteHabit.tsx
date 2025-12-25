import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { habitsApi } from "@/lib/api/client";
import { toast } from "sonner";

export function useDeleteHabit() {
  const queryClient = useQueryClient();

  const deleteHabit = useMutation({
    mutationFn: async (habitId: string) => {
      // Use Edge Function for reliable deletion with proper error handling
      const { data, error } = await habitsApi.delete(habitId);

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error('Failed to delete habit');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit-feed'] });
      queryClient.invalidateQueries({ queryKey: ['habit-teams'] });
      queryClient.invalidateQueries({ queryKey: ['habit-stats'] });
      queryClient.invalidateQueries({ queryKey: ['habit-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['habit-measurements'] });
      
      console.log('Deleted habit with', data.deletedCount, 'related records');
      toast.success('Привычка успешно удалена');
    },
    onError: (error) => {
      console.error('Error deleting habit:', error);
      toast.error('Не удалось удалить привычку. Попробуйте архивировать.');
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
