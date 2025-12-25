import { useQuery } from '@tanstack/react-query';
import { supplementsApi } from '@/lib/api';

interface CorrelationData {
  success: boolean;
  error?: string;
  biomarker?: {
    id: string;
    name: string;
    unit: string;
    startValue: number;
    endValue: number;
    changePercent: number;
    referenceRange: any;
  };
  intakeData?: Array<{
    week: string;
    avgConsistency: number;
    intakeCount: number;
  }>;
  biomarkerData?: Array<{
    date: string;
    value: number;
  }>;
  correlation?: {
    score: number;
    interpretation: string;
    pValue: number;
  };
  aiInsights?: {
    is_effective: boolean;
    confidence_level: 'high' | 'medium' | 'low';
    key_insight: string;
    recommendation: string;
  };
  timeToEffect?: {
    weeks: number;
    description: string;
  } | null;
  avgConsistency?: number;
}

export function useSupplementCorrelation(
  stackItemId?: string, 
  timeframeMonths: number = 6
) {
  const { data: correlation, isLoading, error } = useQuery<CorrelationData>({
    queryKey: ['supplement-correlation', stackItemId, timeframeMonths],
    queryFn: async () => {
      if (!stackItemId) return { success: false, error: 'No stack item selected' };
      
      const { data, error } = await supplementsApi.calculateCorrelation(stackItemId, timeframeMonths);
      if (error) throw error;
      return data as CorrelationData;
    },
    enabled: !!stackItemId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  return {
    correlation,
    isLoading,
    error,
  };
}
