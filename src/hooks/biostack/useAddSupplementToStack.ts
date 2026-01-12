import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supplementsApi } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

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
  const { t } = useTranslation('biostack');

  const mutation = useMutation({
    mutationFn: async (params: AddSupplementToStackParams) => {
      if (!user?.id) throw new Error(t('errors.notAuthenticated'));

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
        throw new Error(t('toast.alreadyInStack'));
      }

      // Step 3: Create user_stack entry
      let rationale: string;
      if (params.rationale) {
        rationale = params.rationale;
      } else if (params.expectedChange && params.timeframeWeeks) {
        rationale = i18n.t('biostack:aiGenerator.rationaleWithChange', { 
          biomarker: params.biomarkerName, 
          percent: params.expectedChange, 
          weeks: params.timeframeWeeks 
        });
      } else {
        rationale = i18n.t('biostack:aiGenerator.rationaleSimple', { biomarker: params.biomarkerName });
      }

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
          target_outcome: i18n.t('biostack:aiGenerator.targetOutcome', { biomarker: params.biomarkerName }),
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
          await supplementsApi.autoLinkBiomarkers(newStackItem.id, params.supplementName);
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
      toast.success(t('toast.addedToStack', { name: data.supplementName }));
    },
    onError: (error: any) => {
      console.error('Failed to add supplement to stack:', error);
      toast.error(error.message || t('toast.addToStackFailed'));
    },
  });

  return {
    addToStack: mutation.mutate,
    isAdding: mutation.isPending,
  };
}
