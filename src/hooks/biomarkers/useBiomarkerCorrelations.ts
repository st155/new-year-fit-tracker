import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BiomarkerCorrelation {
  id: string;
  supplement_name: string;
  correlation_type: 'increases' | 'decreases' | 'stabilizes';
  expected_change_percent: number;
  timeframe_weeks: number;
  evidence_level: 'high' | 'moderate' | 'low';
  research_summary: string;
}

export function useBiomarkerCorrelations(biomarkerId?: string) {
  return useQuery({
    queryKey: ['biomarker-correlations', biomarkerId],
    queryFn: async () => {
      if (!biomarkerId) return [];
      
      const { data, error } = await supabase
        .from('biomarker_correlations')
        .select('*')
        .eq('biomarker_id', biomarkerId)
        .order('evidence_level', { ascending: false });
      
      if (error) throw error;
      return data as BiomarkerCorrelation[];
    },
    enabled: !!biomarkerId,
  });
}
