import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface AddSupplementToStackParams {
  supplementName: string;
  biomarkerId: string;
  biomarkerName: string;
  expectedChange?: number;
  timeframeWeeks?: number;
  rationale?: string;
}

export function useAddSupplementToStack() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: AddSupplementToStackParams) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Step 1: Find or create supplement product
      const { data: existingProducts } = await supabase
        .from('supplement_products')
        .select('id, name, dosage_amount, dosage_unit')
        .ilike('name', params.supplementName)
        .limit(1);

      let productId: string;
      let dosageInfo = { amount: 0, unit: 'mg' };

      if (existingProducts && existingProducts.length > 0) {
        productId = existingProducts[0].id;
        dosageInfo = {
          amount: existingProducts[0].dosage_amount || 0,
          unit: existingProducts[0].dosage_unit || 'mg'
        };
      } else {
        // Create new product
        const { data: newProduct, error: productError } = await supabase
          .from('supplement_products')
          .insert({
            name: params.supplementName,
            brand: 'Generic',
            dosage_amount: 0,
            dosage_unit: 'mg',
            servings_per_container: 30,
          })
          .select('id')
          .single();

        if (productError) throw productError;
        productId = newProduct.id;
      }

      // Step 2: Check if already in stack
      const { data: existingStack } = await supabase
        .from('user_stack')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .eq('is_active', true)
        .maybeSingle();

      if (existingStack) {
        throw new Error('Эта добавка уже в вашем стеке');
      }

      // Step 3: Create user_stack entry
      const rationale = params.rationale || 
        `Рекомендовано для ${params.biomarkerName}${params.expectedChange ? ` (ожидаемое улучшение: ${params.expectedChange}% за ${params.timeframeWeeks} недель)` : ''}`;

      const { error: stackError } = await supabase
        .from('user_stack')
        .insert({
          user_id: user.id,
          product_id: productId,
          stack_name: params.supplementName,
          source: 'ai_suggested',
          status: 'active',
          is_active: true,
          schedule_type: 'scheduled',
          intake_times: ['morning'],
          daily_dosage: dosageInfo.amount,
          dosage_unit: dosageInfo.unit,
          ai_suggested: true,
          ai_rationale: rationale,
          target_outcome: `Улучшить ${params.biomarkerName}`,
          linked_biomarker_ids: [params.biomarkerId],
        });

      if (stackError) throw stackError;

      // Get the new stack item ID
      const { data: newStackItem } = await supabase
        .from('user_stack')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .eq('is_active', true)
        .single();

      // Step 4: Auto-link biomarkers via edge function
      if (newStackItem?.id) {
        try {
          await supabase.functions.invoke('auto-link-biomarkers', {
            body: { 
              stackItemId: newStackItem.id, 
              supplementName: params.supplementName 
            }
          });
        } catch (e) {
          console.log('Auto-link attempted, continuing...', e);
        }
      }

      // Step 5: Add to supplement library
      const { data: existingLibraryEntry } = await supabase
        .from('user_supplement_library')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (!existingLibraryEntry) {
        await supabase
          .from('user_supplement_library')
          .insert({
            user_id: user.id,
            product_id: productId,
            source: 'ai_suggested',
            scan_count: 0,
          });
      }

      return { productId, supplementName: params.supplementName };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-stack'] });
      queryClient.invalidateQueries({ queryKey: ['manual-supplements-today'] });
      queryClient.invalidateQueries({ queryKey: ['supplement-library'] });
      toast.success(`✅ ${data.supplementName} добавлена в стек`);
    },
    onError: (error: any) => {
      console.error('Failed to add supplement to stack:', error);
      toast.error(error.message || 'Не удалось добавить в стек');
    },
  });

  return {
    addToStack: mutation.mutate,
    isAdding: mutation.isPending,
  };
}
