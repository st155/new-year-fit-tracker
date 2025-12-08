import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';

interface SparklineDataPoint {
  date: string;
  value: number;
}

/**
 * Fetches extended Withings body composition history from inBodyStartDate to today
 * Used to synchronize Withings data with InBody date range for proper chart display
 */
export function useExtendedBodyCompositionHistory(
  userId: string | undefined,
  inBodyStartDate: string | undefined,
  metricName: string
) {
  return useQuery({
    queryKey: ['extended-body-history', userId, inBodyStartDate, metricName],
    queryFn: async (): Promise<SparklineDataPoint[]> => {
      if (!userId || !inBodyStartDate) return [];

      // Map metric names to unified_metrics names
      const metricNameMap: Record<string, string> = {
        'Body Fat Percentage': 'Body Fat Percentage',
        'Weight': 'Weight',
        'Muscle Mass': 'Muscle Mass',
        'Skeletal Muscle Mass': 'Skeletal Muscle Mass',
      };

      const unifiedMetricName = metricNameMap[metricName] || metricName;

      console.log('📊 [ExtendedHistory] Fetching Withings data from:', inBodyStartDate, 'for metric:', unifiedMetricName);

      const { data, error } = await supabase
        .from('unified_metrics')
        .select('value, measurement_date')
        .eq('user_id', userId)
        .eq('metric_name', unifiedMetricName)
        .ilike('source', '%withings%')
        .gte('measurement_date', inBodyStartDate)
        .order('measurement_date', { ascending: true });

      if (error) {
        console.error('❌ [ExtendedHistory] Error:', error);
        return [];
      }

      console.log('✅ [ExtendedHistory] Got', data?.length, 'Withings records from', inBodyStartDate);

      // Convert to sparkline format
      return (data || []).map(d => ({
        date: d.measurement_date,
        value: d.value
      }));
    },
    enabled: !!userId && !!inBodyStartDate && !!metricName,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Returns the earliest InBody date from sparkline data
 */
export function getInBodyDateRange(inBodySparklineData: SparklineDataPoint[] | undefined) {
  if (!inBodySparklineData?.length) return { startDate: undefined, endDate: undefined };
  
  const sorted = [...inBodySparklineData].sort((a, b) => a.date.localeCompare(b.date));
  return {
    startDate: sorted[0].date,
    endDate: sorted[sorted.length - 1].date,
  };
}
