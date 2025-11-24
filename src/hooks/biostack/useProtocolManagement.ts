import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useProtocolManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all active protocols with items
  const { data: activeProtocols = [], isLoading } = useQuery({
    queryKey: ['active-protocols', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('protocols')
        .select(`
          *,
          protocol_items (
            *,
            supplement_products (
              name,
              brand,
              form,
              servings_per_container
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Toggle protocol active status
  const toggleProtocolMutation = useMutation({
    mutationFn: async (protocolId: string) => {
      const protocol = activeProtocols.find(p => p.id === protocolId);
      if (!protocol) throw new Error('Protocol not found');

      const { error } = await supabase
        .from('protocols')
        .update({ is_active: !protocol.is_active })
        .eq('id', protocolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-protocols'] });
      toast.success('Protocol status updated');
    },
    onError: (error) => {
      console.error('Error toggling protocol:', error);
      toast.error('Failed to update protocol');
    },
  });

  // Delete protocol
  const deleteProtocolMutation = useMutation({
    mutationFn: async (protocolId: string) => {
      // First get all protocol_item IDs
      const { data: items } = await supabase
        .from('protocol_items')
        .select('id')
        .eq('protocol_id', protocolId);

      const itemIds = items?.map(i => i.id) || [];

      // Delete supplement_logs for these items
      if (itemIds.length > 0) {
        await supabase
          .from('supplement_logs')
          .delete()
          .in('protocol_item_id', itemIds);
      }

      // Then delete protocol_items
      await supabase
        .from('protocol_items')
        .delete()
        .eq('protocol_id', protocolId);

      // Finally delete protocol
      const { error } = await supabase
        .from('protocols')
        .delete()
        .eq('id', protocolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-protocols'] });
      toast.success('Protocol deleted');
    },
    onError: (error) => {
      console.error('Error deleting protocol:', error);
      toast.error('Failed to delete protocol');
    },
  });

  // Log intake for protocol item
  const logProtocolItemMutation = useMutation({
    mutationFn: async ({ 
      protocolItemId, 
      servingsTaken = 1 
    }: { 
      protocolItemId: string; 
      servingsTaken?: number;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('supplement_logs')
        .update({ 
          status: 'taken',
          taken_at: new Date().toISOString(),
          servings_taken: servingsTaken
        })
        .eq('protocol_item_id', protocolItemId)
        .eq('status', 'pending')
        .order('scheduled_time', { ascending: true })
        .limit(1);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-protocols'] });
      toast.success('✅ Intake logged');
    },
    onError: (error) => {
      console.error('Error logging intake:', error);
      toast.error('Failed to log intake');
    },
  });

  return {
    activeProtocols,
    isLoading,
    toggleProtocolMutation,
    deleteProtocolMutation,
    logProtocolItemMutation,
  };
}
