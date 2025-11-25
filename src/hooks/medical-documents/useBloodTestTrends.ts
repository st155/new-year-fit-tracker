import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BloodTestDataPoint {
  date: string;
  [biomarker: string]: number | string;
}

export function useBloodTestTrends(selectedBiomarkers: string[]) {
  return useQuery({
    queryKey: ['blood-test-trends', selectedBiomarkers],
    queryFn: async (): Promise<{ chartData: BloodTestDataPoint[]; biomarkers: any[] }> => {
      if (selectedBiomarkers.length === 0) return { chartData: [], biomarkers: [] };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch biomarker master data
      const { data: biomarkers, error: bioError } = await supabase
        .from('biomarker_master')
        .select('id, canonical_name, display_name, standard_unit, reference_ranges')
        .in('canonical_name', selectedBiomarkers);

      if (bioError) throw bioError;

      // Fetch lab results
      const biomarkerIds = biomarkers?.map(b => b.id) || [];
      const { data: results, error: resError } = await supabase
        .from('lab_test_results')
        .select('biomarker_id, normalized_value, test_date')
        .eq('user_id', user.id)
        .in('biomarker_id', biomarkerIds)
        .order('test_date', { ascending: true });

      if (resError) throw resError;

      // Transform to chart data
      const dateMap = new Map<string, any>();
      results?.forEach(r => {
        const biomarker = biomarkers?.find(b => b.id === r.biomarker_id);
        if (!biomarker || !r.normalized_value) return;

        const date = new Date(r.test_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        if (!dateMap.has(date)) {
          dateMap.set(date, { date });
        }
        dateMap.get(date)[biomarker.canonical_name] = r.normalized_value;
      });

      const chartData: BloodTestDataPoint[] = Array.from(dateMap.values());

      return {
        chartData,
        biomarkers: biomarkers || [],
      };
    },
    enabled: selectedBiomarkers.length > 0,
  });
}
