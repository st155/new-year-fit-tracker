import { useMutation, useQueryClient } from '@tanstack/react-query';
import { terraApi } from '@/lib/api/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface RealtimeSyncResult {
  success: boolean;
  metricsWritten: string[];
  errors?: string[];
  duration: number;
}

export function useTerraRealtimeSync() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('integrations');

  return useMutation({
    mutationFn: async (provider: string = 'WHOOP'): Promise<RealtimeSyncResult> => {
      const { data, error } = await terraApi.realtimeSync(provider);
      if (error) throw error;
      if (!data) throw new Error('No data returned from sync');
      return data;
    },
    onSuccess: (data) => {
      if (data.metricsWritten.length > 0) {
        toast.success(t('terra.dataUpdated'), {
          description: t('terra.metricsUpdatedCount', { count: data.metricsWritten.length, seconds: Math.round(data.duration / 1000) }),
        });
      } else {
        toast.info(t('terra.noNewData'), {
          description: t('terra.dataUpToDate'),
        });
      }
      
      // Invalidate all metric queries
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['latest-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['user-weekly-strain'] });
      queryClient.invalidateQueries({ queryKey: ['smart-widgets-data'] });
      queryClient.invalidateQueries({ queryKey: ['multi-source-widgets'] });
    },
    onError: (error: Error) => {
      toast.error(t('terra.syncError'), {
        description: error.message,
      });
    },
  });
}
