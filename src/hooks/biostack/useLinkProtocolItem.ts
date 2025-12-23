import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LinkProtocolItemParams {
  protocolItemId: string;
  productId: string | null; // null to unlink
}

export function useLinkProtocolItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ protocolItemId, productId }: LinkProtocolItemParams) => {
      const { error } = await supabase
        .from('protocol_items')
        .update({ linked_product_id: productId })
        .eq('id', protocolItemId);

      if (error) throw error;
    },
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['protocols'] });
      queryClient.invalidateQueries({ queryKey: ['todays-supplements'] });
      toast.success(productId ? 'Продукт связан с протоколом' : 'Связь удалена');
    },
    onError: (error) => {
      console.error('Link protocol item error:', error);
      toast.error('Не удалось связать продукт');
    }
  });
}
