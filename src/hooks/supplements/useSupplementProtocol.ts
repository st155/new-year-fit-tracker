import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useSupplementProtocol(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Helper: normalize supplement name for better matching
  const normalizeName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove special chars
      .replace(/vitamin/g, 'vit')
      .replace(/magnesium/g, 'mg')
      .trim();
  };

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

  const deactivateProtocol = useMutation({
    mutationFn: async (protocolId: string) => {
      const { data, error } = await supabase
        .from("protocols")
        .update({ is_active: false })
        .eq("id", protocolId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-protocol"] });
      toast({ title: "Protocol deactivated" });
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
      supplements,
      onProgress
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
      onProgress?: (current: number, total: number, step: string) => void;
    }) => {
      if (!userId) throw new Error('Not authenticated');

      // Create protocol
      console.log('🔵 [Protocol] Creating protocol:', { name, duration, userId, supplementsCount: supplements.length });
      
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

      if (protocolError) {
        console.error('❌ [Protocol] Failed to create protocol:', protocolError);
        throw protocolError;
      }
      
      console.log('✅ [Protocol] Protocol created:', protocol.id);
      onProgress?.(0, supplements.length, 'Обработка добавок...');

      // Create protocol items for each supplement
      for (let i = 0; i < supplements.length; i++) {
        const supp = supplements[i];
        console.log(`🔵 [Supplement ${i+1}/${supplements.length}] Processing:`, supp.supplement_name);
        
        onProgress?.(i, supplements.length, `Обработка ${supp.supplement_name}...`);
        
        // Smart duplicate search with normalization
        let productId: string | null = null;
        const normalizedSearchName = normalizeName(supp.supplement_name);

        // 1. Try exact match: name + brand
        if (supp.brand) {
          const { data: exactMatch } = await supabase
            .from('supplement_products')
            .select('id, name, brand')
            .ilike('name', supp.supplement_name)
            .ilike('brand', supp.brand)
            .maybeSingle();
          
          if (exactMatch) {
            productId = exactMatch.id;
            console.log(`✅ [Supplement ${i+1}] Found exact match (name+brand):`, productId);
          }
        }

        // 2. Try normalized name match (handles variations like "Vitamin D3" vs "Vitamin D-3")
        if (!productId) {
          const { data: potentialMatches } = await supabase
            .from('supplement_products')
            .select('id, name, brand')
            .ilike('name', `%${supp.supplement_name}%`);

          const normalizedMatch = potentialMatches?.find(p => 
            normalizeName(p.name) === normalizedSearchName &&
            (!supp.brand || !p.brand || p.brand.toLowerCase() === supp.brand.toLowerCase())
          );

          if (normalizedMatch) {
            productId = normalizedMatch.id;
            console.log(`✅ [Supplement ${i+1}] Found normalized match:`, productId);
          }
        }

        // 3. Create new product if not found
        if (!productId) {
          console.log(`🔵 [Supplement ${i+1}] Creating new product...`);
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

          if (productError) {
            console.error(`❌ [Supplement ${i+1}] Product creation failed:`, productError);
            throw productError;
          }
          productId = newProduct.id;
          console.log(`✅ [Supplement ${i+1}] Product created:`, productId);
        }

        // Create protocol item
        console.log(`🔵 [Supplement ${i+1}] Creating protocol item...`);
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

        if (itemError) {
          console.error(`❌ [Supplement ${i+1}] Protocol item creation failed:`, itemError);
          throw itemError;
        }
        console.log(`✅ [Supplement ${i+1}] Protocol item created successfully`);
      }

      console.log('🎉 [Protocol] All supplements processed successfully');
      onProgress?.(supplements.length, supplements.length, 'Завершение...');

      return protocol;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-protocol"] });
      queryClient.invalidateQueries({ queryKey: ["protocol-history"] });
    },
  });

  return {
    activeProtocol,
    protocolHistory,
    isLoading,
    createProtocol,
    createProtocolFromParsed,
    activateProtocol,
    deactivateProtocol,
    deleteProtocol,
  };
}
