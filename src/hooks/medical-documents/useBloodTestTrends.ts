import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getIntlLocale } from '@/lib/date-locale';

interface BloodTestDataPoint {
  date: string;
  [biomarker: string]: number | string;
}

export function useBloodTestTrends(canonicalNames: string[], displayNames: string[]) {
  return useQuery({
    queryKey: ['blood-test-trends', canonicalNames],
    queryFn: async (): Promise<{ chartData: BloodTestDataPoint[]; biomarkers: any[] }> => {
      if (canonicalNames.length === 0) return { chartData: [], biomarkers: [] };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('[TRENDS] Querying biomarkers:', canonicalNames);

      // Fetch biomarker master data using canonical names with standard_unit
      const { data: biomarkers, error: bioError } = await supabase
        .from('biomarker_master')
        .select('id, canonical_name, display_name, standard_unit, reference_ranges')
        .in('canonical_name', canonicalNames);

      if (bioError) throw bioError;
      console.log('[TRENDS] Found biomarkers:', biomarkers?.length);

      // Fetch lab results with normalized values
      const biomarkerIds = biomarkers?.map(b => b.id) || [];
      const { data: results, error: resError } = await supabase
        .from('lab_test_results')
        .select('biomarker_id, normalized_value, test_date')
        .eq('user_id', user.id)
        .in('biomarker_id', biomarkerIds)
        .not('normalized_value', 'is', null) // Only get quantitative results
        .order('test_date', { ascending: true });

      if (resError) throw resError;
      console.log('[TRENDS] Found results:', results?.length);

      // Create mapping from canonical to display names
      const canonicalToDisplay = Object.fromEntries(
        canonicalNames.map((canonical, idx) => [canonical, displayNames[idx]])
      );

      // Transform to chart data using display names as keys and normalized values
      const dateMap = new Map<string, any>();
      results?.forEach(r => {
        const biomarker = biomarkers?.find(b => b.id === r.biomarker_id);
        if (!biomarker || !r.normalized_value) return;

        const date = new Date(r.test_date).toLocaleDateString(getIntlLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
        if (!dateMap.has(date)) {
          dateMap.set(date, { date });
        }
        // Use display name for chart data keys and normalized_value
        const displayName = canonicalToDisplay[biomarker.canonical_name] || biomarker.display_name;
        dateMap.get(date)[displayName] = r.normalized_value;
      });

      const chartData: BloodTestDataPoint[] = Array.from(dateMap.values());
      console.log('[TRENDS] Chart data points:', chartData.length);

      return {
        chartData,
        biomarkers: biomarkers || [],
      };
    },
    enabled: canonicalNames.length > 0,
  });
}
