import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

interface MetricData {
  value: number;
  unit: string;
  source: string;
  date: string;
  trend?: number;
  trendPercent?: number;
  sparklineData?: { date: string; value: number }[];
}

interface UnifiedBodyMetrics {
  weight?: MetricData;
  bodyFat?: MetricData;
  muscleMass?: MetricData;
}

interface RawMetric {
  metric_name: string;
  value: number;
  measurement_date: string;
  unit: string;
  source: string;
}

// Source priority: Withings > WHOOP > Oura > Google > others
const SOURCE_PRIORITY: Record<string, number> = {
  withings: 1,
  whoop: 2,
  oura: 3,
  google: 4,
  terra: 5,
};

function getSourcePriority(source: string): number {
  return SOURCE_PRIORITY[source.toLowerCase()] ?? 99;
}

function calculateTrendAndSparkline(
  records: RawMetric[]
): { trend: number; trendPercent: number; sparklineData: { date: string; value: number }[] } {
  if (records.length < 2) {
    return { trend: 0, trendPercent: 0, sparklineData: records.map(r => ({ date: r.measurement_date, value: r.value })) };
  }

  // Get unique dates, take last 7 days
  const byDate = new Map<string, RawMetric>();
  for (const r of records) {
    const dateKey = r.measurement_date.split('T')[0];
    if (!byDate.has(dateKey) || getSourcePriority(r.source) < getSourcePriority(byDate.get(dateKey)!.source)) {
      byDate.set(dateKey, r);
    }
  }

  const sortedDates = Array.from(byDate.keys()).sort().reverse().slice(0, 7);
  const sparklineData = sortedDates.reverse().map(date => ({
    date,
    value: byDate.get(date)!.value,
  }));

  const latestValue = sparklineData[sparklineData.length - 1]?.value ?? 0;
  const oldestValue = sparklineData[0]?.value ?? latestValue;
  const trend = latestValue - oldestValue;
  const trendPercent = oldestValue !== 0 ? (trend / oldestValue) * 100 : 0;

  return { trend, trendPercent, sparklineData };
}

export function useBodyMetricsFromUnified(userId?: string): UnifiedBodyMetrics | null {
  const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');

  const { data } = useQuery({
    queryKey: ['unified-body-metrics', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('unified_metrics')
        .select('metric_name, value, measurement_date, unit, source')
        .eq('user_id', userId)
        .in('metric_name', ['Weight', 'Body Fat Percentage', 'Muscle Mass'])
        .gte('measurement_date', sixtyDaysAgo)
        .order('measurement_date', { ascending: false })
        .limit(200);

      if (error) {
        console.error('Error fetching unified body metrics:', error);
        return null;
      }

      return data as RawMetric[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  if (!data || data.length === 0) return null;

  const metrics: UnifiedBodyMetrics = {};

  // Group by metric name
  const weightRecords = data.filter(r => r.metric_name === 'Weight');
  const bodyFatRecords = data.filter(r => r.metric_name === 'Body Fat Percentage');
  const muscleMassRecords = data.filter(r => r.metric_name === 'Muscle Mass');

  // Process Weight
  if (weightRecords.length > 0) {
    // Find best source for latest reading
    const latestDate = weightRecords[0].measurement_date.split('T')[0];
    const latestDayRecords = weightRecords.filter(r => r.measurement_date.startsWith(latestDate));
    const bestRecord = latestDayRecords.sort((a, b) => getSourcePriority(a.source) - getSourcePriority(b.source))[0];
    
    const { trend, trendPercent, sparklineData } = calculateTrendAndSparkline(weightRecords);

    metrics.weight = {
      value: bestRecord.value,
      unit: bestRecord.unit || 'kg',
      source: bestRecord.source,
      date: bestRecord.measurement_date,
      trend,
      trendPercent,
      sparklineData,
    };
  }

  // Process Body Fat Percentage
  if (bodyFatRecords.length > 0) {
    const latestDate = bodyFatRecords[0].measurement_date.split('T')[0];
    const latestDayRecords = bodyFatRecords.filter(r => r.measurement_date.startsWith(latestDate));
    const bestRecord = latestDayRecords.sort((a, b) => getSourcePriority(a.source) - getSourcePriority(b.source))[0];
    
    const { trend, trendPercent, sparklineData } = calculateTrendAndSparkline(bodyFatRecords);

    metrics.bodyFat = {
      value: bestRecord.value,
      unit: '%',
      source: bestRecord.source,
      date: bestRecord.measurement_date,
      trend,
      trendPercent,
      sparklineData,
    };
  }

  // Process Muscle Mass
  if (muscleMassRecords.length > 0) {
    const latestDate = muscleMassRecords[0].measurement_date.split('T')[0];
    const latestDayRecords = muscleMassRecords.filter(r => r.measurement_date.startsWith(latestDate));
    const bestRecord = latestDayRecords.sort((a, b) => getSourcePriority(a.source) - getSourcePriority(b.source))[0];
    
    const { trend, trendPercent, sparklineData } = calculateTrendAndSparkline(muscleMassRecords);

    metrics.muscleMass = {
      value: bestRecord.value,
      unit: 'kg',
      source: bestRecord.source,
      date: bestRecord.measurement_date,
      trend,
      trendPercent,
      sparklineData,
    };
  }

  return metrics;
}
