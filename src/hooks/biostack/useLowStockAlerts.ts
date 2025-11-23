import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LowStockItem {
  id: string;
  stack_name: string;
  servings_remaining: number;
  supplement_products: {
    name: string;
    brand: string;
  } | null;
}

const LOW_STOCK_THRESHOLD = 10;

export function useLowStockAlerts(userId?: string) {
  return useQuery({
    queryKey: ['low-stock-alerts', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Get active stack items with product info
      const { data: stackItems, error: stackError } = await supabase
        .from('user_stack')
        .select(`
          id,
          stack_name,
          product_id,
          supplement_products (
            name,
            brand,
            servings_per_container
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (stackError) throw stackError;
      if (!stackItems || stackItems.length === 0) return [];

      // Count intake logs for each stack item
      const lowStockItems: LowStockItem[] = [];

      for (const item of stackItems) {
        const { count, error: countError } = await supabase
          .from('intake_logs')
          .select('*', { count: 'exact', head: true })
          .eq('stack_item_id', item.id);

        if (countError) {
          console.error('[useLowStockAlerts] Count error:', countError);
          continue;
        }

        const servingsPerContainer = item.supplement_products?.servings_per_container || 0;
        const servingsRemaining = servingsPerContainer - (count || 0);

        if (servingsRemaining < LOW_STOCK_THRESHOLD && servingsRemaining > 0) {
          lowStockItems.push({
            id: item.id,
            stack_name: item.stack_name,
            servings_remaining: servingsRemaining,
            supplement_products: item.supplement_products
          });
        }
      }

      return lowStockItems;
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
}
