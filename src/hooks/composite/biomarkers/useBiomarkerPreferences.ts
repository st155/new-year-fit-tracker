import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface BiomarkerPreference {
  id: string;
  user_id: string;
  biomarker_id: string;
  optimal_min: number;
  optimal_max: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useBiomarkerPreferences(biomarkerId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation('biomarkers');

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['biomarker-preferences', user?.id, biomarkerId],
    queryFn: async () => {
      if (!user?.id || !biomarkerId) return null;

      const { data, error } = await supabase
        .from('user_biomarker_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('biomarker_id', biomarkerId)
        .maybeSingle();

      if (error) throw error;
      return data as BiomarkerPreference | null;
    },
    enabled: !!user?.id && !!biomarkerId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: {
      optimal_min: number;
      optimal_max: number;
      notes?: string;
    }) => {
      if (!user?.id || !biomarkerId) {
        throw new Error('User or biomarker ID missing');
      }

      const { data, error } = await supabase
        .from('user_biomarker_preferences')
        .upsert({
          user_id: user.id,
          biomarker_id: biomarkerId,
          optimal_min: values.optimal_min,
          optimal_max: values.optimal_max,
          notes: values.notes || null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['biomarker-preferences', user?.id, biomarkerId],
      });
      toast.success(t('toast.optimalRangeSaved'));
    },
    onError: (error) => {
      console.error('Failed to save preferences:', error);
      toast.error(t('toast.optimalRangeSaveFailed'));
    },
  });

  return {
    preferences,
    isLoading,
    upsertPreferences: upsertMutation.mutate,
    isUpserting: upsertMutation.isPending,
  };
}
