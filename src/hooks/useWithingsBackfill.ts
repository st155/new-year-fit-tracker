import { useMutation, useQueryClient } from '@tanstack/react-query';
import { terraApi } from '@/lib/api/client';
import { toast } from 'sonner';

interface BackfillParams {
  daysBack?: number;
}

export function useWithingsBackfill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ daysBack = 30 }: BackfillParams) => {
      const { data, error } = await terraApi.withingsBackfill(daysBack);

      if (error) throw error;
      return data;
    },
    onSuccess: (data, { daysBack = 30 }) => {
      toast.success('Данные Withings загружены', {
        description: `Загружено ${data?.metricsInserted || 0} метрик за последние ${daysBack} дней`,
      });
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['latest-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['withings-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['withings-debug-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['withings-debug-webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['body-metrics-withings'] });
      
      // Force immediate refetch
      setTimeout(() => {
        queryClient.refetchQueries({ 
          queryKey: ['widgets'],
          type: 'active' 
        });
        queryClient.refetchQueries({ 
          queryKey: ['metrics'],
          type: 'active' 
        });
      }, 1000);
    },
    onError: (error: Error) => {
      toast.error('Ошибка загрузки данных', {
        description: error.message,
      });
    },
  });
}
