import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useSupplementProtocol(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: activeProtocol, isLoading } = useQuery({
    queryKey: ["active-protocol", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("protocols")
        .select(`
          *,
          protocol_items(
            *,
            supplement_products(*)
          )
        `)
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: protocolHistory } = useQuery({
    queryKey: ["protocol-history", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("protocols")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const createProtocol = useMutation({
    mutationFn: async (protocol: any) => {
      const { data, error } = await supabase
        .from("protocols")
        .insert(protocol)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-protocol"] });
      queryClient.invalidateQueries({ queryKey: ["protocol-history"] });
      toast({ title: "Protocol created successfully" });
    },
  });

  const activateProtocol = useMutation({
    mutationFn: async (protocolId: string) => {
      // Deactivate all other protocols first
      if (userId) {
        await supabase
          .from("protocols")
          .update({ is_active: false })
          .eq("user_id", userId)
          .eq("is_active", true);
      }

      // Activate the selected protocol
      const { data, error } = await supabase
        .from("protocols")
        .update({ is_active: true })
        .eq("id", protocolId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-protocol"] });
      toast({ title: "Protocol activated" });
    },
  });

  const deleteProtocol = useMutation({
    mutationFn: async (protocolId: string) => {
      const { error } = await supabase
        .from("protocols")
        .delete()
        .eq("id", protocolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-protocol"] });
      queryClient.invalidateQueries({ queryKey: ["protocol-history"] });
      toast({ title: "Protocol deleted" });
    },
  });

  return {
    activeProtocol,
    protocolHistory,
    isLoading,
    createProtocol,
    activateProtocol,
    deleteProtocol,
  };
}
