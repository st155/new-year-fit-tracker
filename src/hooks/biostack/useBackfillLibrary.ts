import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supplementsApi } from '@/lib/api';
import { useTranslation } from 'react-i18next';

export function useBackfillLibrary() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('biostack');
  
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
        toast.success(t('toast.addedToLibrary', { count: data.addedCount }), {
          description: t('toast.alreadyExisted', { count: data.skippedCount }),
        });
      } else {
        toast.info(t('toast.libraryUpToDate'), {
          description: t('toast.allInLibrary'),
        });
      }
    },
    onError: (error) => {
      console.error('Backfill error:', error);
      toast.error(t('toast.backfillFailed'), {
        description: error instanceof Error ? error.message : t('errors.unknownError'),
      });
    },
  });
}
