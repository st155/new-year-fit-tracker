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

  const createProtocolFromParsed = useMutation({
    mutationFn: async ({ 
      name, 
      description, 
      duration, 
      supplements 
    }: {
      name: string;
      description?: string;
      duration: number;
      supplements: Array<{
        supplement_name: string;
        dosage_amount: number;
        dosage_unit: string;
        intake_times: string[];
        timing_notes?: string;
        form?: string;
        brand?: string;
        photo_url?: string;
      }>;
    }) => {
      if (!userId) throw new Error('Not authenticated');

      // Create protocol
      const { data: protocol, error: protocolError } = await supabase
        .from('protocols')
        .insert({
          user_id: userId,
          name,
          description: description || null,
          duration_days: duration,
          is_active: true,
          ai_generated: true,
          ai_rationale: 'Imported from doctor/family message via AI parser'
        })
        .select()
        .single();

      if (protocolError) throw protocolError;

      // Create protocol items for each supplement
      for (const supp of supplements) {
        // Find or create product
        let productId: string | null = null;

        const { data: existingProduct } = await supabase
          .from('supplement_products')
          .select('id')
          .ilike('name', supp.supplement_name)
          .maybeSingle();

        if (existingProduct) {
          productId = existingProduct.id;
        } else {
          const { data: newProduct, error: productError } = await supabase
            .from('supplement_products')
            .insert({
              name: supp.supplement_name,
              brand: supp.brand || null,
              dosage_amount: supp.dosage_amount,
              dosage_unit: supp.dosage_unit,
              form: supp.form || null,
              product_image_url: supp.photo_url || null,
            })
            .select('id')
            .single();

          if (productError) throw productError;
          productId = newProduct.id;
        }

        // Create protocol item
        const { error: itemError } = await supabase
          .from('protocol_items')
          .insert({
            protocol_id: protocol.id,
            product_id: productId,
            daily_dosage: supp.dosage_amount,
            dosage_unit: supp.dosage_unit,
            intake_times: supp.intake_times,
            notes: supp.timing_notes || null,
          });

        if (itemError) throw itemError;
      }

      return protocol;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-protocol"] });
      queryClient.invalidateQueries({ queryKey: ["protocol-history"] });
      toast({ title: "Protocol created from parsed message" });
    },
  });

  return {
    activeProtocol,
    protocolHistory,
    isLoading,
    createProtocol,
    createProtocolFromParsed,
    activateProtocol,
    deleteProtocol,
  };
}
