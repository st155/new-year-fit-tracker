import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { healthApi } from '@/lib/api';
import i18n from '@/i18n';

export function useCleanupAppleHealth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await healthApi.cleanupAppleHealth(userId);

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(i18n.t('integrations:appleHealth.deletedRecords', { count: data.deletedMetrics }));
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['latest-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['user-weekly-steps'] });
      queryClient.invalidateQueries({ queryKey: ['terra-connections'] });
    },
    onError: (error: any) => {
      toast.error(i18n.t('integrations:appleHealth.deleteError', { error: error.message }));
    },
  });
}
