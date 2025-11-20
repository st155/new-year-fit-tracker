import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useSupplementInventory(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: inventory, isLoading } = useQuery({
    queryKey: ["user-inventory", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_inventory")
        .select(`
          *,
          supplement_products(*)
        `)
        .eq("user_id", userId)
        .order("is_low_alert", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: lowStockAlerts } = useQuery({
    queryKey: ["low-stock-alerts", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_inventory")
        .select(`
          *,
          supplement_products(*)
        `)
        .eq("user_id", userId)
        .eq("is_low_alert", true);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const addToInventory = useMutation({
    mutationFn: async (item: any) => {
      const { data, error } = await supabase
        .from("user_inventory")
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-inventory"] });
      toast({ title: "Added to inventory" });
    },
  });

  const updateInventory = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from("user_inventory")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-inventory"] });
      toast({ title: "Inventory updated" });
    },
  });

  const removeFromInventory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_inventory")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-inventory"] });
      toast({ title: "Removed from inventory" });
    },
  });

  return {
    inventory,
    lowStockAlerts,
    isLoading,
    addToInventory,
    updateInventory,
    removeFromInventory,
  };
}
