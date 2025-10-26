import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';

interface RecalculateConfidenceParams {
  user_id: string;
  metric_name?: string;
}

export function useConfidenceRecalculation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ user_id, metric_name }: RecalculateConfidenceParams) => {
      const { data, error } = await supabase.functions.invoke('recalculate-confidence', {
        body: { user_id, metric_name },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(
        `Confidence recalculation started${variables.metric_name ? ` for ${variables.metric_name}` : ''}`
      );
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.metrics.unified(variables.user_id),
      });
    },
    onError: (error) => {
      console.error('Confidence recalculation error:', error);
      toast.error('Failed to start confidence recalculation');
    },
  });

  return {
    recalculate: mutation.mutate,
    recalculateAsync: mutation.mutateAsync,
    isRecalculating: mutation.isPending,
    error: mutation.error,
  };
}
