import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LinkedBiomarker {
  id: string;
  display_name: string;
  latest_value: number | null;
  latest_unit: string | null;
  trend: 'up' | 'down' | 'stable' | null;
}

export function useLinkedBiomarkers(linkedBiomarkerIds?: string[]) {
  return useQuery({
    queryKey: ['linked-biomarkers', linkedBiomarkerIds],
    queryFn: async () => {
      if (!linkedBiomarkerIds || linkedBiomarkerIds.length === 0) {
        return [];
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Fetch biomarker info
      const { data: biomarkers, error: biomarkersError } = await supabase
        .from('biomarker_master')
        .select('id, display_name, standard_unit')
        .in('id', linkedBiomarkerIds);

      if (biomarkersError) throw biomarkersError;
      if (!biomarkers) return [];

      // Fetch latest 2 results for each biomarker to calculate trend
      const results = await Promise.all(
        biomarkers.map(async (biomarker) => {
          const { data: labResults } = await supabase
            .from('lab_test_results')
            .select('normalized_value, normalized_unit, test_date')
            .eq('user_id', user.id)
            .eq('biomarker_id', biomarker.id)
            .order('test_date', { ascending: false })
            .limit(2);

          const latest = labResults?.[0];
          const previous = labResults?.[1];

          let trend: 'up' | 'down' | 'stable' | null = null;
          if (latest && previous) {
            const diff = latest.normalized_value - previous.normalized_value;
            const percentChange = Math.abs(diff / previous.normalized_value) * 100;
            
            if (percentChange > 5) {
              trend = diff > 0 ? 'up' : 'down';
            } else {
              trend = 'stable';
            }
          }

          return {
            id: biomarker.id,
            display_name: biomarker.display_name,
            latest_value: latest?.normalized_value || null,
            latest_unit: latest?.normalized_unit || biomarker.standard_unit,
            trend,
          } as LinkedBiomarker;
        })
      );

      return results;
    },
    enabled: !!linkedBiomarkerIds && linkedBiomarkerIds.length > 0,
  });
}
