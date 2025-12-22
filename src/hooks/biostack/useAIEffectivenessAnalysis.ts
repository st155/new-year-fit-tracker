import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BiomarkerComparison {
  biomarker: string;
  biomarkerId: string;
  expectedChangePercent: number;
  actualChangePercent: number | null;
  matchPercent: number | null;
  status: 'on_track' | 'partial' | 'no_effect' | 'opposite' | 'no_data';
  beforeValue: number | null;
  afterValue: number | null;
  unit: string;
}

export interface AIAnalysisResult {
  verdict: 'effective' | 'needs_more_time' | 'not_working' | 'no_data';
  overallScore: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  comparisons: BiomarkerComparison[];
  aiAnalysis: {
    summary: string;
    keyFindings: string[];
    recommendations: string[];
    nextSteps: string;
  };
  weeksOnSupplement: number;
  expectedTimeframeWeeks: number;
}

export function useAIEffectivenessAnalysis() {
  const [data, setData] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const analyze = async (stackItemId: string, userId: string) => {
    setIsAnalyzing(true);
    setError(null);
    setData(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke(
        'analyze-supplement-effectiveness',
        {
          body: { stackItemId, userId }
        }
      );

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (result.error) {
        throw new Error(result.error);
      }

      setData(result as AIAnalysisResult);
      return result as AIAnalysisResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка анализа';
      setError(message);
      toast({
        title: 'Ошибка анализа',
        description: message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
  };

  return {
    analyze,
    data,
    isAnalyzing,
    error,
    reset
  };
}
