import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { terraApi } from '@/lib/api';
import i18n from '@/i18n';

interface ForceSyncParams {
  provider: string;
  dataType?: 'body' | 'daily' | 'activity';
}

export function useForceTerraSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ provider, dataType = 'body' }: ForceSyncParams) => {
      const { data, error } = await terraApi.forceSync(provider, dataType);
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { provider, dataType = 'body' }) => {
      const dataTypeLabel = i18n.t(`integrations:forceSync.dataTypes.${dataType}`);
      const description = dataType === 'activity' 
        ? i18n.t('integrations:forceSync.activityDescription')
        : i18n.t('integrations:forceSync.defaultDescription');
      
      toast.success(i18n.t('integrations:forceSync.started', { provider, dataType: dataTypeLabel }), {
        description,
      });
      
      // Invalidate ALL relevant queries
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['latest-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['terra-diagnostics'] });
      queryClient.invalidateQueries({ queryKey: ['withings-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['withings-debug-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['withings-debug-webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['body-metrics-withings'] });
      
      // Force immediate refetch after webhook processing delay
      setTimeout(() => {
        queryClient.refetchQueries({ 
          queryKey: ['widgets'],
          type: 'active' 
        });
        queryClient.refetchQueries({ 
          queryKey: ['metrics'],
          type: 'active' 
        });
        queryClient.refetchQueries({ 
          queryKey: ['unified-metrics'],
          type: 'active' 
        });
      }, 2000); // 2 секунды для обработки вебхука
    },
    onError: (error: Error) => {
      toast.error(i18n.t('integrations:forceSync.error'), {
        description: error.message,
      });
    },
  });
}

export type { ForceSyncParams };
