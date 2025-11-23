import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TopSupplement {
  id: string;
  stack_name: string;
  effectiveness_score: number;
  linked_biomarker_ids: string[];
  supplement_products: {
    id: string;
    name: string;
    brand: string;
  } | null;
}

export function useTopSupplements(userId?: string) {
  return useQuery({
    queryKey: ['top-supplements', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_stack')
        .select(`
          id,
          stack_name,
          effectiveness_score,
          linked_biomarker_ids,
          supplement_products (
            id,
            name,
            brand
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .gte('effectiveness_score', 8)
        .order('effectiveness_score', { ascending: false })
        .limit(3);

      if (error) {
        console.error('[useTopSupplements] Error:', error);
        throw error;
      }

      return (data || []) as TopSupplement[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
