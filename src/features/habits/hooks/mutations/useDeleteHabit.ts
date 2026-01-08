/**
 * Hook for deleting and archiving habits
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { habitsApi } from '@/lib/api/client';
import { toast } from 'sonner';
import { habitKeys } from '../keys';
import { useTranslation } from 'react-i18next';

export function useDeleteHabit() {
  const { t } = useTranslation('habits');
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
      queryClient.invalidateQueries({ queryKey: habitKeys.all });
      queryClient.invalidateQueries({ queryKey: ['habit-feed'] });
      queryClient.invalidateQueries({ queryKey: ['habit-teams'] });
      queryClient.invalidateQueries({ queryKey: ['habit-stats'] });

      console.log('Deleted habit with', data.deletedCount, 'related records');
      toast.success(t('toast.habitDeleted'));
    },
    onError: (error) => {
      console.error('Error deleting habit:', error);
      toast.error(t('toast.failedDeleteHabit'));
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
      queryClient.invalidateQueries({ queryKey: habitKeys.all });
      queryClient.invalidateQueries({ queryKey: ['habit-feed'] });
      toast.success(t('toast.habitArchived'));
    },
    onError: (error) => {
      console.error('Error archiving habit:', error);
      toast.error(t('toast.failedArchiveHabit'));
    },
  });

  return {
    deleteHabit: deleteHabit.mutate,
    isDeleting: deleteHabit.isPending,
    archiveHabit: archiveHabit.mutate,
    isArchiving: archiveHabit.isPending,
  };
}
