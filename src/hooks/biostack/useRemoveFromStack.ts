import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useRemoveFromStack() {
  const queryClient = useQueryClient();

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
      toast({
        title: 'Removed from Stack',
        description: 'Supplement has been removed and end date recorded',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
