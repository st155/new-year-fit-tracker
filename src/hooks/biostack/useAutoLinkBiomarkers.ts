import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { supplementsApi } from '@/lib/api';

export interface SupplementCorrelation {
  biomarkerName: string;
  biomarkerId: string;
  correlationType: 'increases' | 'decreases' | 'stabilizes';
  expectedChangePercent: number;
  evidenceLevel: 'high' | 'moderate' | 'low';
  researchSummary: string;
}

export interface AutoLinkResult {
  success: boolean;
  scientificName?: string;
  confidence?: number;
  biomarkerIds?: string[];
  correlations?: SupplementCorrelation[];
  message?: string;
}

interface AutoLinkParams {
  stackItemId?: string;
  supplementName: string;
  userId?: string;
}

export function useAutoLinkBiomarkers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stackItemId, supplementName, userId }: AutoLinkParams): Promise<AutoLinkResult> => {
      // Note: userId is passed but the API only uses stackItemId and supplementName
      const { data, error } = await supplementsApi.autoLinkBiomarkers(stackItemId || '', supplementName);

      if (error) throw error;
      return data as AutoLinkResult;
    },
    onSuccess: (data, variables) => {
      if (data.success && data.correlations && data.correlations.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['active-stack-with-biomarkers'] });
        queryClient.invalidateQueries({ queryKey: ['user-stack'] });
        
        toast.success('Биомаркеры привязаны', {
          description: `Найдено ${data.correlations.length} научных корреляций для ${variables.supplementName}`,
        });
      } else if (!data.success) {
        toast.info('Научные данные не найдены', {
          description: `Для "${variables.supplementName}" пока нет данных в базе`,
        });
      }
    },
    onError: (error: Error) => {
      console.error('[useAutoLinkBiomarkers] Error:', error);
      toast.error('Ошибка привязки биомаркеров', {
        description: error.message,
      });
    },
  });
}

// Hook to get correlations for a supplement without updating
export function useGetSupplementCorrelations() {
  return useMutation({
    mutationFn: async (supplementName: string): Promise<AutoLinkResult> => {
      const { data, error } = await supplementsApi.autoLinkBiomarkers('', supplementName);

      if (error) throw error;
      return data as AutoLinkResult;
    },
  });
}
