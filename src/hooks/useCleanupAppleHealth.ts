import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { healthApi } from '@/lib/api';

export function useCleanupAppleHealth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await healthApi.cleanupAppleHealth(userId);

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
