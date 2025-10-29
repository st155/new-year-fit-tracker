import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ForceSyncParams {
  provider: string;
}

export function useForceTerraSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ provider }: ForceSyncParams) => {
      const { data, error } = await supabase.functions.invoke('force-terra-sync', {
        body: { provider },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { provider }) => {
      toast.success(`Синхронизация ${provider} запущена`, {
        description: 'Данные обновятся в течение нескольких минут',
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['terra-diagnostics'] });
    },
    onError: (error: Error) => {
      toast.error('Ошибка синхронизации', {
        description: error.message,
      });
    },
  });
}
