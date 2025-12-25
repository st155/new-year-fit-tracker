import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supplementsApi } from '@/lib/api';

export function useBackfillLibrary() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supplementsApi.backfillLibrary();
      if (error) throw error;
      if (!data?.success) throw new Error('Backfill failed');
      return data;
    },
    onSuccess: (data) => {
      // Invalidate library queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['supplement-library'] });
      queryClient.invalidateQueries({ queryKey: ['supplement-library-stats'] });
      
      if (data.addedCount > 0) {
        toast.success(`✅ Added ${data.addedCount} supplements to library`, {
          description: `${data.skippedCount} already existed`,
        });
      } else {
        toast.info('Library is up to date', {
          description: 'All stack items already in library',
        });
      }
    },
    onError: (error) => {
      console.error('Backfill error:', error);
      toast.error('Failed to backfill library', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}
