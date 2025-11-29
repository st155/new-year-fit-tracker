import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useEnrichProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      console.log('[ENRICH-PRODUCT] Starting enrichment for:', productId);
      
      const { data, error } = await supabase.functions.invoke('enrich-supplement-info', {
        body: { productId }
      });

      if (error) {
        console.error('[ENRICH-PRODUCT] Edge function error:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Enrichment failed');
      }

      console.log('[ENRICH-PRODUCT] ✅ Success');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplement-library'] });
      toast.success('✨ Product enriched with AI data');
    },
    onError: (error) => {
      console.error('[ENRICH-PRODUCT] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to enrich product');
    },
  });
}
