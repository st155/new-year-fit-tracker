import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSupplementEnrichment() {
  return useMutation({
    mutationFn: async (productId: string) => {
      const { data, error } = await supabase.functions.invoke('enrich-supplement-info', {
        body: { productId }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Enrichment failed');

      return data;
    }
  });
}