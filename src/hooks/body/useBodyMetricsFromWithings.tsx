import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MetricData } from '../useAggregatedBodyMetrics';

interface WithingsMetrics {
  weight?: MetricData;
  bodyFat?: MetricData;
}

function calculateTrend(data: { value: number }[]) {
  if (data.length < 2) return { trend: 0, trendPercent: 0 };
  const current = data[0].value;
  const previous = data[1].value;
  const trend = current - previous;
  const trendPercent = previous ? (trend / previous) * 100 : 0;
  return { trend, trendPercent };
}

function getBodyFatZone(percent: number): string {
  if (percent <= 13) return 'athlete';
  if (percent <= 17) return 'optimal';
  if (percent <= 24) return 'average';
  return 'high';
}

export function useBodyMetricsFromWithings(userId?: string): WithingsMetrics | null {
  const { data: withingsData } = useQuery({
    queryKey: ['withings-metrics', userId],
    queryFn: async () => {
      if (!userId) return { weight: [], bodyFat: [] };

      // Fetch from unified_metrics (fresh Terra data)
      const { data: unifiedData, error } = await supabase
        .from('unified_metrics')
        .select('metric_name, value, measurement_date, unit')
        .eq('user_id', userId)
        .ilike('source', 'withings') // Case-insensitive match for WITHINGS/withings
        .in('metric_name', ['Weight', 'Body Fat Percentage'])
        .order('measurement_date', { ascending: false })
        .limit(60); // Get more to ensure we have enough for both metrics

      if (error) throw error;

      // Group by metric
      const weightData = (unifiedData || [])
        .filter(m => m.metric_name === 'Weight')
        .slice(0, 30);
      const bodyFatData = (unifiedData || [])
        .filter(m => m.metric_name === 'Body Fat Percentage')
        .slice(0, 30);

      return {
        weight: weightData,
        bodyFat: bodyFatData,
      };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  return useMemo(() => {
    if (!withingsData?.weight?.length && !withingsData?.bodyFat?.length) return null;

    const metrics: WithingsMetrics = {};

    // Weight
    if (withingsData?.weight?.[0]) {
      const trendData = calculateTrend(withingsData.weight);
      metrics.weight = {
        value: withingsData.weight[0].value,
        unit: withingsData.weight[0].unit || 'kg',
        source: 'withings',
        date: withingsData.weight[0].measurement_date,
        ...trendData,
        sparklineData: withingsData.weight
          .slice(0, 7)
          .reverse()
          .map(d => ({ 
            date: d.measurement_date, 
            value: d.value 
          })),
      };
    }

    // Body Fat
    if (withingsData?.bodyFat?.[0]) {
      const sortedHistory = [...withingsData.bodyFat].slice(0, 7).sort((a, b) => 
        new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
      );
      const trendData = calculateTrend([...withingsData.bodyFat]);
      
      metrics.bodyFat = {
        value: withingsData.bodyFat[0].value,
        unit: withingsData.bodyFat[0].unit || '%',
        source: 'withings',
        date: withingsData.bodyFat[0].measurement_date,
        ...trendData,
        sparklineData: sortedHistory.map(d => ({ 
          date: d.measurement_date, 
          value: d.value 
        })),
        zone: getBodyFatZone(withingsData.bodyFat[0].value),
        sources: {
          withings: {
            value: withingsData.bodyFat[0].value,
            date: withingsData.bodyFat[0].measurement_date,
            sparklineData: sortedHistory.map(d => ({ 
              date: d.measurement_date, 
              value: d.value 
            })),
          }
        }
      };
    }

    return metrics;
  }, [withingsData]);
}
