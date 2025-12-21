import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DoctorActionItem, parseScheduleFormat } from './useDoctorActionItems';

interface AddToLibraryResult {
  productId: string;
  libraryEntryId: string;
  name: string;
}

export function useAddSupplementToLibrary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      item,
      addToStack = false,
    }: {
      item: DoctorActionItem;
      addToStack?: boolean;
    }): Promise<AddToLibraryResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Find or create supplement product
      let productId: string;
      
      // Try to find existing product by name
      const { data: existingProducts } = await supabase
        .from('supplement_products')
        .select('id')
        .ilike('name', `%${item.name}%`)
        .limit(1);

      if (existingProducts && existingProducts.length > 0) {
        productId = existingProducts[0].id;
      } else {
        // Create new product with required brand field
        const { data: newProduct, error: productError } = await supabase
          .from('supplement_products')
          .insert({
            brand: 'Unknown',
            name: item.name,
            description: item.details || item.rationale || null,
            dosage_amount: item.dosage ? parseFloat(item.dosage.replace(/[^\d.]/g, '')) || null : null,
            dosage_unit: item.dosage ? item.dosage.replace(/[\d.\s]/g, '').trim() || 'mg' : null,
          } as any)
          .select('id')
          .single();

        if (productError) throw productError;
        productId = newProduct.id;
      }

      // 2. Add to user_supplement_library with protocol tag
      const tags = [
        item.protocol_tag,
        item.doctor_name ? `Dr. ${item.doctor_name}` : null,
      ].filter(Boolean) as string[];

      // Check if already in library
      const { data: existingEntry } = await supabase
        .from('user_supplement_library')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      let libraryEntryId: string;

      if (existingEntry) {
        // Update existing entry with new tags
        const { error: updateError } = await supabase
          .from('user_supplement_library')
          .update({ 
            tags,
            source: 'protocol',
            notes: item.rationale || null,
          })
          .eq('id', existingEntry.id);

        if (updateError) throw updateError;
        libraryEntryId = existingEntry.id;
      } else {
        // Insert new entry
        const { data: newEntry, error: insertError } = await supabase
          .from('user_supplement_library')
          .insert({
            user_id: user.id,
            product_id: productId,
            source: 'protocol',
            tags,
            notes: item.rationale || null,
            scan_count: 1,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        libraryEntryId = newEntry.id;
      }

      // 3. Optionally add to user_stack
      if (addToStack) {
        const schedule = item.schedule ? parseScheduleFormat(item.schedule) : null;
        
        // Check if already in stack
        const { data: existingStack } = await supabase
          .from('user_stack')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', productId)
          .maybeSingle();

        if (!existingStack) {
          const { error: stackError } = await supabase
            .from('user_stack')
            .insert({
              user_id: user.id,
              product_id: productId,
              intake_times: schedule?.intakeTimes || ['morning'],
              notes: `${item.dosage || ''} ${item.frequency || ''} - ${item.protocol_tag || 'Протокол от доктора'}`.trim(),
              is_active: true,
            } as any);

          if (stackError) {
            console.error('Failed to add to stack:', stackError);
            // Don't throw - library add succeeded
          }
        }
      }

      // 4. Update action item status
      await supabase
        .from('doctor_action_items')
        .update({ 
          status: 'added_to_library',
          added_to_library_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      return {
        productId,
        libraryEntryId,
        name: item.name,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['supplement-library'] });
      queryClient.invalidateQueries({ queryKey: ['user-stack'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-action-items'] });
      toast.success(`${result.name} добавлен в библиотеку`);
    },
    onError: (error) => {
      console.error('Failed to add supplement to library:', error);
      toast.error('Не удалось добавить в библиотеку');
    },
  });
}

export function useAddProtocolToLibrary() {
  const addSupplement = useAddSupplementToLibrary();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      items,
      addToStack = false,
    }: {
      items: DoctorActionItem[];
      addToStack?: boolean;
    }) => {
      const supplements = items.filter(item => item.action_type === 'supplement');
      
      if (supplements.length === 0) {
        throw new Error('No supplements in protocol');
      }

      const results: AddToLibraryResult[] = [];
      
      for (const item of supplements) {
        try {
          const result = await addSupplement.mutateAsync({ item, addToStack });
          results.push(result);
        } catch (error) {
          console.error(`Failed to add ${item.name}:`, error);
          // Continue with others
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['supplement-library'] });
      queryClient.invalidateQueries({ queryKey: ['user-stack'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-action-items'] });
      toast.success(`Добавлено ${results.length} добавок в библиотеку`);
    },
    onError: (error) => {
      console.error('Failed to add protocol to library:', error);
      toast.error('Не удалось добавить протокол');
    },
  });
}
