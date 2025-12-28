import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { supplementsApi } from '@/lib/api';
import { useTranslation } from 'react-i18next';

interface Deficiency {
  biomarker_id: string;
  name: string;
  canonical_name: string;
  category: string;
  current_value: number;
  unit: string;
  ref_min: number;
  ref_max: number;
  status: 'low' | 'suboptimal';
  test_date: string;
}

interface Recommendation {
  supplement_name: string;
  dosage_amount: number;
  dosage_unit: string;
  form: string;
  intake_times: string[];
  target_biomarker: string;
  expected_improvement: number;
  timeframe_weeks: number;
  rationale: string;
  synergies: string[];
}

interface AnalysisResponse {
  success: boolean;
  no_deficiencies?: boolean;
  error?: string;
  message?: string;
  analysis?: {
    total_biomarkers: number;
    deficiencies_count: number;
    recommendations_count: number;
    analysis_date: string;
    timeframe: string;
  };
  deficiencies?: Deficiency[];
  recommendations?: Recommendation[];
}

export function useGenerateRecommendations() {
  const { toast } = useToast();
  const { t } = useTranslation('supplements');

  return useMutation({
    mutationFn: async (): Promise<AnalysisResponse> => {
      const { data, error } = await supplementsApi.generateStack();

      if (error) throw error;
      
      // Cast to unknown first to handle flexible API response
      const response = data as unknown as AnalysisResponse;
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to generate recommendations');
      }

      return response;
    },
    onError: (error: any) => {
      toast({
        title: t('aiGenerator.analysisError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAddRecommendationsToStack() {
  const { toast } = useToast();
  const { t } = useTranslation('supplements');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      recommendations, 
      deficiencies 
    }: { 
      recommendations: Recommendation[];
      deficiencies: Deficiency[];
    }) => {
      // Import validation
      const { autoCorrectIntakeTimes } = await import('@/lib/supplement-validation');
      const results = [];

      for (const rec of recommendations) {
        try {
          // Find or create supplement product
          let productId: string | null = null;

          // Search for existing product
          const { data: existingProducts } = await supabase
            .from('supplement_products')
            .select('id')
            .ilike('name', `%${rec.supplement_name}%`)
            .limit(1);

          if (existingProducts && existingProducts.length > 0) {
            productId = existingProducts[0].id;
          } else {
            // Create new product
            const { data: newProduct, error: productError } = await supabase
              .from('supplement_products')
              .insert({
                name: rec.supplement_name,
                brand: 'Generic',
                form: rec.form,
                dosage_amount: rec.dosage_amount,
                dosage_unit: rec.dosage_unit,
                servings_per_container: 60,
              })
              .select()
              .single();

            if (productError) throw productError;
            productId = newProduct.id;
          }

          // Find biomarker_id from canonical_name
          const deficiency = deficiencies.find(
            d => d.canonical_name.toLowerCase() === rec.target_biomarker.toLowerCase()
          );

          const linkedBiomarkerIds = deficiency ? [deficiency.biomarker_id] : [];

          // Auto-correct intake times for critical supplements (Melatonin, etc.)
          const corrected = autoCorrectIntakeTimes(rec.supplement_name, rec.intake_times);
          const finalIntakeTimes = corrected.intakeTimes;
          
          if (corrected.warning) {
            console.log('[AI-Validation]', corrected.warning);
            toast({
              title: t('aiGenerator.intakeTimeCorrected'),
              description: corrected.warning,
            });
          }

          // Get authenticated user
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) throw new Error('Not authenticated');

          // Insert into user_stack
          const { error: stackError } = await supabase
            .from('user_stack')
            .insert({
              user_id: currentUser.id,
              product_id: productId,
              stack_name: rec.supplement_name,
              intake_times: finalIntakeTimes,
              schedule_type: 'manual',
              is_active: true,
              ai_suggested: true,
              ai_rationale: rec.rationale,
              linked_biomarker_ids: linkedBiomarkerIds,
              target_outcome: `Improve ${rec.target_biomarker} by ${rec.expected_improvement}% in ${rec.timeframe_weeks} weeks`,
            });

          if (stackError) throw stackError;

          results.push({ success: true, name: rec.supplement_name });
        } catch (error: any) {
          console.error(`Failed to add ${rec.supplement_name}:`, error);
          results.push({ success: false, name: rec.supplement_name, error: error.message });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      queryClient.invalidateQueries({ queryKey: ['user-stack'] });

      if (successCount > 0) {
        toast({
          title: t('aiGenerator.addedToStack'),
          description: failedCount > 0 
            ? t('aiGenerator.addedWithErrors', { success: successCount, failed: failedCount })
            : t('aiGenerator.addedCount', { success: successCount }),
        });
      }

      if (failedCount > 0 && successCount === 0) {
        toast({
          title: t('aiGenerator.addError'),
          description: t('aiGenerator.failedToAdd', { count: failedCount }),
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: t('aiGenerator.addError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
