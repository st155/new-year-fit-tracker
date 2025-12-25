import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { terraApi } from '@/lib/api';

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
      const dataTypeLabel = dataType === 'daily' ? 'дневных метрик' : dataType === 'activity' ? 'тренировок' : 'данных тела';
      toast.success(`Синхронизация ${provider} (${dataTypeLabel}) запущена`, {
        description: dataType === 'activity' ? 'Тренировки за последние 14 дней обновятся в течение минуты' : 'Данные обновятся в течение нескольких минут',
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
      toast.error('Ошибка синхронизации', {
        description: error.message,
      });
    },
  });
}

export type { ForceSyncParams };
