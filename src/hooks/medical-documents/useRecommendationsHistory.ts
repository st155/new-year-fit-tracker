import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { healthApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface RecommendationHistory {
  id: string;
  user_id: string;
  recommendations_text: string;
  context_snapshot: {
    documents_analyzed?: number;
    biomarkers_count?: number;
    abnormal_biomarkers?: number;
    fitness_metrics_count?: number;
    medical_findings_count?: number;
    active_supplements_count?: number;
    supplement_adherence?: number;
    date_range?: { from: string; to: string };
  };
  health_score: number | null;
  generated_at: string;
}

export function useRecommendationsHistory() {
  const { toast } = useToast();
  const { t } = useTranslation('recommendations');
  const queryClient = useQueryClient();

  const { data: history, isLoading, error } = useQuery({
    queryKey: ['recommendations-history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('recommendations_history')
        .select('*')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      return data as RecommendationHistory[];
    },
  });

  const recalculateUnits = useMutation({
    mutationFn: async () => {
      const { data, error } = await healthApi.fixUnitConversions();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: t('toast.unitsRecalculated'),
        description: t('toast.unitsRecalculatedDesc', { count: data?.updated || 0 })
      });
    },
    onError: (error: any) => {
      toast({
        title: t('toast.recalculationError'),
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const generateRecommendation = useMutation({
    mutationFn: async () => {
      const { data, error } = await healthApi.generateRecommendations();
      if (error) throw error;
      // Edge Function already saves to recommendations_history
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations-history'] });
      toast({
        title: t('toast.recommendationsReady'),
        description: t('toast.recommendationsReadyDesc')
      });
    },
    onError: (error: any) => {
      toast({
        title: t('toast.generationError'),
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  return {
    history,
    isLoading,
    error,
    generateRecommendation,
    recalculateUnits,
  };
}
