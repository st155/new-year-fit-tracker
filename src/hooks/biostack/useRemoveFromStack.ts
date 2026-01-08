import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function useRemoveFromStack() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('biostack');

  return useMutation({
    mutationFn: async (stackItemId: string) => {
      const { error } = await supabase
        .from('user_stack')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', stackItemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-stack'] });
      queryClient.invalidateQueries({ queryKey: ['supplement-library'] });
      toast.success(t('toast.removedFromStack'));
    },
    onError: (error: Error) => {
      toast.error(t('toast.removeFromStackFailed'), {
        description: error.message,
      });
    },
  });
}
