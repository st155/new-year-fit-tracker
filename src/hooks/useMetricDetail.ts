import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, subDays, format } from 'date-fns';

export interface MetricRecord {
  id: string;
  value: number;
  unit: string;
  source: string;
  measurement_date: string;
  confidence_score?: number;
  priority?: number;
}

export interface MetricStats {
  average: number;
  min: number;
  max: number;
  trend: number; // percentage change
  count: number;
}

export interface MetricDetailData {
  records: MetricRecord[];
  stats: MetricStats;
  currentValue: number;
  sources: string[];
}

function calculateStats(records: MetricRecord[]): MetricStats {
  if (records.length === 0) {
    return { average: 0, min: 0, max: 0, trend: 0, count: 0 };
  }

  const values = records.map(r => r.value);
  const average = values.reduce((sum, v) => sum + v, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Calculate trend: compare recent 7 days vs previous 7 days
  const recent7 = records.slice(0, Math.min(7, records.length));
  const previous7 = records.slice(7, Math.min(14, records.length));

  let trend = 0;
  if (recent7.length > 0 && previous7.length > 0) {
    const recentAvg = recent7.reduce((sum, r) => sum + r.value, 0) / recent7.length;
    const previousAvg = previous7.reduce((sum, r) => sum + r.value, 0) / previous7.length;
    trend = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
  }

  return { average, min, max, trend, count: records.length };
}

export function useMetricDetail(metricName: string | undefined, userId: string | undefined) {
  return useQuery<MetricDetailData>({
    queryKey: ['metric-detail', userId, metricName],
    queryFn: async () => {
      if (!userId || !metricName) {
        throw new Error('Missing userId or metricName');
      }

      // Fetch last 90 days of data
      const startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('unified_metrics')
        .select('*')
        .eq('user_id', userId)
        .eq('metric_name', metricName)
        .gte('measurement_date', startDate)
        .order('measurement_date', { ascending: false });

      if (error) throw error;

      const records: MetricRecord[] = (data || []).map(item => ({
        id: item.id,
        value: item.value,
        unit: item.unit || '',
        source: item.source || 'unknown',
        measurement_date: item.measurement_date,
        confidence_score: item.confidence_score,
        priority: item.priority,
      }));

      const stats = calculateStats(records);
      const currentValue = records[0]?.value || 0;
      const sources = [...new Set(records.map(r => r.source))];

      return {
        records,
        stats,
        currentValue,
        sources,
      };
    },
    enabled: !!userId && !!metricName,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
