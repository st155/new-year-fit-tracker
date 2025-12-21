import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RealtimeSyncResult {
  success: boolean;
  metricsWritten: string[];
  errors?: string[];
  duration: number;
}

export function useTerraRealtimeSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (provider: string = 'WHOOP'): Promise<RealtimeSyncResult> => {
      const { data, error } = await supabase.functions.invoke('sync-terra-realtime', {
        body: { provider },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.metricsWritten.length > 0) {
        toast.success('Данные обновлены', {
          description: `Обновлено ${data.metricsWritten.length} метрик за ${Math.round(data.duration / 1000)}с`,
        });
      } else {
        toast.info('Нет новых данных', {
          description: 'Все данные актуальны',
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
      toast.error('Ошибка синхронизации', {
        description: error.message,
      });
    },
  });
}
