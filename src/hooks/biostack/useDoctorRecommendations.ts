import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DoctorRecommendation {
  id: string;
  user_id: string;
  document_id: string;
  supplement_name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  rationale?: string;
  confidence_score: number;
  doctor_name?: string;
  prescription_date?: string;
  status: 'pending' | 'added_to_stack' | 'dismissed';
  created_at: string;
}

function parseFrequencyToIntakeTimes(frequency?: string): string[] {
  if (!frequency) return ['morning'];
  
  const lower = frequency.toLowerCase();
  if (lower.includes('three times') || lower.includes('3x') || lower.includes('thrice')) {
    return ['morning', 'afternoon', 'evening'];
  }
  if (lower.includes('twice') || lower.includes('2x') || lower.includes('bid')) {
    return ['morning', 'evening'];
  }
  if (lower.includes('before bed') || lower.includes('night') || lower.includes('bedtime')) {
    return ['night'];
  }
  if (lower.includes('once') || lower.includes('daily') || lower.includes('qd')) {
    return ['morning'];
  }
  return ['morning'];
}

function calculateEndDate(duration?: string): string | null {
  if (!duration) return null;
  
  const match = duration.match(/(\d+)\s*(day|week|month)/i);
  if (!match) return null;
  
  const amount = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  const date = new Date();
  if (unit.includes('day')) {
    date.setDate(date.getDate() + amount);
  } else if (unit.includes('week')) {
    date.setDate(date.getDate() + (amount * 7));
  } else if (unit.includes('month')) {
    date.setMonth(date.getMonth() + amount);
  }
  
  return date.toISOString();
}

function parseDosage(dosage?: string): { amount: number; unit: string } {
  if (!dosage) return { amount: 1, unit: 'serving' };
  
  const match = dosage.match(/(\d+)\s*([a-zA-Z]+)/i);
  if (match) {
    return {
      amount: parseInt(match[1]),
      unit: match[2].toLowerCase()
    };
  }
  
  return { amount: 1, unit: 'serving' };
}

export function useDoctorRecommendations(documentId?: string) {
  const queryClient = useQueryClient();

  const recommendationsQuery = useQuery({
    queryKey: ['doctor-recommendations', documentId],
    queryFn: async () => {
      if (!documentId) return [];

      const { data, error } = await supabase
        .from('doctor_recommendations')
        .select('*')
        .eq('document_id', documentId)
        .eq('status', 'pending')
        .order('confidence_score', { ascending: false });

      if (error) throw error;
      return data as DoctorRecommendation[];
    },
    enabled: !!documentId,
  });

  const addToStackMutation = useMutation({
    mutationFn: async (recommendation: DoctorRecommendation) => {
      // Step 1: Find or create supplement product
      const { data: existingProducts } = await supabase
        .from('supplement_products')
        .select('id')
        .ilike('name', recommendation.supplement_name)
        .limit(1);

      let productId: string;

      if (existingProducts && existingProducts.length > 0) {
        productId = existingProducts[0].id;
      } else {
        // Create new product
        const dosageParsed = parseDosage(recommendation.dosage);
        const { data: newProduct, error: productError } = await supabase
          .from('supplement_products')
          .insert({
            name: recommendation.supplement_name,
            brand: 'Doctor Prescribed',
            dosage_amount: dosageParsed.amount,
            dosage_unit: dosageParsed.unit,
            servings_per_container: 30,
          })
          .select('id')
          .single();

        if (productError) throw productError;
        productId = newProduct.id;
      }

      // Step 2: Create user_stack entry
      const intakeTimes = parseFrequencyToIntakeTimes(recommendation.frequency);
      const plannedEndDate = calculateEndDate(recommendation.duration);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const stackEntry = {
        user_id: user.id,
        product_id: productId,
        stack_name: recommendation.supplement_name,
        source: 'doctor_rx',
        status: 'active',
        schedule_type: 'scheduled',
        intake_times: intakeTimes,
        ai_rationale: recommendation.rationale || 'Prescribed by doctor',
        target_outcome: recommendation.rationale || 'As prescribed',
        linked_biomarker_ids: [],
        planned_end_date: plannedEndDate,
        start_date: new Date().toISOString(),
      };

      const { error: stackError } = await supabase
        .from('user_stack')
        .insert(stackEntry);

      if (stackError) throw stackError;

      // Step 3: Update recommendation status
      const { error: updateError } = await supabase
        .from('doctor_recommendations')
        .update({
          status: 'added_to_stack',
          added_to_stack_at: new Date().toISOString(),
        })
        .eq('id', recommendation.id);

      if (updateError) throw updateError;

      return recommendation;
    },
    onSuccess: (recommendation) => {
      queryClient.invalidateQueries({ queryKey: ['user-stack'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-recommendations', recommendation.document_id] });
      toast.success(`${recommendation.supplement_name} added to stack`);
    },
    onError: (error) => {
      console.error('Failed to add to stack:', error);
      toast.error('Failed to add to stack');
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      const { error } = await supabase
        .from('doctor_recommendations')
        .update({ status: 'dismissed' })
        .eq('id', recommendationId);

      if (error) throw error;
      return recommendationId;
    },
    onSuccess: (_, recommendationId) => {
      const recommendation = recommendationsQuery.data?.find(r => r.id === recommendationId);
      if (recommendation) {
        queryClient.invalidateQueries({ queryKey: ['doctor-recommendations', recommendation.document_id] });
      }
      toast.success('Recommendation dismissed');
    },
    onError: (error) => {
      console.error('Failed to dismiss:', error);
      toast.error('Failed to dismiss recommendation');
    },
  });

  const addAllToStackMutation = useMutation({
    mutationFn: async (recommendations: DoctorRecommendation[]) => {
      const results = [];
      for (const rec of recommendations) {
        try {
          await addToStackMutation.mutateAsync(rec);
          results.push({ success: true, rec });
        } catch (error) {
          results.push({ success: false, rec, error });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      if (successCount > 0) {
        toast.success(`${successCount} recommendation${successCount > 1 ? 's' : ''} added to stack`);
      }
      const failCount = results.filter(r => !r.success).length;
      if (failCount > 0) {
        toast.error(`${failCount} recommendation${failCount > 1 ? 's' : ''} failed to add`);
      }
    },
  });

  return {
    recommendations: recommendationsQuery.data || [],
    isLoading: recommendationsQuery.isLoading,
    addToStack: addToStackMutation.mutate,
    isAddingToStack: addToStackMutation.isPending,
    dismiss: dismissMutation.mutate,
    isDismissing: dismissMutation.isPending,
    addAllToStack: addAllToStackMutation.mutate,
    isAddingAll: addAllToStackMutation.isPending,
  };
}
