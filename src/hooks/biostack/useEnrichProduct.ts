import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supplementsApi } from '@/lib/api';

export function useEnrichProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      console.log('[ENRICH-PRODUCT] Starting enrichment for:', productId);
      
      const { data, error } = await supplementsApi.enrich(productId);

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
