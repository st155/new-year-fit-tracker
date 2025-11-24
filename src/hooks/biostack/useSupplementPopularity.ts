import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSupplementPopularity(productId?: string) {
  return useQuery({
    queryKey: ['supplement-popularity', productId],
    queryFn: async () => {
      if (!productId) return { userCount: 0, avgEffectiveness: 0 };

      // Count users taking this supplement
      const { count, error: countError } = await supabase
        .from('user_stack')
        .select('user_id', { count: 'exact', head: true })
        .eq('product_id', productId)
        .eq('is_active', true);

      if (countError) throw countError;

      // Calculate average effectiveness
      const { data: effectivenessData, error: effectivenessError } = await supabase
        .from('user_stack')
        .select('effectiveness_score')
        .eq('product_id', productId)
        .eq('is_active', true)
        .not('effectiveness_score', 'is', null);

      if (effectivenessError) throw effectivenessError;

      const avgEffectiveness = effectivenessData.length > 0
        ? effectivenessData.reduce((sum, item) => sum + (item.effectiveness_score || 0), 0) / effectivenessData.length
        : 0;

      return {
        userCount: count || 0,
        avgEffectiveness: Math.round(avgEffectiveness * 10) / 10,
      };
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}