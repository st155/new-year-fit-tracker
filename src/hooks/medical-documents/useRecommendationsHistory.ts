import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RecommendationHistory {
  id: string;
  user_id: string;
  recommendations_text: string;
  context_snapshot: {
    documents_analyzed?: number;
    biomarkers_count?: number;
    date_range?: { from: string; to: string };
  };
  health_score: number | null;
  generated_at: string;
}

export function useRecommendationsHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: history, isLoading, error } = useQuery({
    queryKey: ['recommendations-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recommendations_history')
        .select('*')
        .order('generated_at', { ascending: false });

      if (error) throw error;
      return data as RecommendationHistory[];
    },
  });

  const generateRecommendation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-health-recommendations', {
        body: {}
      });

      if (error) throw error;

      // Save to history
      const { error: insertError } = await supabase
        .from('recommendations_history')
        .insert({
          recommendations_text: data.recommendations,
          context_snapshot: data.context || {},
          health_score: data.health_score || null,
        } as any);

      if (insertError) throw insertError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations-history'] });
      toast({
        title: 'Рекомендации готовы',
        description: 'AI проанализировал все ваши данные'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка генерации',
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
  };
}
