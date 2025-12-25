import { useMutation } from '@tanstack/react-query';
import { supplementsApi } from '@/lib/api';

export function useSupplementEnrichment() {
  return useMutation({
    mutationFn: async (productId: string) => {
      const { data, error } = await supplementsApi.enrich(productId);

      if (error) throw error;
      return data;
    }
  });
}