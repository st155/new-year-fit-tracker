import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useCleanupAppleHealth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('cleanup-apple-health', {
        body: { userId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Удалено ${data.deletedMetrics} записей Apple Health`);
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['latest-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['user-weekly-steps'] });
      queryClient.invalidateQueries({ queryKey: ['terra-connections'] });
    },
    onError: (error: any) => {
      toast.error(`Ошибка при удалении данных: ${error.message}`);
    },
  });
}
