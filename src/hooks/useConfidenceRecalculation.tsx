import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { healthApi } from '@/lib/api';
import i18n from '@/i18n';

interface RecalculateConfidenceParams {
  user_id: string;
  metric_name?: string;
}

export function useConfidenceRecalculation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ user_id, metric_name }: RecalculateConfidenceParams) => {
      const { data, error } = await healthApi.recalculateConfidence(user_id, metric_name);

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      const message = variables.metric_name 
        ? i18n.t('common:dataQuality.recalculationStartedFor', { metric: variables.metric_name })
        : i18n.t('common:dataQuality.recalculationStarted');
      toast.success(message);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.metrics.unified(variables.user_id),
      });
    },
    onError: (error) => {
      console.error('Confidence recalculation error:', error);
      toast.error(i18n.t('common:dataQuality.recalculationFailed'));
    },
  });

  return {
    recalculate: mutation.mutate,
    recalculateAsync: mutation.mutateAsync,
    isRecalculating: mutation.isPending,
    error: mutation.error,
  };
}
